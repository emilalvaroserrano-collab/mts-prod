import { getSql, type Sql } from "@/lib/db";
import { authorizeAgentKey } from "@/lib/portal/agent-keys";
import { ALTERNATIVE_PORTAL, createAlternativeCheckout, loadAlternativeCreds } from "@/lib/portal/alternative";
import { ensureDeskOrganization, filePortalTicket, settleNewOrder, syncCustomerTicket } from "@/lib/portal/api";
import { resolveMail, setInventory } from "@/lib/portal/commerce";
import { authorizeOauthToken } from "@/lib/portal/mts-oauth";
import { unpaidCardStatus, verificationDecision } from "@/lib/portal/security";

type Row = Record<string, unknown>;

const OFFERINGS = {
  network: "connecting the office to the network",
  "voip-line": "a VoIP phone line",
  "voip-ext": "a VoIP extension",
  "fax-physical": "a physical fax line",
  "fax-efax": "eFax",
  "internet-spectrum": "Spectrum cable internet",
  "internet-att": "AT&T Fiber",
  "internet-frontier": "Frontier Fiber",
  "internet-fixed": "fixed wireless internet",
  wiring: "wiring",
} as const;

function s(row: Row | undefined, key: string) {
  const value = row?.[key];
  return value == null ? "" : String(value);
}

function n(row: Row | undefined, key: string) {
  const value = Number(row?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function b(row: Row | undefined, key: string) {
  const value = row?.[key];
  return value === true || value === "t" || value === "true" || value === 1;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  });
}

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function mailCode(sql: Sql, email: string, code: string) {
  const mail = await resolveMail(sql);
  if (!mail.key || !mail.from) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${mail.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: mail.from,
      to: [email],
      subject: "Verify your Manage Tech Service portal",
      text: `Your verification code is ${code}. It expires in 30 minutes.`,
    }),
  });
  return response.ok;
}

function newCode() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return String(100000 + ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 900000);
}

async function customer(sql: Sql, id: number) {
  const rows = await sql<Row>`
    select c.*, o.name as organization_name
    from shop_customers c
    left join organizations o on o.id = c.organization_id
    where c.id = ${id}
    limit 1
  `;
  return rows[0];
}

async function access(sql: Sql, row: Row) {
  const roleId = s(row, "role_id") || "regular";
  const policies = await sql<Row>`select * from role_policies where id = ${roleId}`;
  const policy = policies[0];
  const canShop = (policy ? b(policy, "can_shop") : false) || b(row, "grant_shop");
  return {
    roleId,
    canTicket: policy ? (policy.can_ticket == null ? true : b(policy, "can_ticket")) : true,
    canShop,
    canPurchase: (policy ? b(policy, "can_purchase") : false) || canShop,
    canPayNow: (policy ? b(policy, "can_pay_now") : false) || canShop,
    canOrderIt: (policy ? b(policy, "can_order_it") : false) || b(row, "grant_services"),
    canOrderPhone: (policy ? b(policy, "can_order_phone") : false) || b(row, "grant_services"),
    canDefer: b(row, "grant_invoice"),
  };
}

function profile(row: Row, flags: Awaited<ReturnType<typeof access>>) {
  return {
    id: n(row, "id"),
    name: s(row, "name"),
    email: s(row, "email"),
    phone: s(row, "phone"),
    address: s(row, "address"),
    city: s(row, "city"),
    region: s(row, "region"),
    postal: s(row, "postal"),
    country: s(row, "country") || "United States",
    business: s(row, "business_name"),
    organization: s(row, "organization_name"),
    verified: b(row, "email_verified"),
    payLater: b(row, "pay_later"),
    grants: { shop: b(row, "grant_shop"), services: b(row, "grant_services"), invoice: b(row, "grant_invoice") },
    access: flags,
  };
}

async function redeemHandoff(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.slice(0, 80) : "";
  if (!code) return json({ error: "Missing code." }, 400);
  const sql = await getSql();
  await sql`
    create table if not exists agent_handoffs (
      code text primary key,
      customer_id integer not null,
      email text not null,
      name text not null default '',
      phone text not null default '',
      business text not null default '',
      organization text not null default '',
      role text not null default '',
      expires_at timestamptz not null,
      used_at timestamptz
    )
  `;
  const rows = await sql<Row>`
    update agent_handoffs
    set used_at = now()
    where code = ${code} and used_at is null and expires_at > now()
    returning customer_id, email, name, phone, business, organization, role
  `;
  const row = rows[0];
  if (!row) return json({ error: "Handoff expired." }, 401);
  return json({
    id: n(row, "customer_id"),
    email: s(row, "email"),
    name: s(row, "name"),
    phone: s(row, "phone"),
    business: s(row, "business"),
    organization: s(row, "organization"),
    role: s(row, "role"),
  });
}

