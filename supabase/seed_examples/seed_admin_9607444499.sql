-- Create this admin in Supabase Authentication first:
--   Email: omsai11@dairy.com
--   Password: DairyFlowTest@9607444499
--
-- Then replace PASTE_ADMIN_AUTH_USER_UUID with the auth.users UUID before running.
-- This profile lets WhatsApp OTP admin login resolve phone 9607444499 to
-- the Supabase Auth account above.

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
  'Omsai Admin',
  'Omsai Dairy',
  'omsai11@dairy.com',
  'omsai11@dairy.com',
  '9607444499',
  public.normalize_indian_phone('9607444499'),
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
