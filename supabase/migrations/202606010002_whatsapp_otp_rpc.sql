-- WhatsApp OTP, tenant-safe RPCs, and view support for DairyFlow.
-- Safe to re-run; it only adds missing objects or replaces functions/views.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists admin_id uuid references auth.users(id) on delete cascade;
alter table public.profiles add column if not exists delivery_boy_id uuid;
alter table public.profiles add column if not exists admin_access_code text;
alter table public.profiles add column if not exists dairy_name text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text not null default 'customer';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.routes add column if not exists admin_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.routes add column if not exists route_name text not null default '';
alter table public.routes add column if not exists area text;
alter table public.routes add column if not exists description text;
alter table public.routes add column if not exists status text not null default 'active';
alter table public.routes add column if not exists updated_at timestamptz not null default now();

alter table public.delivery_boys add column if not exists admin_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.delivery_boys add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.delivery_boys add column if not exists full_name text not null default '';
alter table public.delivery_boys add column if not exists name text;
alter table public.delivery_boys add column if not exists phone text;
alter table public.delivery_boys add column if not exists email text;
alter table public.delivery_boys add column if not exists route_id uuid references public.routes(id) on delete set null;
alter table public.delivery_boys add column if not exists assigned_route_id uuid references public.routes(id) on delete set null;
alter table public.delivery_boys add column if not exists status text not null default 'active';
alter table public.delivery_boys add column if not exists is_active boolean not null default true;
alter table public.delivery_boys add column if not exists created_at timestamptz not null default now();
alter table public.delivery_boys add column if not exists updated_at timestamptz not null default now();

update public.delivery_boys
set full_name = coalesce(nullif(full_name, ''), nullif(name, ''), email, phone, 'Delivery boy')
where full_name is null or full_name = '';

update public.delivery_boys
set assigned_route_id = coalesce(assigned_route_id, route_id)
where assigned_route_id is null;

alter table public.customers add column if not exists admin_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.customers add column if not exists route_id uuid references public.routes(id) on delete set null;
alter table public.customers add column if not exists full_name text;
alter table public.customers add column if not exists name text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists mobile_number text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists area text;
alter table public.customers add column if not exists daily_quantity numeric(12,3) not null default 0;
alter table public.customers add column if not exists morning_quantity numeric(12,3) not null default 0;
alter table public.customers add column if not exists evening_quantity numeric(12,3) not null default 0;
alter table public.customers add column if not exists milk_type text not null default 'Cow';
alter table public.customers add column if not exists rate numeric(12,2) not null default 0;
alter table public.customers add column if not exists milk_rate numeric(12,2) not null default 0;
alter table public.customers add column if not exists price_per_liter numeric(12,2) not null default 0;
alter table public.customers add column if not exists delivery_time text not null default 'Morning';
alter table public.customers add column if not exists status text not null default 'active';
alter table public.customers add column if not exists is_active boolean not null default true;
alter table public.customers add column if not exists opening_pending_balance numeric(12,2) not null default 0;
alter table public.customers add column if not exists opening_balance numeric(12,2) not null default 0;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

update public.customers
set full_name = coalesce(nullif(full_name, ''), nullif(name, ''), phone, mobile_number),
    phone = coalesce(nullif(phone, ''), mobile_number),
    price_per_liter = case when price_per_liter = 0 then coalesce(nullif(rate, 0), nullif(milk_rate, 0), price_per_liter) else price_per_liter end,
    opening_balance = case when opening_balance = 0 then coalesce(opening_pending_balance, opening_balance) else opening_balance end,
    status = case when coalesce(is_active, true) then 'active' else 'inactive' end
where true;

update public.customers
set morning_quantity = case when lower(delivery_time) = 'evening' then 0 else daily_quantity end,
    evening_quantity = case when lower(delivery_time) = 'evening' then daily_quantity else 0 end
where morning_quantity = 0 and evening_quantity = 0 and daily_quantity > 0;

