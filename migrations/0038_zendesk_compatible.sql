alter table organizations add column if not exists details text not null default '';
alter table organizations add column if not exists tags text not null default '';
alter table organizations add column if not exists external_id text not null default '';
alter table organizations add column if not exists shared_tickets boolean not null default false;
alter table organizations add column if not exists shared_comments boolean not null default false;

alter table customer_users add column if not exists phone text not null default '';
alter table customer_users add column if not exists notes text not null default '';
alter table customer_users add column if not exists tags text not null default '';
alter table customer_users add column if not exists external_id text not null default '';
alter table customer_users add column if not exists zendesk_role text not null default 'end-user';

alter table shop_customers add column if not exists notes text not null default '';
alter table shop_customers add column if not exists tags text not null default '';
alter table shop_customers add column if not exists external_id text not null default '';

alter table portal_staff add column if not exists phone text not null default '';
alter table portal_staff add column if not exists tags text not null default '';
alter table portal_staff add column if not exists external_id text not null default '';

alter table tickets add column if not exists channel text not null default '';
alter table tickets add column if not exists external_id text not null default '';

alter table ticket_comments add column if not exists author_email text not null default '';
