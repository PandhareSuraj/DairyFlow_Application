-- Create this admin in Supabase Authentication first.
-- Then replace PASTE_ADMIN_AUTH_USER_UUID and PASTE_ADMIN_AUTH_EMAIL before running.
-- The hidden auth email is used only by the Edge Function to mint a Supabase session
-- after the WhatsApp OTP has been verified.

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
  'Mybill Admin',
  'Mybill',
  'PASTE_ADMIN_AUTH_EMAIL',
  'PASTE_ADMIN_AUTH_EMAIL',
  '8275838256',
  public.normalize_indian_phone('8275838256'),
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
