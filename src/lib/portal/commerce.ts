import type { Sql } from "@/lib/db";
import { renderSignature } from "./email-signature";

let fileEnv: Record<string, string> | null = null;

async function envValue(name: string) {
  const live = (process.env[name] || "").trim();
  if (live) return live;
  if (!fileEnv) {
    fileEnv = {};
    try {
      const { readFileSync } = await import("node:fs");
      const text = readFileSync(new URL("../../../.env", import.meta.url), "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 1) continue;
        fileEnv[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      fileEnv = {};
    }
  }
  return (fileEnv[name] || "").trim();
}

type Row = Record<string, unknown>;

function n(row: Row, key: string) {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
}

function s(row: Row, key: string) {
  const value = row[key];
  return value == null ? "" : String(value);
}

export type StockLine = { productId: number; quantity: number };

async function linesFor(sql: Sql, orderId: number): Promise<StockLine[]> {
  const rows = await sql<Row>`select product_id, quantity from order_items where order_id = ${orderId}`;
  return rows
    .map((row) => ({ productId: n(row, "product_id"), quantity: n(row, "quantity") }))
    .filter((line) => line.productId > 0 && line.quantity > 0);
}

async function bump(sql: Sql, line: StockLine, mode: "reserve" | "release" | "commit" | "restock") {
  if (mode === "reserve") {
    const updated = await sql<Row>`
      update products
      set reserved = reserved + ${line.quantity}
      where id = ${line.productId} and available = true and (stock - reserved) >= ${line.quantity}
      returning name
    `;
    if (!updated[0]) {
      const product = await sql<Row>`select name, stock, reserved from products where id = ${line.productId}`;
      const name = product[0] ? s(product[0], "name") : "A product";
      const left = product[0] ? Math.max(0, n(product[0], "stock") - n(product[0], "reserved")) : 0;
      throw new Error(`${name} only has ${left} available.`);
    }
    return;
  }
  if (mode === "release") {
    await sql`update products set reserved = greatest(0, reserved - ${line.quantity}) where id = ${line.productId}`;
    return;
  }
  if (mode === "commit") {
    await sql`
      update products set
        stock = greatest(0, stock - ${line.quantity}),
        reserved = greatest(0, reserved - ${line.quantity})
      where id = ${line.productId}
    `;
    return;
  }
  await sql`update products set stock = stock + ${line.quantity} where id = ${line.productId}`;
}

export async function reserveOrder(sql: Sql, orderId: number) {
  const lines = await linesFor(sql, orderId);
  const done: StockLine[] = [];
  try {
    for (const line of lines) {
      await bump(sql, line, "reserve");
      done.push(line);
    }
  } catch (error) {
    for (const line of done) await bump(sql, line, "release");
    throw error;
  }
  await sql`update orders set inventory_state = 'held' where id = ${orderId}`;
}

export async function rebalanceHold(sql: Sql, orderId: number, next: StockLine[]) {
  const rows = await sql<Row>`select inventory_state from orders where id = ${orderId}`;
  if ((rows[0] ? s(rows[0], "inventory_state") : "") !== "held") return;
  const previous = await linesFor(sql, orderId);
  for (const line of previous) await bump(sql, line, "release");
  const done: StockLine[] = [];
  try {
    for (const line of next) {
      await bump(sql, line, "reserve");
      done.push(line);
    }
  } catch (error) {
    for (const line of done) await bump(sql, line, "release");
    for (const line of previous) await bump(sql, line, "reserve");
    throw error;
  }
}

/** Move an order between held, sold, and released. Safe to call when already there. */
export async function setInventory(sql: Sql, orderId: number, next: "held" | "committed" | "released") {
  const rows = await sql<Row>`select inventory_state from orders where id = ${orderId}`;
  const current = rows[0] ? s(rows[0], "inventory_state") : "none";
  if (current === next) return;
  const lines = await linesFor(sql, orderId);
  if (next === "committed" && current === "held") {
    for (const line of lines) await bump(sql, line, "commit");
  } else if (next === "released" && current === "held") {
    for (const line of lines) await bump(sql, line, "release");
  } else if (next === "released" && current === "committed") {
    for (const line of lines) await bump(sql, line, "restock");
  } else if (next === "held" && (current === "none" || current === "released")) {
    for (const line of lines) await bump(sql, line, "reserve");
  } else if (next === "committed" && current !== "held") {
    for (const line of lines) {
      await sql`update products set stock = greatest(0, stock - ${line.quantity}) where id = ${line.productId}`;
    }
  }
  await sql`update orders set inventory_state = ${next} where id = ${orderId}`;
}

export async function recordEvent(
  sql: Sql,
  input: { orderId: number; kind: string; from?: string; to?: string; actor?: string; detail?: string },
) {
  await sql`
    insert into order_events (order_id, kind, from_value, to_value, actor_name, detail)
    values (
      ${input.orderId}, ${input.kind}, ${input.from ?? ""}, ${input.to ?? ""},
      ${input.actor ?? "Desk"}, ${(input.detail ?? "").slice(0, 500)}
    )
  `;
}

export async function orderEvents(sql: Sql, orderId: number) {
  const rows = await sql<Row>`select * from order_events where order_id = ${orderId} order by id desc`;
  return rows.map((row) => ({
    id: n(row, "id"),
    kind: s(row, "kind"),
    fromValue: s(row, "from_value"),
    toValue: s(row, "to_value"),
    actorName: s(row, "actor_name"),
    detail: s(row, "detail"),
    createdAt: s(row, "created_at"),
  }));
}

const PAID = new Set(["paid", "succeeded", "completed", "success", "captured"]);

export function paymentBucket(status: string): "paid" | "partial" | "refunded" | "failed" | "pending" {
  const value = status.toLowerCase();
  if (PAID.has(value) || (value.includes("paid") && !value.includes("unpaid") && !value.includes("partial"))) return "paid";
  if (value.includes("partial")) return "partial";
  if (value.includes("refund")) return "refunded";
  if (value.includes("fail") || value.includes("void") || value.includes("cancel") || value.includes("expired")) return "failed";
  return "pending";
}

export async function applyPaymentStatus(sql: Sql, orderId: number, status: string, actor: string) {
  const rows = await sql<Row>`select payment_status from orders where id = ${orderId}`;
  if (!rows[0]) return;
  const previous = s(rows[0], "payment_status");
  const next = status.toLowerCase().slice(0, 40) || "pending";
  if (previous === next) return;
  await sql`update orders set payment_status = ${next}, updated_at = now() where id = ${orderId}`;
  await recordEvent(sql, { orderId, kind: "payment", from: previous || "unpaid", to: next, actor });
  const bucket = paymentBucket(next);
  if (bucket === "paid") await setInventory(sql, orderId, "committed");
  if (bucket === "failed" || bucket === "refunded") await setInventory(sql, orderId, "released");
}

export async function enqueueJob(sql: Sql, kind: string, dedupeKey: string, payload: unknown) {
  const existing = await sql<Row>`
    select id from portal_jobs
    where kind = ${kind} and dedupe_key = ${dedupeKey} and status = 'pending'
    limit 1
  `;
  if (existing[0]) return;
  await sql`
    insert into portal_jobs (kind, dedupe_key, payload)
    values (${kind}, ${dedupeKey}, ${JSON.stringify(payload)})
  `;
}

export async function dueJobs(sql: Sql, limit = 8) {
  const rows = await sql<Row>`
    select * from portal_jobs
    where status = 'pending' and run_at <= now()
    order by id
    limit ${limit}
  `;
  return rows.map((row) => ({
    id: n(row, "id"),
    kind: s(row, "kind"),
    payload: s(row, "payload"),
    attempts: n(row, "attempts"),
    maxAttempts: n(row, "max_attempts") || 5,
  }));
}

export async function finishJob(sql: Sql, id: number, error: string, attempts: number, maxAttempts: number) {
  if (!error) {
    await sql`update portal_jobs set status = 'done', last_error = '', updated_at = now() where id = ${id}`;
    return;
  }
  const failed = attempts >= maxAttempts;
  const minutes = Math.min(60, attempts * 2);
  await sql`
    update portal_jobs set
      status = ${failed ? "failed" : "pending"},
      attempts = ${attempts},
      last_error = ${error.slice(0, 300)},
      run_at = now() + (${minutes} || ' minutes')::interval,
      updated_at = now()
    where id = ${id}
  `;
}

export async function attentionJobs(sql: Sql) {
  const rows = await sql<Row>`
    select id, kind, dedupe_key, attempts, last_error, status
    from portal_jobs
    where status in ('failed', 'pending') and last_error <> ''
    order by updated_at desc
    limit 8
  `;
  return rows.map((row) => ({
    id: n(row, "id"),
    kind: s(row, "kind"),
    target: s(row, "dedupe_key"),
    attempts: n(row, "attempts"),
    lastError: s(row, "last_error"),
    status: s(row, "status"),
  }));
}

export async function resolveMail(sql: Sql) {
  const rows = await sql<Row>`select resend_api_key, email_from from portal_settings where id = 1`;
  const row = rows[0];
  const key = (row ? s(row, "resend_api_key") : "") || (await envValue("RESEND_API_KEY"));
  const from = (row ? s(row, "email_from") : "") || (await envValue("EMAIL_FROM")) || "Manage Tech Service <noreply@managetechservice.com>";
  return { key, from };
}

async function deliverEmail(sql: Sql, to: string, subject: string, body: string) {
  const mail = await resolveMail(sql);
  if (!mail.key || !mail.from) return { ok: false, error: "Add a Resend API key in Settings." };
  let signoff = renderSignature("", "MTS Support");
  try {
    const rows = await sql<Row>`select email_signature, reply_name from portal_settings where id = 1`;
    signoff = renderSignature(rows[0] ? s(rows[0], "email_signature") : "", rows[0] ? s(rows[0], "reply_name") : "MTS Support");
  } catch {
    /* the signature column is added with the next settings save */
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${mail.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: mail.from, to: [to], subject, text: `${body}\n\n${signoff}` }),
  });
  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text.slice(0, 180) || "Email provider rejected the message." };
  }
  return { ok: true, error: "" };
}

