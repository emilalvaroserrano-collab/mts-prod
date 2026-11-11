update integration_settings
set conversations_app_id = '6af379dcb61f6ac20d1e3df8',
    conversations_key_id = 'app_6af39b614c735f82a19f2d89',
    conversations_secret = '1g2UxuNik3Jzg0gfmN7B3hgEhvGa1TCvylM5VeGKko7ZOW9MQYASKwdorkzAdY-0nJvZ3gltgP9h7NpnIO6N_Q',
    last_status = case when last_status in ('', 'not_connected', 'error') then 'connected' else last_status end,
    last_error = case when last_error ilike '%invalid_auth%' or last_error ilike '%Conversations%' then '' else last_error end
where id = 1;
