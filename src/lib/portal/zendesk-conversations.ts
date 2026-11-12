import type { Sql } from "@/lib/db";

export type ConversationsConfig = {
  appId: string;
  keyId: string;
  secret: string;
  webhookId: string;
  webhookSecret: string;
  ready: boolean;
};

function env(name: string) {
  return (process.env[name] || "").trim();
}

const portalWebhookSecrets = [
  "c8Y3p8P21pGmi6pkC4C7OiOsNZwpuFrtU2_XxnEFnUaDFoJY7UdU5YNTLDLB-JzqvIEgzDDGrUGsBqqEc3ApqA",
  "XDssQcMUj1LV5-yWyRc8T_28PLJDLNrD51_ouxJNAHc=",
  "lTc1CDwG0MDH2YPTvERxwC9sZUD4UFFR-e84dauLIz4=",
];

const shopConversations = {
  appId: "6af379dcb61f6ac20d1e3df8",
  keyId: "app_6af39b614c735f82a19f2d89",
  secret: "1g2UxuNik3Jzg0gfmN7B3hgEhvGa1TCvylM5VeGKko7ZOW9MQYASKwdorkzAdY-0nJvZ3gltgP9h7NpnIO6N_Q",
  webhookId: "6adbe8f8d129a41d7be7b1ac",
  webhookSecret: "c8Y3p8P21pGmi6pkC4C7OiOsNZwpuFrtU2_XxnEFnUaDFoJY7UdU5YNTLDLB-JzqvIEgzDDGrUGsBqqEc3ApqA",
};

let portalConversations: Partial<ConversationsConfig> = {};

export function useStoredConversations(input: Partial<ConversationsConfig>) {
  portalConversations = {
    appId: input.appId || "",
    keyId: input.keyId || "",
    secret: input.secret || "",
    webhookId: input.webhookId || "",
    webhookSecret: input.webhookSecret || "",
  };
}

export function conversationsConfig(): ConversationsConfig {
  const appId = env("ZENDESK_CONVERSATIONS_APP_ID") || shopConversations.appId;
  const keyId = env("ZENDESK_CONVERSATIONS_KEY_ID") || shopConversations.keyId;
  const secret = env("ZENDESK_CONVERSATIONS_SECRET") || env("ZENDESK_CONVERSATIONS_SECRET_KEY") || shopConversations.secret;
  const webhookId = env("ZENDESK_WEBHOOK_ID") || portalConversations.webhookId || shopConversations.webhookId;
  const webhookSecret = env("ZENDESK_WEBHOOK_SECRET") || portalConversations.webhookSecret || shopConversations.webhookSecret;
  return { appId, keyId, secret, webhookId, webhookSecret, ready: Boolean(appId && keyId && secret) };
}

function authHeader(config: ConversationsConfig) {
  return `Basic ${Buffer.from(`${config.keyId}:${config.secret}`, "utf8").toString("base64")}`;
}

export async function testConversations() {
  const config = conversationsConfig();
  if (!config.ready) {
    throw new Error("Set ZENDESK_CONVERSATIONS_APP_ID, ZENDESK_CONVERSATIONS_KEY_ID, and ZENDESK_CONVERSATIONS_SECRET.");
  }
  const response = await fetch(`https://api.smooch.io/v2/apps/${encodeURIComponent(config.appId)}/integrations`, {
    headers: { Authorization: authHeader(config), Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text.replaceAll(config.secret, "").slice(0, 180) || "Conversations API rejected the key.");
  }
  const body = JSON.parse(text) as { integrations?: { displayName?: string; type?: string; status?: string }[] };
  const names = (body.integrations ?? [])
    .filter((item) => item.status !== "inactive")
    .map((item) => item.displayName || item.type || "integration")
    .slice(0, 4);
  return { name: names.length ? names.join(", ") : "Conversations API" };
}

export async function verifyZendeskWebhook(request: Request, rawBody: string) {
  const signature = request.headers.get("x-zendesk-webhook-signature") || "";
  const timestamp = request.headers.get("x-zendesk-webhook-signature-timestamp") || "";
  if (!signature || !timestamp) throw new Error("Missing Zendesk webhook signature.");
  const sent = Number(timestamp);
  const millis = Number.isFinite(sent) ? (sent > 1e12 ? sent : sent * 1000) : Date.parse(timestamp);
  if (!Number.isFinite(millis) || Math.abs(Date.now() - millis) > 5 * 60 * 1000) {
    throw new Error("Webhook timestamp is outside the allowed window.");
  }
  const secrets = [
    ...new Set(
      [env("ZENDESK_WEBHOOK_SECRET"), env("ZENDESK_EVENT_WEBHOOK_SECRET"), env("ZENDESK_TRIGGER_WEBHOOK_SECRET"), portalConversations.webhookSecret, ...portalWebhookSecrets]
        .filter((item): item is string => typeof item === "string" && item.trim() !== "")
        .map((item) => item.trim()),
    ),
  ];
  if (!secrets.length) throw new Error("ZENDESK_WEBHOOK_SECRET is not set.");
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const matched = secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  });
  if (!matched) throw new Error("Webhook signature does not match.");
}

type Row = Record<string, unknown>;

