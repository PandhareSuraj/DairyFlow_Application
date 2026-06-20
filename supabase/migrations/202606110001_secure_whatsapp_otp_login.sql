create extension if not exists pgcrypto;

alter table public.profiles add column if not exists auth_email text;
alter table public.profiles add column if not exists normalized_phone text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists login_enabled boolean default true;
alter table public.profiles add column if not exists last_login_method text;
alter table public.profiles add column if not exists last_login_at timestamptz;

create table if not exists public.whatsapp_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_otps_phone_created_idx
on public.whatsapp_otps(phone, created_at desc);

create index if not exists whatsapp_otps_rate_limit_idx
on public.whatsapp_otps(phone, created_at);

alter table public.whatsapp_otps enable row level security;

drop policy if exists "whatsapp_otps_service_role_only" on public.whatsapp_otps;
create policy "whatsapp_otps_service_role_only"
on public.whatsapp_otps
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

grant select, insert, update, delete on public.whatsapp_otps to service_role;

notify pgrst, 'reload schema';
