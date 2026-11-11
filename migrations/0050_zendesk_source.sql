-- Demo companies, tickets, and people are not in Zendesk. Remove them.
-- The only stored connection is the mts-portal Zendesk account.

delete from order_items
where order_id in (
  select id from orders
  where organization_id in (select id from organizations where domain like '%.example')
     or zendesk_ticket_id in ('48211', '48230', '48102', '47990', '47811', '48301', '47620', '47002', '48440')
);

delete from orders
where organization_id in (select id from organizations where domain like '%.example')
   or zendesk_ticket_id in ('48211', '48230', '48102', '47990', '47811', '48301', '47620', '47002', '48440');

delete from ticket_comments
where ticket_id in (
  select id from tickets
  where coalesce(requester_email, '') like '%.example'
     or zendesk_id in ('48211', '48230', '48102', '47990', '47811', '48301', '47620', '47002', '48440')
);

delete from tickets
where coalesce(requester_email, '') like '%.example'
   or zendesk_id in ('48211', '48230', '48102', '47990', '47811', '48301', '47620', '47002', '48440');

delete from user_requests
where coalesce(requested_email, '') like '%.example';

delete from customer_users
where email like '%.example';

delete from shop_customers
where email like '%.example';

delete from audit_logs
where target in ('47990', '48211', 'MT-1003');

delete from organizations
where domain like '%.example'
  and not exists (select 1 from orders o where o.organization_id = organizations.id)
  and not exists (select 1 from customer_users u where u.organization_id = organizations.id);

update integration_settings
set subdomain = 'mts-portal',
    email = '',
    api_token = '',
    oauth_client_id = 'mts-portal',
    oauth_client_secret = 'c323512179842df0ca18bff020727da7eb9de14d17168dfb0b71fbcb49a73460',
    oauth_scopes = 'read write',
    conversations_app_id = '6af379dcb61f6ac20d1e3df8',
    conversations_key_id = 'app_6af39b614c735f82a19f2d89',
    conversations_secret = '1g2UxuNik3Jzg0gfmN7B3hgEhvGa1TCvylM5VeGKko7ZOW9MQYASKwdorkzAdY-0nJvZ3gltgP9h7NpnIO6N_Q',
    last_status = 'connected',
    last_error = ''
where id = 1;
