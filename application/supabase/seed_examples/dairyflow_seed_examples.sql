-- Replace all placeholder UUIDs before running.
-- Do not run this file until auth.users rows already exist for the admin and delivery boy.

-- Admin profile example:
insert into public.profiles (
  id,
  admin_id,
  full_name,
  dairy_name,
  email,
  auth_email,
  phone,
  normalized_phone,
  role,
  status,
  seeded_by_developer,
  login_enabled,
  qr_login_enabled
) values (
  'PASTE_ADMIN_AUTH_USER_UUID',
  'PASTE_ADMIN_AUTH_USER_UUID',
  'Admin Name',
  'Mybill',
  'admin@example.com',
  'admin@example.com',
  '8040184666',
  public.normalize_indian_phone('8040184666'),
  'admin',
  'active',
  true,
  true,
  false
) on conflict (id) do update set
  admin_id = excluded.admin_id,
  full_name = excluded.full_name,
  dairy_name = excluded.dairy_name,
  email = excluded.email,
  auth_email = excluded.auth_email,
  phone = excluded.phone,
  normalized_phone = excluded.normalized_phone,
  role = 'admin',
  status = 'active',
  seeded_by_developer = true,
  login_enabled = true,
  updated_at = now();

-- Delivery boy profile and delivery_boys row example:
insert into public.profiles (
  id,
  admin_id,
  full_name,
  email,
  auth_email,
  phone,
  normalized_phone,
  role,
  status,
  seeded_by_developer,
  login_enabled,
  qr_login_enabled
) values (
  'PASTE_DELIVERY_BOY_AUTH_USER_UUID',
  'PASTE_ADMIN_AUTH_USER_UUID',
  'Delivery Boy Name',
  'delivery-boy@example.com',
  'delivery-boy@example.com',
  '9000000000',
  public.normalize_indian_phone('9000000000'),
  'delivery_boy',
  'active',
  true,
  false,
  true
) on conflict (id) do update set
  admin_id = excluded.admin_id,
  full_name = excluded.full_name,
  email = excluded.email,
  auth_email = excluded.auth_email,
  phone = excluded.phone,
  normalized_phone = excluded.normalized_phone,
  role = 'delivery_boy',
  status = 'active',
  qr_login_enabled = true,
  updated_at = now();

with upserted_delivery_boy as (
  insert into public.delivery_boys (
    admin_id,
    profile_id,
    full_name,
    phone,
    email,
    assigned_route_id,
    status
  ) values (
    'PASTE_ADMIN_AUTH_USER_UUID',
    'PASTE_DELIVERY_BOY_AUTH_USER_UUID',
    'Delivery Boy Name',
    '9000000000',
    'delivery-boy@example.com',
    nullif('PASTE_ROUTE_ID', 'PASTE_ROUTE_ID')::uuid,
    'active'
  )
  on conflict do nothing
  returning id
)
update public.profiles
set delivery_boy_id = (select id from upserted_delivery_boy)
where id = 'PASTE_DELIVERY_BOY_AUTH_USER_UUID'
  and exists (select 1 from upserted_delivery_boy);
