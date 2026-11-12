import { readFileSync } from "node:fs";
import pg from "pg";

const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const index = line.indexOf("=");
  env[line.slice(0, index)] = line.slice(index + 1);
}

const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function token() {
  const response = await fetch("https://mts-portal.zendesk.com/oauth/tokens", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.ZENDESK_OAUTH_CLIENT_ID,
      client_secret: env.ZENDESK_OAUTH_CLIENT_SECRET,
      scope: env.ZENDESK_OAUTH_SCOPES || "read write",
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error_description || "Zendesk token failed.");
  return body.access_token;
}

const access = await token();

async function zendesk(path) {
  const url = path.startsWith("http") ? path : `https://mts-portal.zendesk.com/api/v2${path}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${access}`, Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 180)}`);
  return text ? JSON.parse(text) : {};
}

async function eachPage(start, visit) {
  let next = start;
  const seen = new Set();
  for (let page = 0; page < 100 && next; page += 1) {
    if (seen.has(next)) break;
    seen.add(next);
    const payload = await zendesk(next);
    await visit(payload);
    const meta = payload.meta || {};
    const links = payload.links || {};
    if (typeof meta.has_more === "boolean") next = meta.has_more && links.next && links.next !== next ? links.next : "";
    else next = payload.next_page && payload.next_page !== next ? payload.next_page : "";
  }
}

async function pages(primary, fallback, visit) {
  try {
    await eachPage(primary, visit);
  } catch (error) {
    if (!fallback) throw error;
    await eachPage(fallback, visit);
  }
}

function statusOf(value) {
  if (value === "hold") return "pending";
  return ["new", "open", "pending", "solved", "closed"].includes(value) ? value : "open";
}

await pool.query(`
  alter table products add column if not exists zendesk_record_id text not null default '';
  alter table orders add column if not exists zendesk_order_id text not null default '';
  alter table orders add column if not exists zendesk_payment_id text not null default '';
