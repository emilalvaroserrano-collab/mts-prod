update integration_settings
set oauth_client_id = 'manage_tech_service',
    oauth_client_secret = '99e8abb6231c965eac620c7ed3f7a8a6d5ef5264a4e8138fc394dfca39065743',
    oauth_scopes = 'read',
    subdomain = 'mts-portal'
where id = 1;
