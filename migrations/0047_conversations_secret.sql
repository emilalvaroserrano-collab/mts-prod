-- The mts-portal secret was rejected by Zendesk (invalid key/secret pair).
-- Keep the Conversations credentials that still authenticate.
update integration_settings
set conversations_app_id = '6af3683ab61f6ac20d15fc88',
    conversations_key_id = 'app_6af36a3a3403bd0434d77d37',
    conversations_secret = 'Xky3cVZf9Yec4RpWGnvKLoZxBWufseFZDipL8TDodxLSHYrHisBZL5U6SNmzeSz0PkiuBTZqSLYrN35Qca9y1g'
where id = 1
  and conversations_key_id = 'app_6af399d2ea08276c1781d86d';
