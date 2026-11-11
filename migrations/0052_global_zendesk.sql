update portal_staff
set organization_id = null
where role in ('owner', 'admin', 'agent');

update integration_settings
set subdomain = 'mts-portal',
    email = '',
    last_error = ''
where id = 1;
