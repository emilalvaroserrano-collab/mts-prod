alter table zendesk_forms add column if not exists conditions_json text not null default '';
