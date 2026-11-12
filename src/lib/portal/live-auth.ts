import { getSql } from "@/lib/db";

type Row = Record<string, unknown>;

export async function customerIdForShopToken(token: string) {
  const value = token.trim().slice(0, 80);
  if (!value) return 0;
  const sql = await getSql();
  const rows = await sql<Row>`
    select id from shop_customers
    where session_token = ${value} and session_expires > now()
    limit 1
  `;
  const id = Number(rows[0]?.id ?? 0);
  return Number.isFinite(id) ? id : 0;
}
