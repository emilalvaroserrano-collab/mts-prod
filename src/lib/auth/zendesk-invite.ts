type ZendeskInvite = { email: string; name: string };

const subdomain = process.env.ZENDESK_SUBDOMAIN?.trim() || "mts-portal";
const clientId = process.env.ZENDESK_OAUTH_CLIENT_ID?.trim() || "mts-portal";
const clientSecret = process.env.ZENDESK_OAUTH_CLIENT_SECRET?.trim() || "2323b62739554021211eaa17dc81221200a1dda3f362d1d7323ae09ecde4aee1";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function zendeskToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 15_000) return tokenCache.token;
  const hosts = [...new Set([subdomain || "mts-portal", "mts-portal"])];
  let last = "Invitation check is unavailable.";
  for (const host of hosts) {
    const response = await fetch(`https://${host}.zendesk.com/oauth/tokens`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "read write",
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      last = `Zendesk OAuth returned ${response.status}.`;
      if (response.status === 404) continue;
      throw new Error(last);
    }
    const parsed = JSON.parse(text) as { access_token?: string; expires_in?: number };
    if (!parsed.access_token) throw new Error("Invitation check is unavailable.");
    const ttl = typeof parsed.expires_in === "number" && parsed.expires_in > 60 ? parsed.expires_in * 1000 : 30 * 60 * 1000;
    tokenCache = { token: parsed.access_token, expiresAt: Date.now() + ttl };
    return parsed.access_token;
  }
  throw new Error(last);
}

export function zendeskSupportToken() {
  return zendeskToken();
}

async function authorizationHeader() {
  const email = (process.env.ZENDESK_EMAIL || process.env.ZENDESK_AGENT_EMAIL || "").trim();
  const apiToken = (process.env.ZENDESK_API_TOKEN || process.env.ZENDESK_TOKEN || process.env.ZENDESK_API_KEY || "").trim();
  if (email && apiToken) {
    const raw = `${email}/token:${apiToken}`;
    return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
  }
  return `Bearer ${await zendeskToken()}`;
}

export async function findZendeskInvite(email: string): Promise<ZendeskInvite | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(`type:user email:${normalized}`)}`, {
    headers: { Accept: "application/json", Authorization: await authorizationHeader() },
  });
  if (!response.ok) throw new Error("Invitation check is unavailable.");
  const body = (await response.json()) as {
    users?: { email?: string; name?: string; active?: boolean; suspended?: boolean }[];
  };
  const match = (body.users ?? []).find((user) => user.email?.trim().toLowerCase() === normalized);
  if (!match || match.suspended || match.active === false) return null;
  return { email: normalized, name: match.name?.trim() || normalized };
}
