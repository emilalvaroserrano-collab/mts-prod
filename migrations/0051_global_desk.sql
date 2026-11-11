insert into organizations (name, domain, notes, portal_access, ordering_enabled, user_requests_enabled, approval_required)
select 'Manage Tech Service', '', 'Company desk. Records come from the mts-portal Zendesk account.', true, true, true, false
where not exists (
  select 1 from organizations where name = 'Manage Tech Service' and coalesce(domain, '') = ''
);

update portal_staff
set organization_id = null
where role in ('owner', 'admin');

update orders
set organization_id = (
  select id from organizations
  where name = 'Manage Tech Service' and coalesce(domain, '') = ''
  order by id
  limit 1
)
where organization_id in (
  select id from organizations
  where domain = 'shop.managetech.example'
     or notes ilike '%Customer account. The shop is on%'
     or notes ilike '%Created from the customer portal%'
     or domain like '%.example'
);

update customer_users
set organization_id = null
where organization_id in (
  select id from organizations
  where coalesce(zendesk_org_id, '') = ''
    and (
      domain like '%.example'
      or notes ilike '%Customer account. The shop is on%'
      or notes ilike '%Created from the customer portal%'
    )
);

update shop_customers
set organization_id = null
where organization_id in (
  select id from organizations
  where coalesce(zendesk_org_id, '') = ''
    and (
      domain like '%.example'
      or notes ilike '%Customer account. The shop is on%'
      or notes ilike '%Created from the customer portal%'
    )
);

update tickets
set organization_id = null
where organization_id in (
  select id from organizations
  where coalesce(zendesk_org_id, '') = ''
    and (
      domain like '%.example'
      or notes ilike '%Customer account. The shop is on%'
      or notes ilike '%Created from the customer portal%'
    )
);

delete from organizations
where coalesce(zendesk_org_id, '') = ''
  and name <> 'Manage Tech Service'
  and (
    domain like '%.example'
    or notes ilike '%Customer account. The shop is on%'
    or notes ilike '%Created from the customer portal%'
  )
  and not exists (select 1 from orders o where o.organization_id = organizations.id);
