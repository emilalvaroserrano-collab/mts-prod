import type { Sql } from "@/lib/db";

type Row = Record<string, unknown>;
type Call = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function s(row: Row | undefined, key: string) {
  const value = row?.[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function n(row: Row | undefined, key: string) {
  const value = Number(row?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function obj(value: unknown): Row {
  return value && typeof value === "object" ? (value as Row) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

let ready: Promise<void> | null = null;

async function ignoreConflict(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/422|409|already|taken|duplicate/i.test(message)) throw error;
  }
}

export function ensureCommerce(call: Call) {
  ready ??= (async () => {
    const userFields = [
      ["mts_address", "Billing address"],
      ["mts_city", "Billing city"],
      ["mts_region", "Billing state"],
      ["mts_postal", "Billing postal code"],
      ["mts_country", "Billing country"],
    ];
    for (const [key, title] of userFields) {
      await ignoreConflict(() =>
        call("/user_fields.json", {
          method: "POST",
          body: JSON.stringify({ user_field: { type: "text", key, title, active: true } }),
        }),
      );
    }
    await ignoreConflict(() =>
      call("/custom_objects", {
        method: "POST",
        body: JSON.stringify({ custom_object: { key: "mts_product", title: "Product", title_pluralized: "Products" } }),
      }),
    );
    await ignoreConflict(() =>
      call("/custom_objects", {
        method: "POST",
        body: JSON.stringify({ custom_object: { key: "mts_order", title: "Order", title_pluralized: "Orders" } }),
      }),
    );
    await ignoreConflict(() =>
      call("/custom_objects", {
        method: "POST",
        body: JSON.stringify({ custom_object: { key: "mts_payment", title: "Payment", title_pluralized: "Payments" } }),
      }),
    );
    const fields: [string, string, string, string][] = [
      ["mts_product", "sku", "SKU", "text"],
      ["mts_product", "category", "Category", "text"],
      ["mts_product", "description", "Description", "textarea"],
      ["mts_product", "price_cents", "Price cents", "integer"],
      ["mts_product", "available", "Available", "text"],
      ["mts_product", "image_url", "Image", "textarea"],
      ["mts_order", "status", "Status", "text"],
      ["mts_order", "email", "Email", "text"],
      ["mts_order", "total_cents", "Total cents", "integer"],
      ["mts_order", "payment_status", "Payment status", "text"],
      ["mts_order", "payment_method", "Payment method", "text"],
      ["mts_order", "shipment_status", "Shipment status", "text"],
      ["mts_order", "ship_address", "Ship address", "textarea"],
      ["mts_order", "items", "Items", "textarea"],
      ["mts_payment", "order_number", "Order number", "text"],
      ["mts_payment", "status", "Status", "text"],
      ["mts_payment", "method", "Method", "text"],
      ["mts_payment", "amount_cents", "Amount cents", "integer"],
      ["mts_payment", "reference", "Reference", "text"],
    ];
    for (const [objectKey, key, title, type] of fields) {
      await ignoreConflict(() =>
        call(`/custom_objects/${objectKey}/fields`, {
          method: "POST",
          body: JSON.stringify({ custom_object_field: { key, title, type } }),
        }),
      );
    }
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function listRecords(call: Call, key: string) {
  const rows: Row[] = [];
  let path = `/custom_objects/${key}/records?page[size]=100`;
  const seen = new Set<string>();
  for (let page = 0; page < 100 && path; page += 1) {
    if (seen.has(path)) break;
    seen.add(path);
    const payload = await call(path);
    if (Array.isArray(payload.custom_object_records)) rows.push(...payload.custom_object_records.map(obj));
    const meta = obj(payload.meta);
    const links = obj(payload.links);
    if (typeof meta.has_more === "boolean") {
      path = meta.has_more && typeof links.next === "string" ? links.next : "";
      continue;
    }
    path = typeof payload.next_page === "string" ? payload.next_page : "";
  }
  return rows;
}

async function saveRecord(call: Call, key: string, externalId: string, name: string, fields: Row, currentId: string) {
  const body = { custom_object_record: { name, external_id: externalId, custom_object_fields: fields } };
  if (currentId) {
    const saved = await call(`/custom_objects/${key}/records/${encodeURIComponent(currentId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return text(obj(saved.custom_object_record).id) || currentId;
  }
  const saved = await call(`/custom_objects/${key}/records`, { method: "POST", body: JSON.stringify(body) });
  return text(obj(saved.custom_object_record).id);
}

async function deskOrg(sql: Sql) {
  const found = await sql<Row>`select id from organizations where name = 'Manage Tech Service' order by id limit 1`;
  if (found[0]) return n(found[0], "id");
  const created = await sql<Row>`
    insert into organizations (name, notes, portal_access, ordering_enabled)
    values ('Manage Tech Service', 'Company desk.', true, true)
    returning id
  `;
  return n(created[0], "id");
}

function orderNumber(id: number) {
  return `MT-${1000 + id}`;
}

function orderIdFromNumber(value: string) {
  const match = /^MT-(\d+)$/.exec(value.trim());
  if (!match) return 0;
  return Math.max(0, Number(match[1]) - 1000);
}

async function orderTotal(sql: Sql, orderId: number) {
  const rows = await sql<Row>`
    select coalesce(sum(quantity * unit_price_cents), 0)::int as items, coalesce(max(shipping_cents), 0)::int as shipping
    from orders o
    left join order_items i on i.order_id = o.id
    where o.id = ${orderId}
  `;
  return n(rows[0], "items") + n(rows[0], "shipping");
}

async function orderItemsText(sql: Sql, orderId: number) {
  const rows = await sql<Row>`select product_name, sku, quantity from order_items where order_id = ${orderId} order by id`;
  return rows.map((row) => `${n(row, "quantity")} x ${s(row, "product_name") || s(row, "sku")}`).join(", ");
}

export async function pushProduct(sql: Sql, productId: number, call: Call) {
  await ensureCommerce(call);
  const rows = await sql<Row>`select * from products where id = ${productId} limit 1`;
  const product = rows[0];
  if (!product) return;
  const image = s(product, "image_url").startsWith("http") ? s(product, "image_url") : "";
  const recordId = await saveRecord(
    call,
    "mts_product",
    s(product, "sku"),
    s(product, "name"),
    {
      sku: s(product, "sku"),
      category: s(product, "category"),
      description: s(product, "description").slice(0, 4000),
      price_cents: n(product, "price_cents"),
      available: product.available === false ? "hidden" : "available",
    },
    s(product, "zendesk_record_id"),
  );
  if (recordId) await sql`update products set zendesk_record_id = ${recordId} where id = ${productId}`;
  if (recordId && image) {
    await call(`/custom_objects/mts_product/records/${encodeURIComponent(recordId)}`, {
      method: "PATCH",
      body: JSON.stringify({ custom_object_record: { custom_object_fields: { image_url: image } } }),
    }).catch(() => undefined);
  }
}

export async function pushOrder(sql: Sql, orderId: number, call: Call) {
  await ensureCommerce(call);
  const rows = await sql<Row>`select * from orders where id = ${orderId} limit 1`;
  const order = rows[0];
  if (!order) return;
  const number = orderNumber(orderId);
  const total = await orderTotal(sql, orderId);
  const items = await orderItemsText(sql, orderId);
  const address = [s(order, "ship_address"), s(order, "ship_city"), s(order, "ship_region"), s(order, "ship_postal"), s(order, "ship_country")]
    .filter(Boolean)
    .join(", ");
  const orderRecord = await saveRecord(
    call,
    "mts_order",
    number,
    number,
    {
      status: s(order, "status") || "pending",
      email: s(order, "ship_email"),
      total_cents: total,
      payment_status: s(order, "payment_status"),
      payment_method: s(order, "payment_method"),
      shipment_status: s(order, "shipment_status") || "unfulfilled",
      ship_address: address,
      items,
    },
    s(order, "zendesk_order_id"),
  );
  const reference = s(order, "alternative_invoice_id") || s(order, "card_last4");
  const paymentRecord = await saveRecord(
    call,
    "mts_payment",
    `pay-${number}`,
    `Payment ${number}`,
    {
      order_number: number,
      status: s(order, "payment_status") || "unpaid",
      method: s(order, "payment_method"),
      amount_cents: total,
      reference,
    },
    s(order, "zendesk_payment_id"),
  );
  await sql`
    update orders set zendesk_order_id = ${orderRecord}, zendesk_payment_id = ${paymentRecord}
    where id = ${orderId}
  `;
}

async function pullProducts(sql: Sql, call: Call) {
  const records = await listRecords(call, "mts_product");
  let count = 0;
  for (const record of records) {
    const fields = obj(record.custom_object_fields);
    const sku = text(fields.sku) || text(record.external_id);
    const name = text(record.name);
    if (!sku || !name || sku === "mts-probe") continue;
    const recordId = text(record.id);
    const existing = await sql<Row>`select id from products where zendesk_record_id = ${recordId} or sku = ${sku} limit 1`;
    const available = text(fields.available) !== "hidden";
    const price = Number(fields.price_cents);
    const priceCents = Number.isFinite(price) ? price : 0;
    if (existing[0]) {
      await sql`
        update products set
          sku = ${sku},
          name = ${name},
          category = ${text(fields.category)},
          description = ${text(fields.description)},
          price_cents = ${priceCents},
          available = ${available},
          zendesk_record_id = ${recordId}
        where id = ${n(existing[0], "id")}
      `;
    } else {
      await sql`
        insert into products (sku, name, category, description, price_cents, available, image_url, zendesk_record_id)
        values (${sku}, ${name}, ${text(fields.category)}, ${text(fields.description)}, ${priceCents}, ${available}, ${text(fields.image_url).startsWith("http") ? text(fields.image_url) : ""}, ${recordId})
      `;
    }
    count += 1;
  }
  return count;
}

async function pullOrders(sql: Sql, call: Call) {
  const records = await listRecords(call, "mts_order");
  let count = 0;
  const organizationId = records.length ? await deskOrg(sql) : 0;
  for (const record of records) {
    const fields = obj(record.custom_object_fields);
    const number = text(record.external_id) || text(record.name);
    const id = orderIdFromNumber(number);
    if (!id) continue;
    const existing = await sql<Row>`select id from orders where id = ${id} limit 1`;
    const recordId = text(record.id);
    if (existing[0]) {
      await sql`
        update orders set
          status = ${text(fields.status) || "pending"},
          payment_status = ${text(fields.payment_status)},
          payment_method = ${text(fields.payment_method)},
          shipment_status = ${text(fields.shipment_status) || "unfulfilled"},
          zendesk_order_id = ${recordId}
        where id = ${id}
      `;
    } else {
      await sql`
        insert into orders (
          id, organization_id, status, ship_email, payment_status, payment_method, shipment_status, notes, zendesk_order_id
        ) values (
          ${id}, ${organizationId}, ${text(fields.status) || "pending"}, ${text(fields.email)},
          ${text(fields.payment_status)}, ${text(fields.payment_method)}, ${text(fields.shipment_status) || "unfulfilled"},
          ${text(fields.items)}, ${recordId}
        )
      `;
      await sql`select setval(pg_get_serial_sequence('orders', 'id'), (select max(id) from orders))`.catch(() => undefined);
    }
    count += 1;
  }
  return count;
}

async function pullPayments(sql: Sql, call: Call) {
  const records = await listRecords(call, "mts_payment");
  let count = 0;
  for (const record of records) {
    const fields = obj(record.custom_object_fields);
    const id = orderIdFromNumber(text(fields.order_number));
    if (!id) continue;
    const existing = await sql<Row>`select id from orders where id = ${id} limit 1`;
    if (!existing[0]) continue;
    await sql`
      update orders set
        payment_status = ${text(fields.status)},
        payment_method = ${text(fields.method)},
        alternative_invoice_id = case when ${text(fields.reference)} <> '' then ${text(fields.reference)} else alternative_invoice_id end,
        zendesk_payment_id = ${text(record.id)}
      where id = ${id}
    `;
    count += 1;
  }
  return count;
}

export async function syncCommerce(sql: Sql, call: Call) {
  await ensureCommerce(call);
  const products = await pullProducts(sql, call);
  const orders = await pullOrders(sql, call);
  const payments = await pullPayments(sql, call);
  const localProducts = await sql<Row>`select id from products where zendesk_record_id = ''`;
  for (const product of localProducts) await pushProduct(sql, n(product, "id"), call);
  const localOrders = await sql<Row>`select id from orders where zendesk_order_id = '' or zendesk_payment_id = ''`;
  for (const order of localOrders) await pushOrder(sql, n(order, "id"), call);
  return { products, orders, payments };
}

async function zendeskUser(sql: Sql, customerId: number, call: Call) {
  const rows = await sql<Row>`select * from shop_customers where id = ${customerId} limit 1`;
  const customer = rows[0];
  if (!customer) return null;
  let userId = s(customer, "zendesk_user_id");
  if (!userId) {
    const found = await call(`/users/search.json?query=${encodeURIComponent(`type:user email:${s(customer, "email")}`)}`);
    const match = (Array.isArray(found.users) ? found.users : []).map(obj).find((user) => s(user, "email").toLowerCase() === s(customer, "email"));
    userId = match ? text(match.id) : "";
    if (userId) await sql`update shop_customers set zendesk_user_id = ${userId} where id = ${customerId}`;
  }
  if (!userId) return { customer, user: null };
  const payload = await call(`/users/${encodeURIComponent(userId)}.json`);
  return { customer, user: obj(payload.user) };
}

export async function syncBillingAddress(sql: Sql, customerId: number, call: Call) {
  await ensureCommerce(call);
  const loaded = await zendeskUser(sql, customerId, call);
  if (!loaded?.user) return;
  const fields = obj(loaded.user.user_fields);
  const remote = {
    address: text(fields.mts_address),
    city: text(fields.mts_city),
    region: text(fields.mts_region),
    postal: text(fields.mts_postal),
    country: text(fields.mts_country),
  };
  const local = {
    address: s(loaded.customer, "address"),
    city: s(loaded.customer, "city"),
    region: s(loaded.customer, "region"),
    postal: s(loaded.customer, "postal"),
    country: s(loaded.customer, "country"),
  };
  const pulled = {
    address: remote.address || local.address,
    city: remote.city || local.city,
    region: remote.region || local.region,
    postal: remote.postal || local.postal,
    country: remote.country || local.country || "United States",
  };
  await sql`
    update shop_customers set
      address = ${pulled.address},
      city = ${pulled.city},
      region = ${pulled.region},
      postal = ${pulled.postal},
      country = ${pulled.country}
    where id = ${customerId}
  `;
  const missing = (Object.keys(remote) as (keyof typeof remote)[]).some((key) => !remote[key] && pulled[key]);
  if (!missing) return;
  await call(`/users/${encodeURIComponent(text(loaded.user.id))}.json`, {
    method: "PUT",
    body: JSON.stringify({
      user: {
        user_fields: {
          mts_address: pulled.address,
          mts_city: pulled.city,
          mts_region: pulled.region,
          mts_postal: pulled.postal,
          mts_country: pulled.country,
        },
      },
    }),
  });
}

export async function pushBillingAddress(sql: Sql, customerId: number, call: Call) {
  await ensureCommerce(call);
  const loaded = await zendeskUser(sql, customerId, call);
  if (!loaded?.user) return;
  await call(`/users/${encodeURIComponent(text(loaded.user.id))}.json`, {
    method: "PUT",
    body: JSON.stringify({
      user: {
        user_fields: {
          mts_address: s(loaded.customer, "address"),
          mts_city: s(loaded.customer, "city"),
          mts_region: s(loaded.customer, "region"),
          mts_postal: s(loaded.customer, "postal"),
          mts_country: s(loaded.customer, "country") || "United States",
        },
      },
    }),
  });
}
