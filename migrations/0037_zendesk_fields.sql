alter table tickets add column if not exists ticket_type text not null default '';
alter table tickets add column if not exists group_name text not null default '';
