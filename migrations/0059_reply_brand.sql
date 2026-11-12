alter table portal_settings add column if not exists reply_name text not null default 'MTS Support';
update portal_settings set reply_name = 'MTS Support' where reply_name = '';
