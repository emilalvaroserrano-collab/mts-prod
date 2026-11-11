alter table integration_settings add column if not exists conversations_app_id text not null default '';
alter table integration_settings add column if not exists conversations_key_id text not null default '';
alter table integration_settings add column if not exists conversations_secret text not null default '';
alter table integration_settings add column if not exists webhook_id text not null default '';
alter table integration_settings add column if not exists webhook_secret text not null default '';

insert into integration_settings (
  id, subdomain, email, api_token, oauth_client_id, oauth_client_secret, oauth_scopes,
  conversations_app_id, conversations_key_id, conversations_secret, webhook_id, webhook_secret,
  last_status, last_error
) values (
  1, 'shop', '', '', 'shop', 'eb74ab4fd1678746addb67baebbd4ecf19e6b422c2cc81912c89fc100707f127', 'read write',
  '6af3683ab61f6ac20d15fc88', 'app_6af36a3a3403bd0434d77d37', 'Xky3cVZf9Yec4RpWGnvKLoZxBWufseFZDipL8TDodxLSHYrHisBZL5U6SNmzeSz0PkiuBTZqSLYrN35Qca9y1g',
  '6adbe8f8d129a41d7be7b1ac', 'c8Y3p8P21pGmi6pkC4C7OiOsNZwpuFrtU2_XxnEFnUaDFoJY7UdU5YNTLDLB-JzqvIEgzDDGrUGsBqqEc3ApqA',
  'saved', ''
)
on conflict (id) do update set
  subdomain = 'shop',
  oauth_client_id = excluded.oauth_client_id,
  oauth_client_secret = excluded.oauth_client_secret,
  oauth_scopes = excluded.oauth_scopes,
  conversations_app_id = excluded.conversations_app_id,
  conversations_key_id = excluded.conversations_key_id,
  conversations_secret = excluded.conversations_secret,
  webhook_id = excluded.webhook_id,
  webhook_secret = excluded.webhook_secret,
  last_status = case when integration_settings.last_status in ('', 'not_connected') then 'saved' else integration_settings.last_status end;