export async function sendOrderEmail(
  sql: Sql,
  input: { orderId: number; to: string; template: string; subject: string; body: string },
) {
  if (!input.to) return;
  const prior = await sql<Row>`
    select id from outbound_emails
    where order_id = ${input.orderId} and template = ${input.template} and status = 'sent'
    limit 1
  `;
  if (prior[0]) return;
  const result = await deliverEmail(sql, input.to, input.subject, input.body);
  const inserted = await sql<Row>`
    insert into outbound_emails (order_id, to_email, template, subject, body, status, error)
    values (
      ${input.orderId}, ${input.to}, ${input.template}, ${input.subject}, ${input.body},
      ${result.ok ? "sent" : "failed"}, ${result.error}
    )
    returning id
  `;
  await recordEvent(sql, {
    orderId: input.orderId,
    kind: "email",
    to: input.template,
    actor: "Mail",
    detail: result.ok ? `Sent to ${input.to}` : result.error,
  });
  if (!result.ok && inserted[0]) {
    await enqueueJob(sql, "email", `email-${n(inserted[0], "id")}`, { emailId: n(inserted[0], "id") });
  }
}

export async function resendStoredEmail(sql: Sql, emailId: number) {
  const rows = await sql<Row>`select * from outbound_emails where id = ${emailId}`;
  const row = rows[0];
  if (!row) return;
  if (s(row, "status") === "sent") return;
  const result = await deliverEmail(sql, s(row, "to_email"), s(row, "subject"), s(row, "body"));
  if (!result.ok) throw new Error(result.error);
  await sql`update outbound_emails set status = 'sent', error = '' where id = ${emailId}`;
}

