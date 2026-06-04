create extension if not exists "pgcrypto";

alter table public.profiles
add column if not exists normalized_phone text,
add column if not exists auth_email text,
add column if not exists login_enabled boolean default true,
add column if not exists qr_login_enabled boolean default true,
add column if not exists seeded_by_developer boolean default false,
add column if not exists last_login_method text,
add column if not exists last_login_at timestamptz;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'profiles_last_login_method_check') then
        alter table public.profiles
        add constraint profiles_last_login_method_check
        check (last_login_method is null or last_login_method in ('whatsapp_otp', 'qr_scan', 'email_password'));
    end if;
end $$;

create unique index if not exists idx_profiles_normalized_phone_unique
on public.profiles(normalized_phone)
where normalized_phone is not null;

create index if not exists idx_profiles_login_enabled on public.profiles(login_enabled);
create index if not exists idx_profiles_seeded_by_developer on public.profiles(seeded_by_developer);
create index if not exists idx_profiles_role_status on public.profiles(role, status);

create or replace function public.normalize_indian_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
    cleaned text;
begin
    cleaned := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
    if length(cleaned) = 10 then return '91' || cleaned; end if;
    if length(cleaned) = 12 and left(cleaned, 2) = '91' then return cleaned; end if;
    if length(cleaned) = 11 and left(cleaned, 1) = '0' then return '91' || right(cleaned, 10); end if;
    return cleaned;
end;
$$;

create or replace function public.normalize_whatsapp_phone(p_phone text)
returns text
language sql
immutable
as $$
  select public.normalize_indian_phone(p_phone)
$$;

update public.profiles
set normalized_phone = public.normalize_indian_phone(phone)
where phone is not null and normalized_phone is null;

create table if not exists public.whatsapp_otp_requests (
    id uuid primary key default gen_random_uuid(),
    phone text not null,
    otp_hash text not null,
    purpose text not null default 'login' check (purpose in ('signup', 'login', 'reset', 'reset_password')),
    role text check (role in ('admin', 'delivery_boy')),
    admin_access_code text,
    is_verified boolean default false,
    attempts int default 0,
    max_attempts int default 5,
    expires_at timestamptz not null,
    verified_at timestamptz,
    ip_address text,
    device_id text,
    created_at timestamptz default now()
);

alter table public.whatsapp_otp_requests add column if not exists is_verified boolean default false;
alter table public.whatsapp_otp_requests add column if not exists max_attempts int default 5;
alter table public.whatsapp_otp_requests add column if not exists ip_address text;
alter table public.whatsapp_otp_requests add column if not exists device_id text;
alter table public.whatsapp_otp_requests alter column purpose set default 'login';

