create table if not exists oauth_clients (
  client_id text primary key,
  name text not null,
  secret text not null,
  grant_type text not null default 'authorization_code',
  scopes text not null default 'read write'
);

create table if not exists oauth_codes (
  code text primary key,
  client_id text not null,
  redirect_uri text not null,
  scope text not null default '',
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists oauth_tokens (
  token text primary key,
  kind text not null default 'access',
  client_id text not null,
  scope text not null default '',
  expires_at timestamptz not null,
  refresh_token text not null default ''
);

insert into oauth_clients (client_id, name, secret, grant_type, scopes)
values (
  'mts-auth',
  'mts-auth',
  '7f3c1a9e4b28d6c04a51e8f27b90c3d6a14e5f82c7b09d31e6a4c8f25b17d903',
  'authorization_code',
  'read write'
)
on conflict (client_id) do update set
  name = excluded.name,
  grant_type = excluded.grant_type,
  scopes = excluded.scopes,
  secret = case when oauth_clients.secret = '' then excluded.secret else oauth_clients.secret end;