`);

const counts = { organizations: 0, users: 0, tickets: 0, comments: 0, products: 0, orders: 0, payments: 0, billing: 0 };

await pages("/organizations.json?page[size]=100", "/organizations.json?per_page=100", async (payload) => {
  for (const org of payload.organizations || []) {
    if (!org.id || !org.name) continue;
    const domain = Array.isArray(org.domain_names) ? org.domain_names[0] || "" : "";
    const existing = await pool.query("select id from organizations where zendesk_org_id = $1 limit 1", [String(org.id)]);
    if (!existing.rows[0]) {
      const byName = await pool.query("select id, zendesk_org_id from organizations where lower(name) = lower($1) limit 1", [org.name]);
      if (byName.rows[0] && !byName.rows[0].zendesk_org_id) {
        await pool.query("update organizations set zendesk_org_id = $1 where id = $2", [String(org.id), byName.rows[0].id]);
      } else if (!byName.rows[0]) {
        await pool.query(
          "insert into organizations (name, domain, zendesk_org_id, notes) values ($1, $2, $3, 'Imported from Zendesk.')",
          [org.name.slice(0, 160), domain.slice(0, 160), String(org.id)],
        );
      }
    }
    counts.organizations += 1;
  }
});

const orgMap = new Map(
  (await pool.query("select id, zendesk_org_id from organizations where zendesk_org_id <> ''")).rows.map((row) => [row.zendesk_org_id, row.id]),
);

await pages("/users.json?page[size]=100", "/users.json?per_page=100", async (payload) => {
  for (const user of payload.users || []) {
    const email = String(user.email || "").trim().toLowerCase();
    if (!email || user.active === false || user.suspended === true) continue;
    if (!["end-user", "agent", "admin"].includes(user.role)) continue;
    const fields = user.user_fields || {};
    const organizationId = user.organization_id != null ? orgMap.get(String(user.organization_id)) ?? null : null;
    const existing = await pool.query("select id from shop_customers where lower(email) = $1 limit 1", [email]);
    if (existing.rows[0]) {
      await pool.query(
        `update shop_customers set
          name = $1,
          phone = case when $2 <> '' then $2 else phone end,
          zendesk_user_id = $3,
          email_verified = true,
          organization_id = coalesce($4, organization_id),
          address = case when $5 <> '' then $5 else address end,
          city = case when $6 <> '' then $6 else city end,
          region = case when $7 <> '' then $7 else region end,
          postal = case when $8 <> '' then $8 else postal end,
          country = case when $9 <> '' then $9 else country end
        where id = $10`,
        [
          user.name || email,
          user.phone || "",
          String(user.id),
          organizationId,
          fields.mts_address || "",
          fields.mts_city || "",
          fields.mts_region || "",
          fields.mts_postal || "",
          fields.mts_country || "",
          existing.rows[0].id,
        ],
      );
    } else {
      await pool.query(
        `insert into shop_customers (
          email, name, phone, password_hash, organization_id, role_id, email_verified, zendesk_user_id,
          grant_shop, address, city, region, postal, country
        ) values ($1,$2,$3,$4,$5,'buyer',true,$6,true,$7,$8,$9,$10,$11)`,
        [
          email,
          user.name || email,
          user.phone || "",
          `zendesk:${user.id}`,
          organizationId,
          String(user.id),
          fields.mts_address || "",
          fields.mts_city || "",
          fields.mts_region || "",
          fields.mts_postal || "",
          fields.mts_country || "United States",
        ],
      );
    }
    if (fields.mts_address || fields.mts_city || fields.mts_region || fields.mts_postal || fields.mts_country) counts.billing += 1;
    counts.users += 1;
  }
});

const userNames = new Map();
await pages("/tickets.json?page[size]=100&include=users,organizations", "/tickets.json?per_page=100", async (payload) => {
  for (const user of payload.users || []) userNames.set(String(user.id), user);
  for (const ticket of payload.tickets || []) {
    if (ticket.id == null || typeof ticket.subject !== "string") continue;
    const requester = userNames.get(String(ticket.requester_id)) || {};
    const assignee = userNames.get(String(ticket.assignee_id)) || {};
    const organizationId = ticket.organization_id != null ? orgMap.get(String(ticket.organization_id)) ?? null : null;
    const saved = await pool.query(
      `insert into tickets (
        zendesk_id, subject, status, priority, organization_id, requester_name, requester_email, assignee, tags, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
      on conflict (zendesk_id) do update set
        subject = excluded.subject,
        status = excluded.status,
        priority = excluded.priority,
        organization_id = coalesce(excluded.organization_id, tickets.organization_id),
        requester_name = case when excluded.requester_name <> '' then excluded.requester_name else tickets.requester_name end,
        requester_email = case when excluded.requester_email <> '' then excluded.requester_email else tickets.requester_email end,
        assignee = case when excluded.assignee <> '' then excluded.assignee else tickets.assignee end,
        tags = excluded.tags,
        updated_at = now()
      returning id`,
      [
        String(ticket.id),
        ticket.subject,
        statusOf(ticket.status),
        ticket.priority || "normal",
        organizationId,
        requester.name || "",
        requester.email || "",
        assignee.name || "",
        Array.isArray(ticket.tags) ? ticket.tags.join(",") : "",
      ],
    );
    const ticketId = saved.rows[0].id;
    try {
      await eachPage(`/tickets/${ticket.id}/comments.json?page[size]=100&include=users`, async (page) => {
        for (const user of page.users || []) userNames.set(String(user.id), user);
        for (const comment of page.comments || []) {
          if (comment.id == null || !String(comment.body || "").trim()) continue;
          const author = userNames.get(String(comment.author_id));
          const found = await pool.query("select id from ticket_comments where zendesk_comment_id = $1 limit 1", [String(comment.id)]);
          if (found.rows[0]) continue;
          await pool.query(
            `insert into ticket_comments (ticket_id, author_name, body, public_note, created_at, zendesk_comment_id)
             values ($1,$2,$3,$4,coalesce($5::timestamptz, now()),$6)`,
            [ticketId, author?.name || "Requester", String(comment.body).slice(0, 8000), comment.public !== false, comment.created_at || null, String(comment.id)],
          );
          counts.comments += 1;
        }
      });
    } catch {
      /* one ticket's comments should not stop the rest */
    }
    counts.tickets += 1;
  }
});

async function records(key) {
  const rows = [];
  await eachPage(`/custom_objects/${key}/records?page[size]=100`, async (payload) => {
    rows.push(...(payload.custom_object_records || []));
  });
  return rows;
}

for (const record of await records("mts_product").catch(() => [])) {
  const fields = record.custom_object_fields || {};
  const sku = fields.sku || record.external_id;
  if (!sku || !record.name || sku === "mts-probe") continue;
  const existing = await pool.query("select id from products where zendesk_record_id = $1 or sku = $2 limit 1", [record.id, sku]);
  const values = [sku, record.name, fields.category || "", fields.description || "", Number(fields.price_cents) || 0, fields.available !== "hidden", record.id];
  if (existing.rows[0]) {
    await pool.query(
      "update products set sku=$1, name=$2, category=$3, description=$4, price_cents=$5, available=$6, zendesk_record_id=$7 where id=$8",
      [...values, existing.rows[0].id],
    );
  } else {
    await pool.query(
      "insert into products (sku, name, category, description, price_cents, available, zendesk_record_id) values ($1,$2,$3,$4,$5,$6,$7)",
      values,
    );
  }
  counts.products += 1;
}

const desk = await pool.query("select id from organizations order by id limit 1");
const deskId = desk.rows[0]?.id;
for (const record of await records("mts_order").catch(() => [])) {
  const match = /^MT-(\d+)$/.exec(record.external_id || record.name || "");
  if (!match || !deskId) continue;
  const id = Number(match[1]) - 1000;
  const fields = record.custom_object_fields || {};
  const existing = await pool.query("select id from orders where id = $1", [id]);
  if (existing.rows[0]) {
    await pool.query(
      "update orders set status=$1, payment_status=$2, payment_method=$3, shipment_status=$4, zendesk_order_id=$5 where id=$6",
      [fields.status || "pending", fields.payment_status || "", fields.payment_method || "", fields.shipment_status || "unfulfilled", record.id, id],
    );
  } else {
    await pool.query(
      `insert into orders (id, organization_id, status, ship_email, payment_status, payment_method, shipment_status, notes, zendesk_order_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, deskId, fields.status || "pending", fields.email || "", fields.payment_status || "", fields.payment_method || "", fields.shipment_status || "unfulfilled", fields.items || "", record.id],
    );
    await pool.query("select setval(pg_get_serial_sequence('orders','id'), (select max(id) from orders))");
  }
  counts.orders += 1;
}

for (const record of await records("mts_payment").catch(() => [])) {
  const fields = record.custom_object_fields || {};
  const match = /^MT-(\d+)$/.exec(fields.order_number || "");
  if (!match) continue;
  const id = Number(match[1]) - 1000;
  const existing = await pool.query("select id from orders where id = $1", [id]);
  if (!existing.rows[0]) continue;
  await pool.query(
    "update orders set payment_status=$1, payment_method=$2, zendesk_payment_id=$3 where id=$4",
    [fields.status || "", fields.method || "", record.id, id],
  );
  counts.payments += 1;
}

console.log(JSON.stringify(counts));
await pool.end();