alter table public.products add column if not exists admin_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.products add column if not exists name text;
alter table public.products add column if not exists product_name text;
alter table public.products add column if not exists category text not null default 'Milk';
alter table public.products add column if not exists unit text not null default 'Liter';
alter table public.products add column if not exists price_per_unit numeric(12,2) not null default 0;
alter table public.products add column if not exists price numeric(12,2) not null default 0;
alter table public.products add column if not exists stock_quantity numeric(12,3) not null default 0;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists status text not null default 'active';
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

update public.products
set name = coalesce(nullif(name, ''), nullif(product_name, ''), 'Milk'),
    price = case when price = 0 then coalesce(nullif(price_per_unit, 0), price) else price end,
    status = case when coalesce(is_active, true) then 'active' else 'inactive' end
where true;

alter table public.deliveries add column if not exists admin_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.deliveries add column if not exists customer_id uuid references public.customers(id) on delete cascade;
alter table public.deliveries add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.deliveries add column if not exists route_id uuid references public.routes(id) on delete set null;
alter table public.deliveries add column if not exists delivery_boy_id uuid references public.delivery_boys(id) on delete set null;
alter table public.deliveries add column if not exists delivery_date date not null default current_date;
alter table public.deliveries add column if not exists delivery_shift text;
alter table public.deliveries add column if not exists delivery_time text not null default 'Morning';
alter table public.deliveries add column if not exists quantity numeric(12,3) not null default 0;
alter table public.deliveries add column if not exists unit_price numeric(12,2) not null default 0;
alter table public.deliveries add column if not exists total_amount numeric(12,2) not null default 0;
alter table public.deliveries add column if not exists delivery_status text not null default 'Pending';
alter table public.deliveries add column if not exists status text;
alter table public.deliveries add column if not exists payment_status text not null default 'Unpaid';
alter table public.deliveries add column if not exists skip_reason text;
alter table public.deliveries add column if not exists notes text;
alter table public.deliveries add column if not exists created_at timestamptz not null default now();
alter table public.deliveries add column if not exists updated_at timestamptz not null default now();

update public.deliveries
set delivery_time = case when lower(coalesce(delivery_shift::text, delivery_time)) = 'evening' then 'Evening' else 'Morning' end,
    delivery_status = initcap(coalesce(status::text, delivery_status)),
    payment_status = coalesce(nullif(payment_status, ''), 'Unpaid')
where true;

alter table public.payments add column if not exists admin_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.payments add column if not exists customer_id uuid references public.customers(id) on delete cascade;
alter table public.payments add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.payments add column if not exists delivery_id uuid references public.deliveries(id) on delete set null;
alter table public.payments add column if not exists collected_by uuid references public.delivery_boys(id) on delete set null;
alter table public.payments add column if not exists amount numeric(12,2) not null default 0;
alter table public.payments add column if not exists payment_date date not null default current_date;
alter table public.payments add column if not exists payment_method text not null default 'Cash';
alter table public.payments add column if not exists notes text;
alter table public.payments add column if not exists created_at timestamptz not null default now();
alter table public.payments add column if not exists updated_at timestamptz not null default now();

create table if not exists public.whatsapp_otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null check (purpose in ('signup', 'login', 'reset')),
  role text not null check (role in ('admin', 'delivery_boy')),
  admin_access_code text,
  device_id text,
  otp_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_otp_phone_created_idx
on public.whatsapp_otp_requests(phone, created_at desc);

create unique index if not exists profiles_admin_access_code_idx
on public.profiles(admin_access_code)
where admin_access_code is not null;