do $$
begin
    if exists (
        select 1 from pg_constraint
        where conname = 'whatsapp_otp_requests_purpose_check'
    ) then
        alter table public.whatsapp_otp_requests drop constraint whatsapp_otp_requests_purpose_check;
    end if;
    alter table public.whatsapp_otp_requests
    add constraint whatsapp_otp_requests_purpose_check
    check (purpose in ('signup', 'login', 'reset', 'reset_password'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_whatsapp_otp_phone on public.whatsapp_otp_requests(phone);
create index if not exists idx_whatsapp_otp_expires on public.whatsapp_otp_requests(expires_at);
create index if not exists idx_whatsapp_otp_verified on public.whatsapp_otp_requests(is_verified);
create index if not exists idx_whatsapp_otp_created_at on public.whatsapp_otp_requests(created_at);

create table if not exists public.delivery_qr_login_tokens (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references public.profiles(id) on delete cascade,
    delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
    token_hash text not null,
    status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
    expires_at timestamptz not null,
    used_at timestamptz,
    revoked_at timestamptz,
    device_id text,
    qr_label text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_delivery_qr_tokens_admin_id on public.delivery_qr_login_tokens(admin_id);
create index if not exists idx_delivery_qr_tokens_delivery_boy_id on public.delivery_qr_login_tokens(delivery_boy_id);
create index if not exists idx_delivery_qr_tokens_status on public.delivery_qr_login_tokens(status);
create index if not exists idx_delivery_qr_tokens_expires_at on public.delivery_qr_login_tokens(expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_delivery_qr_tokens_updated_at on public.delivery_qr_login_tokens;
create trigger set_delivery_qr_tokens_updated_at
before update on public.delivery_qr_login_tokens
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select p.role from public.profiles p where p.id = auth.uid() limit 1
$$;

create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select case when p.role = 'admin' then p.id else p.admin_id end
    from public.profiles p where p.id = auth.uid() limit 1
$$;

create or replace function public.generate_otp_code()
returns text
language plpgsql
as $$
begin
    return lpad(floor(random() * 1000000)::text, 6, '0');
end;
$$;

create or replace function public.create_whatsapp_otp_request(
    p_phone text,
    p_otp text,
    p_purpose text default 'login',
    p_role text default null,
    p_admin_access_code text default null,
    p_ip_address text default null,
    p_device_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    request_id uuid;
    recent_count int;
    today_count int;
    v_phone text;
begin
    v_phone := public.normalize_indian_phone(p_phone);
    if length(v_phone) <> 12 or left(v_phone, 2) <> '91' then raise exception 'Invalid Indian mobile number'; end if;
    select count(*) into recent_count from public.whatsapp_otp_requests where phone = v_phone and created_at > now() - interval '60 seconds';
    if recent_count > 0 then raise exception 'Please wait before requesting another OTP'; end if;
    select count(*) into today_count from public.whatsapp_otp_requests where phone = v_phone and created_at::date = current_date;
    if today_count >= 5 then raise exception 'Daily OTP limit reached'; end if;
    delete from public.whatsapp_otp_requests where phone = v_phone and coalesce(is_verified, verified_at is not null) = false;
    insert into public.whatsapp_otp_requests (
        phone, otp_hash, purpose, role, admin_access_code, expires_at, ip_address, device_id
    ) values (
        v_phone, extensions.crypt(p_otp, extensions.gen_salt('bf')), p_purpose, p_role, p_admin_access_code,
        now() + interval '5 minutes', p_ip_address, p_device_id
    ) returning id into request_id;
    return request_id;
end;
$$;

create or replace function public.create_whatsapp_otp_request(
  p_phone text,
  p_purpose text,
  p_role text,
  p_admin_access_code text default null,
  p_device_id text default null,
  p_otp text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_whatsapp_otp_request(p_phone, coalesce(p_otp, public.generate_otp_code()), p_purpose, p_role, p_admin_access_code, null, p_device_id);
end;
$$;

create or replace function public.verify_whatsapp_otp(p_phone text, p_otp text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    otp_row public.whatsapp_otp_requests;
    v_phone text;
begin
    v_phone := public.normalize_indian_phone(p_phone);
    select * into otp_row
    from public.whatsapp_otp_requests
    where phone = v_phone and coalesce(is_verified, verified_at is not null) = false and expires_at > now()
    order by created_at desc limit 1;
    if otp_row.id is null then return false; end if;
    if otp_row.attempts >= coalesce(otp_row.max_attempts, 5) then return false; end if;
    update public.whatsapp_otp_requests set attempts = attempts + 1 where id = otp_row.id;
    if otp_row.otp_hash = extensions.crypt(p_otp, otp_row.otp_hash) then
        update public.whatsapp_otp_requests set is_verified = true, verified_at = now() where id = otp_row.id;
        return true;
    end if;
    return false;
end;
$$;

create or replace function public.get_admin_by_verified_phone(p_phone text)
returns table (
    profile_id uuid,
    full_name text,
    dairy_name text,
    email text,
    auth_email text,
    phone text,
    normalized_phone text,
    role text,
    admin_id uuid,
    admin_access_code text,
    login_enabled boolean,
    status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_phone text;
    verified_otp_exists boolean;
begin
    v_phone := public.normalize_indian_phone(p_phone);
    select exists (
        select 1 from public.whatsapp_otp_requests
        where phone = v_phone and coalesce(is_verified, verified_at is not null) = true
          and verified_at > now() - interval '15 minutes'
    ) into verified_otp_exists;
    if not verified_otp_exists then raise exception 'Mobile number is not verified'; end if;
    return query
    select p.id, p.full_name, p.dairy_name, p.email, p.auth_email, p.phone, p.normalized_phone,
           p.role, p.admin_id, p.admin_access_code, p.login_enabled, p.status
    from public.profiles p
    where p.role = 'admin'
      and p.normalized_phone = v_phone
      and p.status = 'active'
      and p.login_enabled = true
    limit 1;
end;
$$;

create or replace function public.admin_create_delivery_qr_token(
    p_delivery_boy_id uuid,
    p_raw_token text,
    p_expires_minutes int default 1440,
    p_qr_label text default null
)
returns table (token_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id uuid;
    v_token_id uuid;
    v_expires_at timestamptz;
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    if public.current_user_role() <> 'admin' then raise exception 'Only admin can generate delivery boy QR'; end if;
    select admin_id into v_admin_id
    from public.delivery_boys
    where id = p_delivery_boy_id and admin_id = auth.uid() and status = 'active'
    limit 1;
    if v_admin_id is null then raise exception 'Delivery boy not found under this admin'; end if;
    update public.delivery_qr_login_tokens
    set status = 'revoked', revoked_at = now()
    where delivery_boy_id = p_delivery_boy_id and status = 'active';
    v_expires_at := now() + make_interval(mins => p_expires_minutes);
    insert into public.delivery_qr_login_tokens (
        admin_id, delivery_boy_id, token_hash, status, expires_at, qr_label, created_by
    ) values (
        auth.uid(), p_delivery_boy_id, extensions.crypt(p_raw_token, extensions.gen_salt('bf')), 'active',
        v_expires_at, p_qr_label, auth.uid()
    ) returning id into v_token_id;
    return query select v_token_id, v_expires_at;
end;
$$;

create or replace function public.consume_delivery_qr_token(p_raw_token text, p_device_id text default null)
returns table (
    profile_id uuid,
    admin_id uuid,
    delivery_boy_id uuid,
    full_name text,
    email text,
    auth_email text,
    phone text,
    assigned_route_id uuid,
    qr_login_enabled boolean,
    status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    token_row public.delivery_qr_login_tokens;
begin
    for token_row in
        select t.* from public.delivery_qr_login_tokens t
        where t.status = 'active' and t.expires_at > now()
        order by t.created_at desc
    loop
        if token_row.token_hash = extensions.crypt(p_raw_token, token_row.token_hash) then
            update public.delivery_qr_login_tokens
            set status = 'used', used_at = now(), device_id = p_device_id
            where id = token_row.id;
            update public.profiles
            set last_login_at = now(), last_login_method = 'qr_scan'
            where id = (select db.profile_id from public.delivery_boys db where db.id = token_row.delivery_boy_id);
            return query
            select db.profile_id, db.admin_id, db.id, db.full_name, db.email, p.auth_email,
                   db.phone, db.assigned_route_id, p.qr_login_enabled, p.status
            from public.delivery_boys db
            join public.profiles p on p.id = db.profile_id
            where db.id = token_row.delivery_boy_id
              and db.status = 'active'
              and p.status = 'active'
              and p.qr_login_enabled = true
              and p.role = 'delivery_boy'
            limit 1;
            return;
        end if;
    end loop;
    raise exception 'Invalid or expired QR token';
end;
$$;

alter table public.whatsapp_otp_requests enable row level security;
alter table public.delivery_qr_login_tokens enable row level security;

drop policy if exists "otp_no_direct_select" on public.whatsapp_otp_requests;
drop policy if exists "otp_no_direct_insert" on public.whatsapp_otp_requests;
drop policy if exists "otp_no_direct_update" on public.whatsapp_otp_requests;
drop policy if exists "otp_no_direct_delete" on public.whatsapp_otp_requests;

create policy "otp_no_direct_select" on public.whatsapp_otp_requests for select to authenticated using (false);
create policy "otp_no_direct_insert" on public.whatsapp_otp_requests for insert to authenticated with check (false);
create policy "otp_no_direct_update" on public.whatsapp_otp_requests for update to authenticated using (false) with check (false);
create policy "otp_no_direct_delete" on public.whatsapp_otp_requests for delete to authenticated using (false);

drop policy if exists "delivery_qr_tokens_select_policy" on public.delivery_qr_login_tokens;
drop policy if exists "delivery_qr_tokens_insert_policy" on public.delivery_qr_login_tokens;
drop policy if exists "delivery_qr_tokens_update_policy" on public.delivery_qr_login_tokens;
drop policy if exists "delivery_qr_tokens_delete_policy" on public.delivery_qr_login_tokens;

create policy "delivery_qr_tokens_select_policy" on public.delivery_qr_login_tokens
for select to authenticated using (admin_id = auth.uid() and public.current_user_role() = 'admin');
create policy "delivery_qr_tokens_insert_policy" on public.delivery_qr_login_tokens
for insert to authenticated with check (false);
create policy "delivery_qr_tokens_update_policy" on public.delivery_qr_login_tokens
for update to authenticated
using (admin_id = auth.uid() and public.current_user_role() = 'admin')
with check (admin_id = auth.uid() and public.current_user_role() = 'admin');
create policy "delivery_qr_tokens_delete_policy" on public.delivery_qr_login_tokens
for delete to authenticated using (admin_id = auth.uid() and public.current_user_role() = 'admin');

grant usage on schema public to authenticated;
grant select, update on public.delivery_qr_login_tokens to authenticated;
grant execute on function public.normalize_indian_phone(text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_admin_id() to authenticated;
grant execute on function public.admin_create_delivery_qr_token(uuid, text, int, text) to authenticated;
grant execute on function public.normalize_indian_phone(text) to service_role;
grant execute on function public.generate_otp_code() to service_role;
grant execute on function public.create_whatsapp_otp_request(text, text, text, text, text, text, text) to service_role;
grant execute on function public.create_whatsapp_otp_request(text, text, text, text, text, text) to service_role;
grant execute on function public.verify_whatsapp_otp(text, text) to service_role;
grant execute on function public.get_admin_by_verified_phone(text) to service_role;
grant execute on function public.consume_delivery_qr_token(text, text) to service_role;

notify pgrst, 'reload schema';
