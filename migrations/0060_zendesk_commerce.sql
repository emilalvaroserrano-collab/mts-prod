alter table products add column if not exists zendesk_record_id text not null default '';
alter table orders add column if not exists zendesk_order_id text not null default '';
alter table orders add column if not exists zendesk_payment_id text not null default '';
