import { getSql, type Sql } from "@/lib/db";
import { MTS_AUTH_CLIENT, oauthUrls, redirectAllowed } from "./mts-oauth-public";

export { MTS_AUTH_CLIENT, oauthUrls, redirectAllowed };

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function randomToken(bytes = 24) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function client(sql: Sql, clientId: string) {
  const rows = await sql<Row>`select client_id, name, secret, scopes from oauth_clients where client_id = ${clientId} limit 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: text(row.client_id),
    name: text(row.name),
    secret: text(row.secret),
    scopes: text(row.scopes) || "read write",
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;font-family:Roboto,sans-serif;background:#eef4f8;color:#102033"><main style="max-width:28rem;margin:10vh auto;padding:1.5rem;background:#fff;border-radius:1rem;box-shadow:0 12px 32px rgba(0,57,112,.08)"><h1 style="font-size:1.25rem;margin:0 0 .5rem">${title}</h1>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function handleOauthAuthorize(request: Request) {
  const url = new URL(request.url);
  const params = request.method === "POST" ? new URLSearchParams(await request.text()) : url.searchParams;
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const state = params.get("state") || "";
  const scope = (params.get("scope") || "read write").slice(0, 180);
  const responseType = params.get("response_type") || "code";
  if (clientId !== MTS_AUTH_CLIENT || responseType !== "code") {
    return page("Cannot authorize", "<p>This connection has to use the mts-auth client and the authorization code grant.</p>", 400);
  }
  if (!redirectAllowed(redirectUri)) {
    return page("Redirect not allowed", "<p>The redirect URL has to be this portal or a zendesk.com address.</p>", 400);
  }
  const sql = await getSql();
  const known = await client(sql, clientId);
  if (!known) return page("Client not found", "<p>mts-auth is not saved in this portal yet.</p>", 400);
  if (request.method !== "POST" || params.get("allow") !== "1") {
    const fields = ["client_id", "redirect_uri", "state", "scope", "response_type"]
      .map((key) => {
        const value = params.get(key) || (key === "response_type" ? "code" : key === "scope" ? scope : "");
        return `<input type="hidden" name="${key}" value="${escapeHtml(value)}" />`;
      })
      .join("");
    return page(
      "Connect Zendesk",
      `<p style="color:#516072">Allow <strong>mts-auth</strong> to open tickets, orders, and account data for Manage Tech Service.</p><form method="post">${fields}<input type="hidden" name="allow" value="1" /><button style="height:2.75rem;border:0;border-radius:.75rem;background:#003970;color:#fff;padding:0 1rem;font-weight:600" type="submit">Allow connection</button></form>`,
    );
  }
  const code = randomToken(16);
  await sql`
    insert into oauth_codes (code, client_id, redirect_uri, scope, expires_at)
    values (${code}, ${clientId}, ${redirectUri}, ${scope}, now() + interval '5 minutes')
  `;
  const back = new URL(redirectUri);
  back.searchParams.set("code", code);
  if (state) back.searchParams.set("state", state);
  return Response.redirect(back.toString(), 302);
}

async function readBody(request: Request) {
  const type = request.headers.get("content-type") || "";
  const raw = await request.text();
  if (type.includes("application/json")) {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, text(value)]));
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function tokenJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } });
}

export async function handleOauthToken(request: Request) {
  if (request.method === "OPTIONS") return tokenJson({ ok: true });
  let body: Record<string, string>;
  try {
    body = await readBody(request);
  } catch {
    return tokenJson({ error: "invalid_request" }, 400);
  }
  const header = request.headers.get("authorization") || "";
  let clientId = body.client_id || "";
  let clientSecret = body.client_secret || "";
  if (header.toLowerCase().startsWith("basic ")) {
    const decoded = atob(header.slice(6).trim());
    const split = decoded.split(":");
    clientId = clientId || split[0] || "";
    clientSecret = clientSecret || split.slice(1).join(":");
  }
  const sql = await getSql();
  const known = await client(sql, clientId);
  if (!known || clientSecret !== known.secret) return tokenJson({ error: "invalid_client" }, 401);
  const grant = body.grant_type;
  if (grant === "authorization_code") {
    const code = body.code || "";
    const redirectUri = body.redirect_uri || "";
    const rows = await sql<Row>`
      update oauth_codes
      set used_at = now()
      where code = ${code} and client_id = ${clientId} and redirect_uri = ${redirectUri} and used_at is null and expires_at > now()
      returning scope
    `;
    const row = rows[0];
    if (!row) return tokenJson({ error: "invalid_grant" }, 400);
    return issue(sql, clientId, text(row.scope) || known.scopes);
  }
  if (grant === "refresh_token") {
    const rows = await sql<Row>`
      select scope from oauth_tokens
      where token = ${body.refresh_token || ""} and kind = 'refresh' and client_id = ${clientId} and expires_at > now()
      limit 1
    `;
    const row = rows[0];
    if (!row) return tokenJson({ error: "invalid_grant" }, 400);
    return issue(sql, clientId, text(row.scope) || known.scopes);
  }
  return tokenJson({ error: "unsupported_grant_type", error_description: "mts-auth uses the authorization code grant." }, 400);
}

async function issue(sql: Sql, clientId: string, scope: string) {
  const access = `mtsat_${randomToken(24)}`;
  const refresh = `mtsrt_${randomToken(24)}`;
  await sql`
    insert into oauth_tokens (token, kind, client_id, scope, expires_at, refresh_token)
    values (${access}, 'access', ${clientId}, ${scope}, now() + interval '1 hour', ${refresh})
  `;
  await sql`
    insert into oauth_tokens (token, kind, client_id, scope, expires_at)
    values (${refresh}, 'refresh', ${clientId}, ${scope}, now() + interval '30 days')
  `;
  return tokenJson({ access_token: access, token_type: "Bearer", expires_in: 3600, refresh_token: refresh, scope });
}

export async function authorizeOauthToken(header: string) {
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("mtsat_")) return null;
  const sql = await getSql();
  const rows = await sql<Row>`
    select client_id, scope from oauth_tokens
    where token = ${token} and kind = 'access' and expires_at > now()
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: text(row.client_id), name: "mts-auth", scope: text(row.scope) || "read write", sql };
}

export async function mtsAuthPublic() {
  const sql = await getSql();
  const known = await client(sql, MTS_AUTH_CLIENT);
  const urls = oauthUrls();
  return {
    name: "mts-auth",
    clientId: MTS_AUTH_CLIENT,
    secret: known?.secret || "",
    grantType: "authorization_code",
    scopes: known?.scopes || "read write",
    authorizeUrl: urls.authorizeUrl,
    tokenUrl: urls.tokenUrl,
  };
}