create index if not exists profiles_admin_id_idx on public.profiles(admin_id);
create index if not exists profiles_delivery_boy_id_idx on public.profiles(delivery_boy_id);
create index if not exists routes_admin_id_idx on public.routes(admin_id);
create index if not exists delivery_boys_admin_id_idx on public.delivery_boys(admin_id);
create index if not exists delivery_boys_profile_id_idx on public.delivery_boys(profile_id);
create index if not exists delivery_boys_assigned_route_id_idx on public.delivery_boys(assigned_route_id);
create index if not exists customers_admin_route_idx on public.customers(admin_id, route_id);
create index if not exists deliveries_admin_date_route_idx on public.deliveries(admin_id, delivery_date, route_id);
create index if not exists deliveries_delivery_boy_today_idx on public.deliveries(delivery_boy_id, delivery_date);
create index if not exists payments_delivery_collected_idx on public.payments(delivery_id, collected_by);

create unique index if not exists deliveries_unique_customer_date_time_idx
on public.deliveries(admin_id, customer_id, delivery_date, delivery_time);

create unique index if not exists payments_unique_delivery_collector_paid_idx
on public.payments(delivery_id, collected_by)
where delivery_id is not null and collected_by is not null;

create or replace function public.normalize_whatsapp_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') ~ '^\d{10}$'
      then '91' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    else regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  end
$$;

create or replace function public.current_tenant_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role::text = 'admin' then p.id
    when p.role::text = 'delivery_boy' then p.admin_id
    else null
  end
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active'
$$;

create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'admin'
      and p.status = 'active'
  )
$$;

create or replace function public.current_delivery_boy_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.delivery_boy_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role::text = 'delivery_boy'
    and p.status = 'active'
$$;

create or replace function public.current_delivery_boy_route_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.assigned_route_id
  from public.profiles p
  join public.delivery_boys b on b.id = p.delivery_boy_id
  where p.id = auth.uid()
    and p.role::text = 'delivery_boy'
    and p.status = 'active'
    and b.status = 'active'
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
declare
  v_phone text := public.normalize_whatsapp_phone(p_phone);
  v_otp text := coalesce(nullif(p_otp, ''), lpad(floor(random() * 1000000)::int::text, 6, '0'));
  v_id uuid;
