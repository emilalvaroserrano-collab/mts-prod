update integration_settings
set subdomain = 'mts-portal',
    last_error = case when last_error ilike '%returned 404%' or last_error ilike '%invalid_client%' then '' else last_error end,
    last_status = case when last_error ilike '%returned 404%' or last_error ilike '%invalid_client%' then 'saved' else last_status end
where id = 1;