export async function handleAgentRequest(request: Request) {
  if (request.method === "OPTIONS") return json({ ok: true });
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/agent\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "handoff" && parts[1] === "redeem" && request.method === "POST") {
    return redeemHandoff(request);
  }
  const auth = (await authorizeAgentKey(request.headers.get("authorization") || "")) || (await authorizeOauthToken(request.headers.get("authorization") || ""));
  if (!auth) return json({ error: "Unauthorized. Send Authorization: Bearer with an mts_ key from /docs." }, 401);
  const sql = auth.sql;
  try {
    await sql`
      insert into audit_logs (actor_user_id, actor_name, action, target, detail)
      values (${`key:${auth.id}`}, ${auth.name}, ${request.method}, ${url.pathname}, '')
    `;
    if (parts[0] !== "customers") return json({ error: "Unknown path. See /api/openapi.json." }, 404);
    if (parts.length === 1 && request.method === "GET") {
      const q = url.searchParams.get("q")?.trim().slice(0, 80) || "";
      const like = `%${q.replace(/%/g, "")}%`;
      const rows = q
        ? await sql<Row>`
            select c.id, c.name, c.email, c.phone, c.business_name, c.email_verified, o.name as organization_name
            from shop_customers c
            left join organizations o on o.id = c.organization_id
            where c.name ilike ${like} or c.email ilike ${like} or c.business_name ilike ${like}
            order by c.created_at desc
            limit 50
          `
        : await sql<Row>`
            select c.id, c.name, c.email, c.phone, c.business_name, c.email_verified, o.name as organization_name
            from shop_customers c
            left join organizations o on o.id = c.organization_id
            order by c.created_at desc
            limit 50
          `;
      return json(rows.map((row) => ({
        id: n(row, "id"),
        name: s(row, "name"),
        email: s(row, "email"),
        phone: s(row, "phone"),
        business: s(row, "business_name"),
        organization: s(row, "organization_name"),
        verified: b(row, "email_verified"),
      })));
    }
    if (parts.length === 1 && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const email = clip(body.email, 160).toLowerCase();
      const name = clip(body.name, 120) || email.split("@")[0] || "";
      if (!emailOk(email)) return json({ error: "Enter a valid email. The user verifies that address. The other fields are optional." }, 400);
      const existing = await sql<Row>`select id from shop_customers where lower(email) = ${email}`;
      if (existing[0]) return json({ error: "That email already has an account.", id: n(existing[0], "id") }, 409);
      const business = clip(body.business, 160);
      const phone = clip(body.phone, 40);
      const domain = email.split("@")[1] || "";
      const shared = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"].includes(domain);
      let organizationId: number | null = null;
      if (!shared && domain) {
        const found = await sql<Row>`select id from organizations where lower(domain) = ${domain} limit 1`;
        if (found[0]) organizationId = n(found[0], "id");
      }
      if (!organizationId && business) {
        const created = await sql<Row>`
          insert into organizations (name, domain, phone, portal_access, ordering_enabled, notes)
          values (${business}, ${shared ? "" : domain}, ${phone}, true, false, 'Created by the CSR super admin key. The user still has to verify their email.')
          returning id
        `;
        organizationId = n(created[0], "id");
      }
      const code = newCode();
      const inserted = await sql<Row>`
        insert into shop_customers (
          email, name, password_hash, phone, address, city, region, postal, country,
          business_name, organization_id, role_id, email_verified, verify_code, verify_expires
        ) values (
          ${email}, ${name}, ${`blocked:${crypto.randomUUID()}`}, ${phone},
          ${clip(body.address, 160)}, ${clip(body.city, 80)}, ${clip(body.region, 80)}, ${clip(body.postal, 20)},
          ${clip(body.country, 80) || "United States"}, ${business}, ${organizationId}, 'regular',
          false, ${code}, now() + interval '30 minutes'
        )
        returning id
      `;
      const mailed = await mailCode(sql, email, code);
      return json({ id: n(inserted[0], "id"), email, name, verified: false, mailed }, 201);
    }
    const id = Number(parts[1]);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "Customer id must be a number." }, 400);
    const row = await customer(sql, id);
    if (!row) return json({ error: "No customer with that id." }, 404);
    const flags = await access(sql, row);
    const elevated = auth.scope === "super_admin";
    const email = s(row, "email");
    const name = s(row, "name");
    const orgId = s(row, "organization_id") ? n(row, "organization_id") : null;

    if (parts.length === 2 && request.method === "GET") return json(profile(row, flags));
    if (parts.length === 2 && request.method === "DELETE") {
      await sql`delete from customer_notices where shop_customer_id = ${id}`;
      await sql`delete from complaints where shop_customer_id = ${id}`;
      await sql`delete from service_requests where shop_customer_id = ${id}`;
      await sql`update orders set shop_customer_id = null where shop_customer_id = ${id}`;
      await sql`delete from shop_customers where id = ${id}`;
      return json({ ok: true });
    }
    if (parts.length === 2 && request.method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      if ("emailVerified" in body || "verified" in body || "role" in body || "password" in body || "grants" in body) {
        return json({ error: "The user verifies their own email with the code that was sent. This key cannot set a password, role, or grant." }, 400);
      }
      const nextName = clip(body.name, 120) || name;
      if (!nextName) return json({ error: "Enter a name." }, 400);
      await sql`
        update shop_customers set
          name = ${nextName},
          phone = ${"phone" in body ? clip(body.phone, 40) : s(row, "phone")},
          address = ${"address" in body ? clip(body.address, 160) : s(row, "address")},
          city = ${"city" in body ? clip(body.city, 80) : s(row, "city")},
          region = ${"region" in body ? clip(body.region, 80) : s(row, "region")},
          postal = ${"postal" in body ? clip(body.postal, 20) : s(row, "postal")},
          country = ${"country" in body ? clip(body.country, 80) || "United States" : s(row, "country") || "United States"},
          business_name = ${"business" in body ? clip(body.business, 160) : s(row, "business_name")}
        where id = ${id}
      `;
      return json({ ok: true, verified: b(row, "email_verified") });
    }
    if (parts[2] === "verify" && parts.length === 3 && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const code = clip(body.code, 12);
      if (!code) return json({ error: "The user has to read the code from their email and give it to you." }, 400);
      const decision = verificationDecision({
        hasAccount: true,
        storedCode: s(row, "verify_code"),
        submittedCode: code,
        expiresAt: s(row, "verify_expires"),
        attempts: n(row, "verify_attempts"),
      });
      if (!decision.ok) {
        if (decision.reason === "mismatch") await sql`update shop_customers set verify_attempts = verify_attempts + 1 where id = ${id}`;
        if (decision.reason === "locked") return json({ error: "Too many attempts. Send a new code." }, 400);
        if (decision.reason === "expired") return json({ error: "That code has expired." }, 400);
        return json({ error: "That code is wrong." }, 400);
      }
      await sql`
        update shop_customers set email_verified = true, verify_code = '', verify_attempts = 0
        where id = ${id} and verify_code = ${code}
      `;
      return json({ ok: true, verified: true });
    }
    if (parts[2] === "verify" && parts[3] === "resend" && request.method === "POST") {
      const code = newCode();
      await sql`
        update shop_customers set verify_code = ${code}, verify_expires = now() + interval '30 minutes', verify_attempts = 0
        where id = ${id}
      `;
      const mailed = await mailCode(sql, email, code);
      return json({ ok: true, mailed });
    }

    if (parts[2] === "pages" && request.method === "GET") {
      return json({
        pages: [
          { label: "Home", path: "/portal", api: `/api/agent/customers/${id}/home` },
          { label: "Tickets", path: "/portal/tickets", api: `/api/agent/customers/${id}/tickets` },
          { label: "Order", path: "/portal/shop", api: `/api/agent/customers/${id}/shop` },
          { label: "Orders", path: "/portal/orders", api: `/api/agent/customers/${id}/orders` },
          { label: "Billing", path: "/portal/billing", api: `/api/agent/customers/${id}/billing` },
          { label: "Complaints", path: "/portal/complaints", api: `/api/agent/customers/${id}/complaints` },
          { label: "Organization", path: "/portal/organization", api: `/api/agent/customers/${id}/organization` },
          { label: "Account", path: "/portal/account", api: `/api/agent/customers/${id}` },
          { label: "Notifications", path: "/portal/notifications", api: `/api/agent/customers/${id}/notices` },
        ],
      });
    }

    if (parts[2] === "home" && request.method === "GET") {
      const tickets = await sql<Row>`select status from tickets where lower(requester_email) = lower(${email})`;
      const orders = await sql<Row>`
        select status, payment_method from orders
        where shop_customer_id = ${id} or lower(ship_email) = lower(${email})
      `;
      const services = await sql<Row>`select status from service_requests where shop_customer_id = ${id}`;
      const open = tickets.filter((item) => !["solved", "closed"].includes(s(item, "status"))).length;
      const pendingOrders = orders.filter((item) => !["fulfilled", "cancelled"].includes(s(item, "status"))).length;
      const unpaid = orders.filter((item) => ["pay_later", "unpaid", ""].includes(s(item, "payment_method"))).length;
      return json({
        name,
        email,
        business: s(row, "business_name"),
        openTickets: open,
        pendingOrders,
        unpaid,
        pendingServices: services.filter((item) => ["requested", "quoted"].includes(s(item, "status"))).length,
        activeServices: services.filter((item) => ["approved", "provisioned"].includes(s(item, "status"))).length,
        page: "/portal",
      });
    }

    if (parts[2] === "shop" && request.method === "GET") {
      const settings = await sql<Row>`select brand_name, customer_catalog_visible from portal_settings where id = 1`;
      const closed = settings[0] ? !b(settings[0], "customer_catalog_visible") : false;
      const products = (closed || !flags.canShop) && !elevated
        ? []
        : await sql<Row>`select id, sku, name, category, description, price_cents, image_url, stock from products where available = true order by category, name`;
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      const equipment = products
        .map((item) => ({
          id: n(item, "id"),
          sku: s(item, "sku"),
          name: s(item, "name"),
          category: s(item, "category"),
          description: s(item, "description"),
          priceCents: n(item, "price_cents"),
          imageUrl: s(item, "image_url"),
          stock: n(item, "stock"),
        }))
        .filter((item) => !q || `${item.sku} ${item.name} ${item.category} ${item.description}`.toLowerCase().includes(q));
      return json({
        page: "/portal/shop",
        canShop: flags.canShop || elevated,
        canPurchase: flags.canPurchase || elevated,
        payLater: flags.canDefer || b(row, "pay_later"),
        query: q,
        equipment,
        services: [
          { id: "network", label: "Connect an office", detail: "Bring the network or internet into a new office.", offering: "network", allowed: flags.canOrderIt },
          { id: "voip-line", label: "VoIP line", detail: "A new phone line.", offering: "voip-line", allowed: flags.canOrderPhone },
          { id: "voip-ext", label: "VoIP extension", detail: "$18 per month on the Telxent bill. Confirm before ordering.", offering: "voip-ext", allowed: flags.canOrderPhone },
          { id: "fax-physical", label: "Physical fax", detail: "A fax line.", offering: "fax-physical", allowed: flags.canOrderPhone },
          { id: "fax-efax", label: "eFax", detail: "Incoming faxes go to an email address.", offering: "fax-efax", allowed: flags.canOrderPhone },
          { id: "internet-spectrum", label: "Spectrum", detail: "Cable internet.", offering: "internet-spectrum", allowed: flags.canOrderIt },
          { id: "internet-att", label: "AT&T Fiber", detail: "Fiber internet.", offering: "internet-att", allowed: flags.canOrderIt },
          { id: "internet-frontier", label: "Frontier Fiber", detail: "Fiber internet.", offering: "internet-frontier", allowed: flags.canOrderIt },
          { id: "internet-fixed", label: "Fixed wireless", detail: "Fixed wireless internet.", offering: "internet-fixed", allowed: flags.canOrderIt },
          { id: "wiring", label: "Wiring", detail: "$175 per drop.", offering: "wiring", allowed: flags.canOrderIt },
        ],
      });
    }

    if (parts[2] === "billing" && request.method === "GET") {
      if (!flags.canShop && !flags.canDefer) return json({ error: "Invoices and shop payments are turned off for this account." }, 403);
      const orders = await sql<Row>`
        select o.id, o.status, o.payment_method,
          coalesce((select sum(oi.quantity * oi.unit_price_cents)::int from order_items oi where oi.order_id = o.id), 0) + coalesce(o.shipping_cents, 0) as total_cents
        from orders o
        where o.shop_customer_id = ${id} or lower(o.ship_email) = lower(${email})
        order by o.created_at desc
        limit 30
      `;
      return json({
        page: "/portal/billing",
        invoiceAllowed: flags.canDefer,
        orders: orders.map((item) => ({
          id: n(item, "id"),
          number: `MT-${1000 + n(item, "id")}`,
          status: s(item, "status"),
          paymentMethod: s(item, "payment_method") || "unpaid",
          totalCents: n(item, "total_cents"),
        })),
      });
    }

    if (parts[2] === "organization" && request.method === "GET") {
      return json({
        page: "/portal/organization",
        business: s(row, "business_name"),
        organization: s(row, "organization_name"),
        phone: s(row, "phone"),
        city: s(row, "city"),
      });
    }
    if (parts[2] === "organization" && (request.method === "PATCH" || request.method === "POST")) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const business = clip(body.business, 160);
      const phone = clip(body.phone, 40) || s(row, "phone");
      const city = clip(body.city, 80) || s(row, "city");
      if (!business) return json({ error: "Enter the company name." }, 400);
      let organizationId = orgId;
      if (organizationId) {
        await sql`update organizations set name = ${business}, phone = ${phone} where id = ${organizationId}`;
      } else {
        const created = await sql<Row>`
          insert into organizations (name, phone, portal_access, ordering_enabled, notes)
          values (${business}, ${phone}, true, true, 'Updated from the customer portal.')
          returning id
        `;
        organizationId = n(created[0], "id");
      }
      await sql`
        update shop_customers set business_name = ${business}, phone = ${phone}, city = ${city}, organization_id = ${organizationId}
        where id = ${id}
      `;
      const ticket = await filePortalTicket(sql, {
        name,
        email,
        organizationId,
        subject: `Company update: ${business}`,
        category: "Account",
        body: `${name} updated their portal.\nCompany: ${business}\nPhone: ${phone}\nCity: ${city}`,
      });
      return json({ ok: true, ticketId: ticket.ticketId, zendeskId: ticket.zendeskId });
    }

    if (parts[2] === "tickets" && parts.length === 3 && request.method === "GET") {
      const tickets = await sql<Row>`
        select id, subject, status, category, zendesk_id, updated_at
        from tickets
        where lower(requester_email) = lower(${email})
        order by updated_at desc
        limit 20
      `;
      return json(tickets.map((item) => ({
        id: n(item, "id"),
        subject: s(item, "subject"),
        status: s(item, "status"),
        category: s(item, "category"),
        zendeskId: s(item, "zendesk_id"),
        updatedAt: s(item, "updated_at"),
      })));
    }
    if (parts[2] === "tickets" && parts.length === 3 && request.method === "POST") {
      if (!flags.canTicket) return json({ error: "This account cannot open tickets." }, 403);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const subject = clip(body.subject, 180);
      const text = clip(body.body, 4000);
      if (!subject || !text) return json({ error: "Subject and body are required." }, 400);
      const category = clip(body.category, 80) || "IT support";
      const detail = [`Category: ${category}`, body.device ? `Device: ${clip(body.device, 120)}` : "", text].filter(Boolean).join("\n");
      const ticket = await filePortalTicket(sql, { name, email, organizationId: orgId, subject, category, body: detail });
      return json(ticket);
    }
    if (parts[2] === "tickets" && parts.length === 4 && request.method === "GET") {
      const ticketId = Number(parts[3]);
      const tickets = await sql<Row>`select * from tickets where id = ${ticketId} and lower(requester_email) = lower(${email})`;
      if (!tickets[0]) return json({ error: "That ticket is not on this account." }, 404);
      const comments = await sql<Row>`select author_name, body, created_at from ticket_comments where ticket_id = ${ticketId} and public_note = true order by created_at`;
      return json({
        id: n(tickets[0], "id"),
        subject: s(tickets[0], "subject"),
        status: s(tickets[0], "status"),
        category: s(tickets[0], "category"),
        zendeskId: s(tickets[0], "zendesk_id"),
        updatedAt: s(tickets[0], "updated_at"),
        comments: comments.map((item) => ({ author: s(item, "author_name"), body: s(item, "body"), at: s(item, "created_at") })),
      });
    }
    if (parts[2] === "tickets" && parts[4] === "replies" && request.method === "POST") {
      const ticketId = Number(parts[3]);
      const tickets = await sql<Row>`select id from tickets where id = ${ticketId} and lower(requester_email) = lower(${email})`;
      if (!tickets[0]) return json({ error: "That ticket is not on this account." }, 404);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const text = clip(body.body, 4000);
      if (!text) return json({ error: "Write a reply." }, 400);
      await sql`insert into ticket_comments (ticket_id, author_name, body, public_note) values (${ticketId}, ${name || "Customer"}, ${text}, true)`;
      const copy = await filePortalTicket(sql, { name, email, organizationId: orgId, subject: `Mike reply on ticket ${ticketId}`, category: "Chat", body: text });
      return json({ ok: true, ticketId: copy.ticketId, zendeskId: copy.zendeskId });
    }

    if (parts[2] === "orders" && parts.length === 3 && request.method === "GET") {
      const orders = await sql<Row>`
        select id, status, payment_status, shipment_status, created_at
        from orders
        where shop_customer_id = ${id} or lower(ship_email) = lower(${email})
        order by created_at desc
        limit 20
      `;
      return json(orders.map((item) => ({
        id: n(item, "id"),
        number: `MT-${1000 + n(item, "id")}`,
        status: s(item, "status"),
        paymentStatus: s(item, "payment_status"),
        shipmentStatus: s(item, "shipment_status") || "unfulfilled",
        createdAt: s(item, "created_at"),
      })));
    }
    if (parts[2] === "orders" && parts.length === 3 && request.method === "POST") {
      if (!flags.canPurchase && !elevated) return json({ error: "This account cannot purchase products." }, 403);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const rawItems = Array.isArray(body.items) ? body.items : [{ sku: body.sku, quantity: body.quantity ?? 1 }];
      const items = rawItems
        .map((item) => {
          const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
          const quantity = Number(line.quantity ?? 1);
          return { sku: clip(line.sku, 40), quantity: Number.isInteger(quantity) ? quantity : 0 };
        })
        .filter((item) => item.sku && item.quantity > 0 && item.quantity <= 99);
      if (!items.length) return json({ error: "Name a catalog SKU and a quantity." }, 400);
      const products: Row[] = [];
      for (const item of items) {
        const found = await sql<Row>`select * from products where available = true and sku = ${item.sku} limit 1`;
        if (!found[0]) return json({ error: `${item.sku} is not in the catalog. Search the shop and order a listed SKU.` }, 400);
        products.push(found[0]);
      }
      const address = clip(body.address, 160) || s(row, "address");
      const city = clip(body.city, 80) || s(row, "city");
      const region = clip(body.region, 80) || s(row, "region");
      const postal = clip(body.postal, 20) || s(row, "postal");
      const country = clip(body.country, 80) || s(row, "country") || "United States";
      if (!address || !city || !postal) return json({ error: "A shipping address, city, and postal code are required." }, 400);
      const wantLater = body.payLater === true || body.paymentMethod === "pay_later";
      const mayDefer = flags.canDefer || b(row, "pay_later");
      if (wantLater && !mayDefer && !elevated) return json({ error: "This account has to pay before the order is placed." }, 403);
      const method = wantLater || ((!flags.canPayNow && mayDefer) || (elevated && wantLater)) ? "pay_later" : "card";
      if (method === "card" && !flags.canPayNow && !elevated) return json({ error: "This account cannot pay immediately." }, 403);
      const subtotal = items.reduce((sum, item, index) => sum + n(products[index], "price_cents") * item.quantity, 0);
      const shippingCents = body.shippingMethod === "express" ? 2500 : subtotal >= 50000 ? 0 : 1500;
      const shippingMethod = body.shippingMethod === "express" ? "express" : "standard";
      const organizationId = orgId || (await ensureDeskOrganization(sql));
      const inserted = await sql<Row>`
        insert into orders (
          organization_id, customer_user_id, shop_customer_id, status, notes, approval_note, payment_method,
          ship_name, ship_email, ship_phone, ship_address, ship_city, ship_region, ship_postal, ship_country,
          shipping_method, shipping_cents, shipment_status
        ) values (
          ${organizationId}, null, ${id}, 'pending', ${clip(body.notes, 1000)}, 'Placed by Sarah for the signed-in customer.', ${method},
          ${name}, ${email}, ${s(row, "phone")}, ${address}, ${city}, ${region}, ${postal}, ${country},
          ${shippingMethod}, ${shippingCents}, 'unfulfilled'
        )
        returning id
      `;
      const orderId = n(inserted[0], "id");
      const lines = items.map((item, index) => ({
        description: s(products[index], "name"),
        amount: n(products[index], "price_cents") / 100,
        quantity: item.quantity,
        product: products[index],
      }));
      for (const line of lines) {
        await sql`
          insert into order_items (order_id, product_id, product_name, sku, quantity, unit_price_cents)
          values (${orderId}, ${n(line.product, "id")}, ${s(line.product, "name")}, ${s(line.product, "sku")}, ${line.quantity}, ${n(line.product, "price_cents")})
        `;
      }
      let paymentUrl = "";
      await sql`
        update orders set card_brand = '', card_last4 = '', card_exp = '', payment_status = ${method === "pay_later" ? "pay_later" : unpaidCardStatus()}
        where id = ${orderId}
      `;
      if (method === "card") {
        const creds = await loadAlternativeCreds(sql);
        if (creds) {
          try {
            const due = new Date();
            due.setDate(due.getDate() + 30);
            const checkout = await createAlternativeCheckout(creds, {
              reference: `MT-${1000 + orderId}`,
              returnUrl: ALTERNATIVE_PORTAL,
              externalId: `mts-shop-${email}`,
              name,
              email,
              existingCustomerId: "",
              dueDate: due.toISOString().slice(0, 10),
              lines: lines.map((line) => ({ description: line.description, amount: line.amount, quantity: line.quantity })),
            });
            paymentUrl = checkout.url;
            await sql`
              update orders set payment_url = ${paymentUrl}, alternative_invoice_id = ${checkout.invoiceId},
                alternative_request_id = ${checkout.requestId}, payment_status = ${checkout.paymentStatus}
              where id = ${orderId}
            `;
          } catch {
            paymentUrl = ALTERNATIVE_PORTAL;
            await sql`update orders set payment_url = ${paymentUrl} where id = ${orderId}`;
          }
        }
      }
      await settleNewOrder(sql, orderId, "Sarah");
      const number = `MT-${1000 + orderId}`;
      await filePortalTicket(sql, {
        name,
        email,
        organizationId: orgId,
        subject: `Shop order ${number}`,
        category: "Hardware & Software",
        body: `Sarah placed ${items.map((item) => `${item.quantity} × ${item.sku}`).join(", ")} for ${name}.`,
      }).catch(() => undefined);
      await sql`
        insert into customer_notices (shop_customer_id, title, body, href)
        values (${id}, ${method === "pay_later" ? "Order invoiced" : "Order received"}, ${`${number} is ${method === "pay_later" ? "on invoice" : "waiting for payment"}.`}, ${`/portal/orders/${orderId}`})
      `;
      return json({
        placed: true,
        id: orderId,
        number,
        paymentMethod: method,
        paymentUrl,
        totalCents: subtotal + shippingCents,
        items: lines.map((line) => ({ sku: s(line.product, "sku"), name: line.description, quantity: line.quantity, unitPriceCents: n(line.product, "price_cents") })),
      });
    }
    if (parts[2] === "orders" && parts.length === 4 && request.method === "GET") {
      const orderId = Number(parts[3]);
      const orders = await sql<Row>`
        select o.*,
          coalesce((select sum(oi.quantity * oi.unit_price_cents)::int from order_items oi where oi.order_id = o.id), 0) as goods_cents
        from orders o
        where o.id = ${orderId} and (o.shop_customer_id = ${id} or lower(o.ship_email) = lower(${email}))
      `;
      if (!orders[0]) return json({ error: "That order is not on this account." }, 404);
      const item = orders[0];
      const lines = await sql<Row>`select product_name, sku, quantity, unit_price_cents from order_items where order_id = ${orderId} order by id`;
      return json({
        page: `/portal/orders/${orderId}`,
        id: n(item, "id"),
        number: `MT-${1000 + n(item, "id")}`,
        status: s(item, "status"),
        paymentMethod: s(item, "payment_method") || "unpaid",
        paymentStatus: s(item, "payment_status"),
        paymentUrl: s(item, "payment_url"),
        shipmentStatus: s(item, "shipment_status") || "unfulfilled",
        trackingNumber: s(item, "tracking_number"),
        trackingCarrier: s(item, "tracking_carrier"),
        totalCents: n(item, "goods_cents") + n(item, "shipping_cents"),
        items: lines.map((line) => ({
          name: s(line, "product_name"),
          sku: s(line, "sku"),
          quantity: n(line, "quantity"),
          unitPriceCents: n(line, "unit_price_cents"),
        })),
      });
    }

    if (parts[2] === "orders" && parts[4] === "pay" && request.method === "POST") {
      const orderId = Number(parts[3]);
      const orders = await sql<Row>`
        select o.*, coalesce((select sum(oi.quantity * oi.unit_price_cents)::int from order_items oi where oi.order_id = o.id), 0) as goods_cents
        from orders o
        where o.id = ${orderId} and (o.shop_customer_id = ${id} or lower(o.ship_email) = lower(${email}))
      `;
      const order = orders[0];
      if (!order) return json({ error: "That order is not on this account." }, 404);
      if (s(order, "payment_method") === "pay_later" || s(order, "payment_status") === "pay_later") {
        return json({ number: `MT-${1000 + orderId}`, paymentMethod: "pay_later", paymentUrl: "", note: "This order is invoiced. No card payment is due." });
      }
      let paymentUrl = s(order, "payment_url");
      if (!paymentUrl) {
        const lines = await sql<Row>`select product_name, quantity, unit_price_cents from order_items where order_id = ${orderId}`;
        const creds = await loadAlternativeCreds(sql);
        if (!creds) return json({ error: "Card checkout is not configured." }, 400);
        const due = new Date();
        due.setDate(due.getDate() + 30);
        const checkout = await createAlternativeCheckout(creds, {
          reference: `MT-${1000 + orderId}`,
          returnUrl: ALTERNATIVE_PORTAL,
          externalId: `mts-shop-${email}`,
          name,
          email,
          existingCustomerId: "",
          dueDate: due.toISOString().slice(0, 10),
          lines: lines.map((line) => ({ description: s(line, "product_name"), amount: n(line, "unit_price_cents") / 100, quantity: n(line, "quantity") })),
        });
        paymentUrl = checkout.url;
        await sql`update orders set payment_url = ${paymentUrl}, alternative_invoice_id = ${checkout.invoiceId}, alternative_request_id = ${checkout.requestId}, payment_status = ${checkout.paymentStatus} where id = ${orderId}`;
      }
      return json({ number: `MT-${1000 + orderId}`, paymentMethod: "card", paymentUrl, totalCents: n(order, "goods_cents") + n(order, "shipping_cents") });
    }

    if (parts[2] === "orders" && parts[4] === "cancel" && request.method === "POST") {
      const orderId = Number(parts[3]);
      const orders = await sql<Row>`select id, status, shipment_status from orders where id = ${orderId} and (shop_customer_id = ${id} or lower(ship_email) = lower(${email}))`;
      const order = orders[0];
      if (!order) return json({ error: "That order is not on this account." }, 404);
      if (["shipped", "out_for_delivery", "delivered"].includes(s(order, "shipment_status"))) return json({ error: "That order has already shipped." }, 400);
      await sql`update orders set status = 'cancelled', updated_at = now() where id = ${orderId}`;
      await setInventory(sql, orderId, "released");
      return json({ cancelled: true, number: `MT-${1000 + orderId}` });
    }

    if (parts[2] === "orders" && parts[4] === "delete" && request.method === "POST") {
      const orderId = Number(parts[3]);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      if (body.confirm !== true) return json({ error: "Confirm the delete before this order is removed." }, 400);
      const orders = await sql<Row>`select id from orders where id = ${orderId} and (shop_customer_id = ${id} or lower(ship_email) = lower(${email}))`;
      if (!orders[0]) return json({ error: "That order is not on this account." }, 404);
      await setInventory(sql, orderId, "released");
      await sql`delete from orders where id = ${orderId}`;
      return json({ deleted: true, number: `MT-${1000 + orderId}` });
    }

    if (parts[2] === "tickets" && parts[4] === "refresh" && request.method === "POST") {
      const ticketId = Number(parts[3]);
      return json(await syncCustomerTicket(sql, email, ticketId));
    }

    if (parts[2] === "tickets" && parts[4] === "close" && request.method === "POST") {
      const ticketId = Number(parts[3]);
      const tickets = await sql<Row>`select id from tickets where id = ${ticketId} and lower(requester_email) = lower(${email})`;
      if (!tickets[0]) return json({ error: "That ticket is not on this account." }, 404);
      await sql`update tickets set status = 'closed', updated_at = now() where id = ${ticketId}`;
      return json({ closed: true, ticketId });
    }

    if (parts[2] === "services" && parts[3] === "catalog" && request.method === "GET") {
      const rows = await sql<Row>`select id, category, name, kind, summary from service_catalog where active = true order by category, name`;
      return json(rows.map((item) => ({ id: n(item, "id"), category: s(item, "category"), name: s(item, "name"), kind: s(item, "kind"), summary: s(item, "summary") })));
    }

    if (parts[2] === "services" && parts[3] === "quote" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const details = clip(body.details, 2000);
      const serviceId = Number(body.serviceId);
      const nameQuery = clip(body.name, 120);
      if (!details) return json({ error: "Say what the quote should cover." }, 400);
      const items = Number.isInteger(serviceId) && serviceId > 0
        ? await sql<Row>`select * from service_catalog where id = ${serviceId} and active = true`
        : await sql<Row>`select * from service_catalog where active = true and name ilike ${"%" + nameQuery.replace(/%/g, "") + "%"} order by name limit 1`;
      const item = items[0];
      if (!item) return json({ error: "That service is not in the catalog." }, 404);
      const kind = s(item, "kind");
      if (!elevated && kind === "phone" && !flags.canOrderPhone) return json({ error: "Phone and internet ordering is not approved for this account." }, 403);
      if (!elevated && kind !== "phone" && !flags.canOrderIt) return json({ error: "IT service ordering is not approved for this account." }, 403);
      const inserted = await sql<Row>`
        insert into service_requests (shop_customer_id, organization_id, category, service_name, details, severity, status)
        values (${id}, ${orgId}, ${s(item, "category")}, ${s(item, "name")}, ${details}, ${clip(body.severity, 20) || "normal"}, 'requested')
        returning id
      `;
      const ticket = await filePortalTicket(sql, {
        name,
        email,
        organizationId: orgId,
        subject: `Service request: ${s(item, "name")}`,
        category: s(item, "category"),
        body: details,
      });
      return json({ id: n(inserted[0], "id"), status: "requested", ticketId: ticket.ticketId, zendeskId: ticket.zendeskId, service: s(item, "name") });
    }

    if (parts[2] === "services" && parts.length === 3 && request.method === "GET") {
      const rows = await sql<Row>`select id, category, service_name, details, severity, status, quote_note, created_at from service_requests where shop_customer_id = ${id} order by created_at desc`;
      return json(rows.map((item) => ({
        id: n(item, "id"),
        category: s(item, "category"),
        serviceName: s(item, "service_name"),
        details: s(item, "details"),
        severity: s(item, "severity"),
        status: s(item, "status"),
        quoteNote: s(item, "quote_note"),
        createdAt: s(item, "created_at"),
      })));
    }
    if (parts[2] === "services" && parts.length === 3 && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const offering = clip(body.offering, 40) as keyof typeof OFFERINGS;
      if (!(offering in OFFERINGS)) return json({ error: "Choose a service." }, 400);
      const phoneService = offering.startsWith("voip") || offering.startsWith("fax");
      if (phoneService && !flags.canOrderPhone && !elevated) return json({ error: "This account cannot order phone service." }, 403);
      if (!phoneService && !flags.canOrderIt && !elevated) return json({ error: "This account cannot order that service." }, 403);
      const site = clip(body.site, 200);
      const recipientEmail = clip(body.recipientEmail, 160).toLowerCase();
      const drops = Math.min(50, Math.max(1, Number(body.drops) || 1));
      if (offering === "voip-ext" && body.confirmMonthly !== true) return json({ error: "Confirm the $18 monthly extension before this is sent." }, 400);
      if (offering === "fax-efax" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return json({ error: "Enter the email that should receive incoming faxes." }, 400);
      if ((offering === "network" || offering.startsWith("internet")) && !site) return json({ error: "Enter the office address." }, 400);
      const label = OFFERINGS[offering];
      const detail = [
        `Service: ${label}`,
        site ? `Site: ${site}` : "",
        recipientEmail ? `Incoming fax email: ${recipientEmail}` : "",
        offering === "voip-ext" ? "Customer confirmed $18 per month on the Telxent bill." : "",
        body.shipPhone === true ? "Ship a desk phone." : "",
        offering === "wiring" ? `Drops: ${drops} at $175 each.` : "",
        clip(body.notes, 1000),
      ].filter(Boolean).join("\n");
      const inserted = await sql<Row>`
        insert into service_requests (shop_customer_id, organization_id, category, service_name, details, severity, status)
        values (${id}, ${orgId}, ${offering}, ${label}, ${detail}, 'normal', 'requested')
        returning id
      `;
      const ticket = await filePortalTicket(sql, { name, email, organizationId: orgId, subject: `Order: ${label}`, category: offering, body: detail });
      return json({ id: n(inserted[0], "id"), ticketId: ticket.ticketId, zendeskId: ticket.zendeskId });
    }

    if (parts[2] === "quotes" && request.method === "POST") {
      const requestId = Number(parts[3]);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const decision = clip(body.decision, 20);
      if (decision !== "accepted" && decision !== "rejected") return json({ error: "Accept or reject the quote." }, 400);
      const rows = await sql<Row>`select id, status from service_requests where id = ${requestId} and shop_customer_id = ${id}`;
      if (!rows[0]) return json({ error: "That request is not on this account." }, 404);
      if (s(rows[0], "status") !== "quoted") return json({ error: "Only a quoted request can be accepted or rejected." }, 400);
      await sql`update service_requests set status = ${decision} where id = ${requestId}`;
      return json({ status: decision });
    }

    if (parts[2] === "complaints" && request.method === "GET") {
      const rows = await sql<Row>`select id, kind, subject, body, status, ticket_id, created_at from complaints where shop_customer_id = ${id} order by id desc limit 30`;
      return json(rows.map((item) => ({
        id: n(item, "id"),
        kind: s(item, "kind"),
        subject: s(item, "subject"),
        body: s(item, "body"),
        status: s(item, "status"),
        ticketId: n(item, "ticket_id"),
        createdAt: s(item, "created_at"),
      })));
    }
    if (parts[2] === "complaints" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const subject = clip(body.subject, 160);
      const text = clip(body.body, 2000);
      const kind = clip(body.kind, 40) || "General feedback";
      if (!subject || !text) return json({ error: "Describe the complaint." }, 400);
      const ticket = await filePortalTicket(sql, { name, email, organizationId: orgId, subject: `Complaint: ${subject}`, category: kind, body: text });
      const inserted = await sql<Row>`
        insert into complaints (shop_customer_id, organization_id, kind, subject, body, status, ticket_id)
        values (${id}, ${orgId}, ${kind}, ${subject}, ${text}, 'open', ${ticket.ticketId})
        returning id
      `;
      return json({ id: n(inserted[0], "id"), ticketId: ticket.ticketId, zendeskId: ticket.zendeskId });
    }

    if (parts[2] === "notices" && parts.length === 3 && request.method === "GET") {
      const rows = await sql<Row>`select id, title, body, href, read_at, created_at from customer_notices where shop_customer_id = ${id} order by id desc limit 40`;
      return json(rows.map((item) => ({
        id: n(item, "id"),
        title: s(item, "title"),
        body: s(item, "body"),
        href: s(item, "href"),
        read: Boolean(s(item, "read_at")),
        createdAt: s(item, "created_at"),
      })));
    }
    if (parts[2] === "notices" && parts[4] === "read" && request.method === "POST") {
      const noticeId = Number(parts[3]);
      await sql`update customer_notices set read_at = now() where id = ${noticeId} and shop_customer_id = ${id} and read_at is null`;
      return json({ ok: true });
    }

    return json({ error: "Unknown path. See /api/openapi.json." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The agent call failed.";
    return json({ error: message }, 500);
  }
}
