update integration_settings
set subdomain = 'mts-portal',
    oauth_client_id = 'mtsportal',
    oauth_client_secret = 'c323512179842df0ca18bff020727da7eb9de14d17168dfb0b71fbcb49a73460',
    api_token = 'c323512179842df0ca18bff020727da7eb9de14d17168dfb0b71fbcb49a73460',
    oauth_scopes = 'read write',
    last_error = case
      when last_error ilike '%invalid_client%' or last_error ilike '%unauthorized_client%' or last_error ilike '%OAuth returned 400%' then ''
      else last_error
    end,
    last_status = case
      when last_error ilike '%invalid_client%' or last_error ilike '%unauthorized_client%' or last_error ilike '%OAuth returned 400%' then 'connected'
      else last_status
    end
where id = 1;
