type ZendeskInvite = { email: string; name: string };

const subdomain = process.env.ZENDESK_SUBDOMAIN?.trim() || "mts-portal";
const clientId = process.env.ZENDESK_OAUTH_CLIENT_ID?.trim() || "manage_tech_service";
const clientSecret = process.env.ZENDESK_OAUTH_CLIENT_SECRET?.trim() || "99e8abb6231c965eac620c7ed3f7a8a6d5ef5264a4e8138fc394dfca39065743";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function zendeskToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 15_000) return tokenCache.token;
  const response = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "read",
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Invitation check is unavailable.");
  const parsed = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!parsed.access_token) throw new Error("Invitation check is unavailable.");
  const ttl = typeof parsed.expires_in === "number" && parsed.expires_in > 60 ? parsed.expires_in * 1000 : 30 * 60 * 1000;
  tokenCache = { token: parsed.access_token, expiresAt: Date.now() + ttl };
  return parsed.access_token;
}

export async function findZendeskInvite(email: string): Promise<ZendeskInvite | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  const token = await zendeskToken();
  const query = `type:user email:${normalized}`;
  const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Invitation check is unavailable.");
  const body = (await response.json()) as {
    users?: { email?: string; name?: string; active?: boolean; suspended?: boolean }[];
  };
  const match = (body.users ?? []).find((user) => user.email?.trim().toLowerCase() === normalized);
  if (!match || match.suspended || match.active === false) return null;
  return { email: normalized, name: match.name?.trim() || normalized };
}