begin
  if length(v_phone) < 10 then
    raise exception 'Invalid phone number';
  end if;

  if p_purpose not in ('signup', 'login', 'reset') then
    raise exception 'Invalid OTP purpose';
  end if;

  if p_role not in ('admin', 'delivery_boy') then
    raise exception 'Invalid role';
  end if;

  if p_role = 'delivery_boy'
    and not exists (
      select 1 from public.profiles
      where role::text = 'admin'
        and status = 'active'
        and admin_access_code = upper(regexp_replace(coalesce(p_admin_access_code, ''), '\s+', '', 'g'))
    ) then
    raise exception 'Invalid admin access code';
  end if;

  insert into public.whatsapp_otp_requests (
    phone,
    purpose,
    role,
    admin_access_code,
    device_id,
    otp_hash,
    expires_at
  ) values (
    v_phone,
    p_purpose,
    p_role,
    upper(regexp_replace(coalesce(p_admin_access_code, ''), '\s+', '', 'g')),
    p_device_id,
    extensions.crypt(v_otp, extensions.gen_salt('bf')),
    now() + interval '5 minutes'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.verify_whatsapp_otp(
  p_phone text,
  p_otp text
)
returns table (
  verified boolean,
  purpose text,
  role text,
  email text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := public.normalize_whatsapp_phone(p_phone);
  v_request public.whatsapp_otp_requests%rowtype;
begin
  select *
  into v_request
  from public.whatsapp_otp_requests
  where phone = v_phone
    and verified_at is null
  order by created_at desc
  limit 1;

  if not found then
    return query select false, null::text, null::text, null::text, 'Invalid OTP'::text;
    return;
  end if;

  if v_request.expires_at < now() then
    update public.whatsapp_otp_requests set attempts = attempts + 1 where id = v_request.id;
    return query select false, v_request.purpose, v_request.role, null::text, 'OTP expired'::text;
    return;
  end if;

  if v_request.attempts >= 5 then
    return query select false, v_request.purpose, v_request.role, null::text, 'Invalid OTP'::text;
    return;
  end if;

  if v_request.otp_hash <> extensions.crypt(coalesce(p_otp, ''), v_request.otp_hash) then
    update public.whatsapp_otp_requests set attempts = attempts + 1 where id = v_request.id;
    return query select false, v_request.purpose, v_request.role, null::text, 'Invalid OTP'::text;
    return;
  end if;

  update public.whatsapp_otp_requests
  set verified_at = now()
  where id = v_request.id;

  return query
  select
    true,
    v_request.purpose,
    v_request.role,
    p.email,
    'OTP verified'::text
  from public.profiles p
  where public.normalize_whatsapp_phone(coalesce(p.phone, '')) = v_phone
    and p.role::text = v_request.role
    and p.status = 'active'
  order by p.created_at desc
  limit 1;

  if not found then
    return query select true, v_request.purpose, v_request.role, null::text, 'OTP verified'::text;
  end if;
end;
$$;

create or replace function public.create_admin_profile(
  full_name text,
  dairy_name text,
  email text,
  phone text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text := public.normalize_whatsapp_phone(phone);
  v_code text;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.whatsapp_otp_requests
    where phone = v_phone
      and purpose = 'signup'
      and role = 'admin'
      and verified_at is not null
      and verified_at > now() - interval '30 minutes'
  ) then
    raise exception 'Phone not verified';
  end if;

  loop
    v_code := 'DF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.profiles where admin_access_code = v_code);
  end loop;

  insert into public.profiles (
    id, admin_id, admin_access_code, full_name, dairy_name, email, phone, role, phone_verified, status, updated_at
  ) values (
    v_user_id, v_user_id, v_code, full_name, dairy_name, email, v_phone, 'admin', true, 'active', now()
  )
  on conflict (id) do update set
    admin_id = excluded.admin_id,
    admin_access_code = coalesce(public.profiles.admin_access_code, excluded.admin_access_code),
    full_name = excluded.full_name,
    dairy_name = excluded.dairy_name,
    email = excluded.email,
    phone = excluded.phone,
    role = 'admin',
    phone_verified = true,
    status = 'active',
    updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.create_delivery_boy_profile(
  full_name text,
  email text,
  phone text,
  admin_access_code text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text := public.normalize_whatsapp_phone(phone);
  v_code text := upper(regexp_replace(coalesce(admin_access_code, ''), '\s+', '', 'g'));
  v_admin public.profiles%rowtype;
  v_delivery_boy public.delivery_boys%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_admin
  from public.profiles
  where role::text = 'admin'
    and status = 'active'
    and admin_access_code = v_code
  limit 1;

  if not found then
    raise exception 'Invalid admin access code';
  end if;

  if not exists (
    select 1
    from public.whatsapp_otp_requests
    where phone = v_phone
      and purpose = 'signup'
      and role = 'delivery_boy'
      and admin_access_code = v_code
      and verified_at is not null
      and verified_at > now() - interval '30 minutes'
  ) then
    raise exception 'Phone not verified';
  end if;

  select *
  into v_delivery_boy
  from public.delivery_boys db
  where db.admin_id = v_admin.id
    and db.status = 'active'
    and (
      db.profile_id = v_user_id
      or public.normalize_whatsapp_phone(coalesce(db.phone, '')) = v_phone
      or lower(coalesce(db.email, '')) = lower(coalesce(create_delivery_boy_profile.email, ''))
    )
  order by db.created_at desc
  limit 1;

  if not found then
    insert into public.delivery_boys (
      admin_id, profile_id, full_name, phone, email, status, updated_at
    ) values (
      v_admin.id, v_user_id, full_name, v_phone, email, 'active', now()
    )
    returning * into v_delivery_boy;
  else
    update public.delivery_boys
    set profile_id = v_user_id,
        full_name = coalesce(nullif(create_delivery_boy_profile.full_name, ''), full_name),
        phone = v_phone,
        email = coalesce(nullif(create_delivery_boy_profile.email, ''), email),
        updated_at = now()
    where id = v_delivery_boy.id
    returning * into v_delivery_boy;
  end if;

  insert into public.profiles (
    id, admin_id, delivery_boy_id, full_name, email, phone, role, phone_verified, status, updated_at
  ) values (
    v_user_id, v_admin.id, v_delivery_boy.id, full_name, email, v_phone, 'delivery_boy', true, 'active', now()
  )
  on conflict (id) do update set
    admin_id = excluded.admin_id,
    delivery_boy_id = excluded.delivery_boy_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = 'delivery_boy',
    phone_verified = true,
    status = 'active',
    updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.generate_today_deliveries(
  p_delivery_date date default current_date,
  p_route_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_product public.products%rowtype;
  v_customer public.customers%rowtype;
  v_delivery_boy_id uuid;
  v_count integer := 0;
  v_shift text;
  v_quantity numeric;
  v_unit_price numeric;
begin
  if not public.is_current_admin() then
    raise exception 'Admin access is required';
  end if;

  select *
  into v_product
  from public.products
  where admin_id = v_admin_id
    and status = 'active'
  order by created_at asc
  limit 1;

  if not found then
    return 0;
  end if;

  for v_customer in
    select *
    from public.customers
    where admin_id = v_admin_id
      and status = 'active'
      and (p_route_id is null or route_id = p_route_id)
  loop
    select id
    into v_delivery_boy_id
    from public.delivery_boys
    where admin_id = v_admin_id
      and status = 'active'
      and assigned_route_id = v_customer.route_id
    order by created_at asc
    limit 1;

    foreach v_shift in array array['Morning', 'Evening'] loop
      v_quantity := case
        when v_shift = 'Morning' then coalesce(nullif(v_customer.morning_quantity, 0), case when v_customer.delivery_time in ('Morning', 'Both') then v_customer.daily_quantity else 0 end)
        else coalesce(nullif(v_customer.evening_quantity, 0), case when v_customer.delivery_time in ('Evening', 'Both') then v_customer.daily_quantity else 0 end)
      end;

      if v_quantity <= 0 then
        continue;
      end if;

      v_unit_price := coalesce(nullif(v_customer.price_per_liter, 0), v_product.price, 0);

      insert into public.deliveries (
        admin_id,
        customer_id,
        product_id,
        route_id,
        delivery_boy_id,
        delivery_date,
        delivery_time,
        quantity,
        unit_price,
        total_amount,
        delivery_status,
        payment_status
      ) values (
        v_admin_id,
        v_customer.id,
        v_product.id,
        v_customer.route_id,
        v_delivery_boy_id,
        p_delivery_date,
        v_shift,
        v_quantity,
        v_unit_price,
        v_quantity * v_unit_price,
        'Pending',
        'Unpaid'
      )
      on conflict (admin_id, customer_id, delivery_date, delivery_time) do nothing;

      if found then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  return v_count;
end;
$$;

create or replace function public.delivery_boy_update_today_delivery(
  p_delivery_id uuid,
  p_delivery_status text default null,
  p_payment_status text default null,
  p_skip_reason text default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_delivery public.deliveries%rowtype;
  v_next_delivery_status text;
  v_next_payment_status text;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and role::text = 'delivery_boy'
    and status = 'active';

  if not found or v_profile.admin_id is null or v_profile.delivery_boy_id is null then
    raise exception 'Delivery boy access is required';
  end if;

  select d.*
  into v_delivery
  from public.deliveries d
  join public.delivery_boys b on b.id = v_profile.delivery_boy_id
  where d.id = p_delivery_id
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and b.status = 'active'
  for update;

  if not found then
    raise exception 'Delivery is not assigned for today';
  end if;

  v_next_delivery_status := coalesce(p_delivery_status, v_delivery.delivery_status);
  v_next_payment_status := coalesce(p_payment_status, v_delivery.payment_status);

  if v_next_delivery_status not in ('Pending', 'Delivered', 'Skipped') then
    raise exception 'Invalid delivery status';
  end if;

  if v_next_payment_status not in ('Unpaid', 'Paid') then
    raise exception 'Invalid payment status';
  end if;

  update public.deliveries
  set delivery_status = v_next_delivery_status,
      payment_status = v_next_payment_status,
      skip_reason = case
        when v_next_delivery_status = 'Skipped' then coalesce(nullif(p_skip_reason, ''), 'Skipped by delivery boy')
        when v_next_delivery_status = 'Delivered' then null
        else skip_reason
      end,
      updated_at = now()
  where id = p_delivery_id
  returning * into v_delivery;

  if v_next_payment_status = 'Paid' then
    insert into public.payments (
      admin_id,
      customer_id,
      invoice_id,
      delivery_id,
      collected_by,
      amount,
      payment_date,
      payment_method,
      notes
    ) values (
      v_delivery.admin_id,
      v_delivery.customer_id,
      null,
      v_delivery.id,
      v_profile.delivery_boy_id,
      v_delivery.total_amount,
      current_date,
      'Cash',
      'Collected by delivery boy'
    )
    on conflict (delivery_id, collected_by) where delivery_id is not null and collected_by is not null do update set
      amount = excluded.amount,
      payment_date = excluded.payment_date,
      updated_at = now();
  end if;

  return v_delivery;
end;
$$;

create or replace function public.generate_monthly_invoices(
  p_billing_month text,
  p_customer_id uuid default null,
  p_route_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if not public.is_current_admin() then
    raise exception 'Admin access is required';
  end if;

  -- The Android billing repository still contains the detailed itemization path.
  -- This RPC is intentionally present as the server-side extension point.
  return 0;
end;
$$;

drop view if exists public.today_delivery_view;
create view public.today_delivery_view as
select
  d.id,
  d.admin_id,
  d.customer_id,
  d.product_id,
  d.route_id,
  d.delivery_boy_id,
  d.delivery_date,
  d.delivery_time,
  d.quantity,
  d.unit_price,
  d.total_amount,
  d.delivery_status,
  d.payment_status,
  d.skip_reason,
  c.full_name as customer_name,
  c.phone as customer_phone,
  c.address as customer_address,
  r.route_name,
  b.full_name as delivery_boy_name
from public.deliveries d
left join public.customers c on c.id = d.customer_id and c.admin_id = d.admin_id
left join public.routes r on r.id = d.route_id and r.admin_id = d.admin_id
left join public.delivery_boys b on b.id = d.delivery_boy_id and b.admin_id = d.admin_id
where d.delivery_date = current_date;

grant select on public.today_delivery_view to authenticated;
grant select, insert, update, delete on public.routes to authenticated;
grant select, insert, update, delete on public.delivery_boys to authenticated;
grant select, insert, update, delete on public.whatsapp_otp_requests to service_role;
grant execute on function public.create_whatsapp_otp_request(text, text, text, text, text, text) to service_role;
grant execute on function public.verify_whatsapp_otp(text, text) to service_role;
grant execute on function public.create_admin_profile(text, text, text, text) to authenticated;
grant execute on function public.create_delivery_boy_profile(text, text, text, text) to authenticated;
grant execute on function public.generate_today_deliveries(date, uuid) to authenticated;
grant execute on function public.delivery_boy_update_today_delivery(uuid, text, text, text) to authenticated;
grant execute on function public.generate_monthly_invoices(text, uuid, uuid) to authenticated;

alter table public.whatsapp_otp_requests enable row level security;

drop policy if exists "OTP requests are service role only" on public.whatsapp_otp_requests;
create policy "OTP requests are service role only"
on public.whatsapp_otp_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

notify pgrst, 'reload schema';
