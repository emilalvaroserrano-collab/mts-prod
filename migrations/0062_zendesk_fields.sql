create table if not exists zendesk_fields (
  zendesk_id text primary key,
  key text not null default '',
  title text not null,
  description text not null default '',
  field_type text not null default 'text',
  required boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  system_field boolean not null default false,
  portal_visible boolean not null default false,
  options_json text not null default '[]'
);

create table if not exists zendesk_forms (
  zendesk_id text primary key,
  name text not null,
  active boolean not null default true,
  end_user_visible boolean not null default true,
  is_default boolean not null default false,
  position integer not null default 0,
  field_ids text not null default ''
);

alter table integration_settings add column if not exists fields_synced_at timestamptz;