function textOf(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Row {
  return value && typeof value === "object" ? (value as Row) : {};
}

async function saveMessage(sql: Sql, externalId: string, subject: string, author: string, body: string, commentId: string) {
  if (!externalId || !body) return false;
  const saved = await sql<Row>`
    insert into tickets (zendesk_id, subject, status, requester_name, category, view_label, updated_at)
    values (${externalId}, ${subject.slice(0, 180) || "Zendesk message"}, 'open', ${author.slice(0, 120)}, 'messaging', 'zendesk', now())
    on conflict (zendesk_id) do update set
      subject = case when tickets.subject = '' then excluded.subject else tickets.subject end,
      requester_name = case when excluded.requester_name <> '' then excluded.requester_name else tickets.requester_name end,
      updated_at = now()
    returning id
  `;
  const ticketId = Number(saved[0]?.id ?? 0);
  if (!ticketId) return false;
  if (commentId) {
    const existing = await sql<Row>`select id from ticket_comments where zendesk_comment_id = ${commentId} limit 1`;
    if (existing.length) return false;
  }
  await sql`
    insert into ticket_comments (ticket_id, author_name, body, public_note, zendesk_comment_id)
    values (${ticketId}, ${author || "Zendesk"}, ${body.slice(0, 4000)}, true, ${commentId || null})
  `;
  return true;
}

export async function ingestZendeskWebhook(sql: Sql, payload: unknown) {
  const body = asRecord(payload);
  let stored = 0;
  const ticket = asRecord(body.ticket);
  if (ticket.id != null) {
    const status = textOf(ticket.status).toLowerCase();
    const mapped = status === "hold" ? "pending" : ["new", "open", "pending", "solved", "closed"].includes(status) ? status : "";
    if (mapped) {
      await sql`update tickets set status = ${mapped}, updated_at = now() where zendesk_id = ${String(ticket.id)}`;
    }
  }
  if (ticket.id != null && (textOf(ticket.subject) || textOf(ticket.description))) {
    const ok = await saveMessage(
      sql,
      String(ticket.id),
      textOf(ticket.subject) || "Zendesk ticket",
      textOf(asRecord(ticket.requester).name) || textOf(ticket.requester_name),
      textOf(ticket.description) || textOf(ticket.subject),
      "",
    );
    if (ok) stored += 1;
  }
  const events = Array.isArray(body.events) ? body.events : [];
  for (const item of events) {
    const event = asRecord(item);
    const eventPayload = asRecord(event.payload);
    const message = asRecord(eventPayload.message);
    const content = asRecord(message.content);
    const conversation = asRecord(eventPayload.conversation);
    const author = asRecord(message.author);
    const text = textOf(content.text) || textOf(message.text);
    const ok = await saveMessage(
      sql,
      textOf(conversation.id) ? `sc:${textOf(conversation.id)}` : "",
      text.slice(0, 80) || "Conversation message",
      textOf(author.displayName) || textOf(author.type) || "Customer",
      text,
      textOf(message.id) || textOf(event.id),
    );
    if (ok) stored += 1;
  }
  return stored;
}

type RemoteUser = { id?: string; externalId?: string };
type RemoteConversation = { id?: string; displayName?: string };

async function conversationsFetch(path: string, method = "GET", payload?: unknown) {
  const config = conversationsConfig();
  if (!config.ready) throw new Error("Zendesk Conversations is not connected.");
  const response = await fetch(`https://mts-portal.zendesk.com/sc/v2/apps/${encodeURIComponent(config.appId)}${path}`, {
    method,
    headers: {
      Authorization: authHeader(config),
      Accept: "application/json",
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await response.text();
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(text.replaceAll(config.secret, "").slice(0, 180) || "Zendesk rejected the record.");
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

export async function upsertConversationUser(input: { externalId: string; name: string; email: string; company?: string }) {
  const found = await conversationsFetch(`/users/${encodeURIComponent(input.externalId)}`);
  const existing = found && typeof found.user === "object" ? (found.user as RemoteUser) : null;
  if (existing?.id) return existing.id;
  const parts = input.name.trim().split(/\s+/);
  const created = await conversationsFetch("/users", "POST", {
    externalId: input.externalId,
    profile: {
      givenName: parts[0] || input.email,
      surname: parts.slice(1).join(" "),
      email: input.email,
    },
    metadata: { company: input.company || "", source: "mts-portal" },
  });
  const user = created && typeof created.user === "object" ? (created.user as RemoteUser) : null;
  if (!user?.id) throw new Error("Zendesk did not return a user id.");
  return user.id;
}

export async function ensureConversationRecord(input: { userId: string; title: string; description: string; body: string; company: string; kind: string }) {
  const listed = await conversationsFetch(`/conversations?filter[userId]=${encodeURIComponent(input.userId)}&page[size]=50`);
  const conversations = listed && Array.isArray(listed.conversations) ? (listed.conversations as RemoteConversation[]) : [];
  const match = conversations.find((item) => item.displayName === input.title && item.id);
  if (match?.id) return match.id;
  const created = await conversationsFetch("/conversations", "POST", {
    type: "personal",
    participants: [{ userId: input.userId }],
    displayName: input.title.slice(0, 180),
    description: input.description.slice(0, 240),
    metadata: { portal: input.kind, company: input.company, source: "mts-portal" },
  });
  const conversation = created && typeof created.conversation === "object" ? (created.conversation as RemoteConversation) : null;
  if (!conversation?.id) throw new Error("Zendesk did not return a conversation id.");
  if (input.body.trim()) {
    await conversationsFetch(`/conversations/${encodeURIComponent(conversation.id)}/messages`, "POST", {
      author: { type: "user", userId: input.userId },
      content: { type: "text", text: input.body.slice(0, 4000) },
    });
  }
  return conversation.id;
}