export async function verifyAlternativeSignature(request: Request, raw: string) {
  const secret = (process.env.ALTERNATIVE_WEBHOOK_SECRET || "").trim();
  const live = (process.env.ALTERNATIVE_ENV || "").toLowerCase() === "live";
  const header =
    request.headers.get("x-alternative-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("x-webhook-signature") ||
    "";
  if (!secret) {
    if (live) throw new Error("ALTERNATIVE_WEBHOOK_SECRET is required for live webhooks.");
    return;
  }
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const digest = createHmac("sha256", secret).update(raw).digest("hex");
  const given = header.replace(/^sha256=/i, "").trim();
  const left = Buffer.from(digest);
  const right = Buffer.from(given);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Alternative Payments signature did not match.");
  }
}

export function readAlternativeEvent(payload: unknown) {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const invoice = data.invoice && typeof data.invoice === "object" ? (data.invoice as Record<string, unknown>) : {};
  const event = String(root.type || root.event || root.name || "");
  const status = String(data.status || invoice.status || event).toLowerCase();
  const invoiceId = String(data.invoice_id || invoice.id || data.id || "");
  const requestId = String(data.request_id || data.payment_request_id || "");
  const reference = String(data.reference || data.reference_id || invoice.reference || "");
  return { invoiceId, requestId, reference, status };
}
