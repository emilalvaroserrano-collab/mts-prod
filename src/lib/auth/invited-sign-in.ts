import { createHash, randomInt, randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";

function emailOf(input: unknown) {
  const raw = input && typeof input === "object" ? (input as { email?: unknown }) : {};
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!email.includes("@")) throw new Error("Enter the email from your invitation.");
  return email;
}

export const signInWithInvitation = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = input && typeof input === "object" ? (input as { email?: unknown; password?: unknown }) : {};
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (!email.includes("@") || password.length < 8) throw new Error("Enter the email and password from your invitation.");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const { auth } = await import("./server");
    const { findZendeskInvite } = await import("./zendesk-invite");
    const invited = await findZendeskInvite(data.email);
    if (!invited) throw new Error("Check the email from your invitation and try again.");
    const headers = getRequestHeaders();
    try {
      await auth.api.signInEmail({
        body: { email: invited.email, password: data.password, rememberMe: true },
        headers,
      });
      return { ok: true as const };
    } catch {
      try {
        await auth.api.signUpEmail({
          body: { email: invited.email, password: data.password, name: invited.name },
          headers,
        });
        return { ok: true as const };
      } catch {
        throw new Error("Email or password is incorrect.");
      }
    }
  });

async function mailer() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ resend_api_key: string; email_from: string }>`select resend_api_key, email_from from portal_settings where id = 1`;
  const row = rows[0];
  const key = (row?.resend_api_key || process.env.RESEND_API_KEY || "").trim();
  const from = (row?.email_from || process.env.EMAIL_FROM || "Manage Tech Service <noreply@managetechservice.com>").trim();
  return { sql, key, from };
}

export const requestPortalPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ email: emailOf(input) }))
  .handler(async ({ data }) => {
    const { findZendeskInvite } = await import("./zendesk-invite");
    const invited = await findZendeskInvite(data.email);
    if (!invited) throw new Error("This email is not registered.");
    const { sql, key, from } = await mailer();
    if (!key) throw new Error("Password email is not available yet.");
    const code = String(randomInt(100000, 1000000));
    const identifier = `reset:${invited.email}`;
    await sql`delete from verification where identifier = ${identifier}`;
    await sql`
      insert into verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
      values (${randomUUID()}, ${identifier}, ${JSON.stringify({ hash: createHash("sha256").update(code).digest("hex"), attempts: 0 })}, now() + interval '15 minutes', now(), now())
    `;
    const { renderSignature } = await import("@/lib/portal/email-signature");
    let signoff = renderSignature("", "MTS Support");
    try {
      const signature = await sql<{ email_signature: string; reply_name: string }>`select email_signature, reply_name from portal_settings where id = 1`;
      signoff = renderSignature(signature[0]?.email_signature || "", signature[0]?.reply_name || "MTS Support");
    } catch {
      /* signature is optional until the column exists */
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [invited.email],
        subject: "Your Manage Tech Service verification code",
        text: `Your verification code is ${code}. It expires in 15 minutes. If you did not ask for this, ignore this email.\n\n${signoff}`,
      }),
    });
    if (!response.ok) throw new Error("The verification email could not be sent.");
    return { ok: true as const };
  });

export const confirmPortalPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = input && typeof input === "object" ? (input as { email?: unknown; code?: unknown; password?: unknown }) : {};
    const email = emailOf(raw);
    const code = typeof raw.code === "string" ? raw.code.replace(/\s/g, "") : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code from the email.");
    if (password.length < 8) throw new Error("Use at least 8 characters.");
    return { email, code, password };
  })
  .handler(async ({ data }) => {
    const { findZendeskInvite } = await import("./zendesk-invite");
    const invited = await findZendeskInvite(data.email);
    if (!invited) throw new Error("This email is not registered.");
    const { sql } = await mailer();
    const identifier = `reset:${invited.email}`;
    const rows = await sql<{ id: string; value: string; expiresAt: string | Date }>`
      select id, value, "expiresAt" from verification where identifier = ${identifier} order by "createdAt" desc limit 1
    `;
    const row = rows[0];
    if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
      throw new Error("That code has expired. Request a new one.");
    }
    const stored = JSON.parse(row.value) as { hash?: string; attempts?: number };
    const attempts = Number(stored.attempts) || 0;
    if (attempts >= 5) {
      await sql`delete from verification where identifier = ${identifier}`;
      throw new Error("Too many attempts. Request a new code.");
    }
    const hash = createHash("sha256").update(data.code).digest("hex");
    if (hash !== stored.hash) {
      await sql`update verification set value = ${JSON.stringify({ hash: stored.hash, attempts: attempts + 1 })}, "updatedAt" = now() where id = ${row.id}`;
      throw new Error("That code is not correct.");
    }
    await sql`delete from verification where identifier = ${identifier}`;
    const passwordHash = await hashPassword(data.password);
    const users = await sql<{ id: string }>`select id from "user" where lower(email) = ${invited.email} limit 1`;
    const user = users[0];
    if (user) {
      const accounts = await sql<{ id: string }>`
        select id from account where "userId" = ${user.id} and "providerId" = 'credential' limit 1
      `;
      if (accounts[0]) {
        await sql`update account set password = ${passwordHash}, "updatedAt" = now() where id = ${accounts[0].id}`;
      } else {
        await sql`
          insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
          values (${randomUUID()}, ${user.id}, 'credential', ${user.id}, ${passwordHash}, now(), now())
        `;
      }
      return { ok: true as const };
    }
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const { auth } = await import("./server");
    await auth.api.signUpEmail({
      body: { email: invited.email, password: data.password, name: invited.name },
      headers: getRequestHeaders(),
    });
    return { ok: true as const };
  });
