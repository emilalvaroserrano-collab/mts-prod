update integration_settings
set subdomain = 'managetechservices',
    last_error = case when last_error ilike '%returned 404%' then '' else last_error end,
    last_status = case when last_error ilike '%returned 404%' then 'saved' else last_status end
where id = 1 and subdomain in ('', 'shop');
