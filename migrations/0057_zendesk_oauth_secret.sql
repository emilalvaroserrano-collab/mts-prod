update integration_settings
set oauth_client_id = 'manage_tech_service',
    oauth_client_secret = '4b839207297181665407f2f6ee2e7351e91db34c1ecd46df6b7c464b17cafdf8',
    oauth_scopes = 'read write',
    subdomain = 'mts-portal'
where id = 1;
