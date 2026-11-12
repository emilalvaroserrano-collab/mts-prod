update integration_settings
set oauth_client_id = 'mts-portal',
    oauth_client_secret = '2323b62739554021211eaa17dc81221200a1dda3f362d1d7323ae09ecde4aee1',
    oauth_scopes = 'read write',
    subdomain = 'mts-portal'
where id = 1;
