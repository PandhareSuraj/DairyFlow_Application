-- =========================================================
-- DairyFlow full Supabase setup for another account
-- Generated locally: 2026-06-22
-- Source: existing DairyFlow schema clone + migrations through 2026-06-19
--
-- Use this for a NEW / EMPTY Supabase project.
-- WARNING: The base schema section drops existing DairyFlow public tables/functions.
-- Do not run on a production database that already contains data unless you have a backup.
-- =========================================================



-- =========================================================
-- Included from supabase\migrations\202606100001_clone_current_schema_to_new_project.sql
-- =========================================================

-- =========================================================
-- DairyFlow schema clone migration
-- Source project: tdtyrgjdqoimbvgxewzr (linked local project)
-- Target project: utzvslmzjdtwbhzrolje
-- Generated: 2026-06-10
-- Purpose: clone database structure only. No customer/business data is inserted.
-- WARNING: This is intended for a new Supabase database. It drops existing DairyFlow public objects.
-- =========================================================


-- =========================================================
-- Included from supabase\dairyflow_new_database_latest.sql
-- =========================================================

-- =========================================================
-- DairyFlow Fresh Multi-Tenant Database Setup
-- Admin + Delivery Boy + Route Wise Customers + WhatsApp OTP
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- WARNING: Fresh setup. Drops old DairyFlow tables/functions.
-- =========================================================

drop view if exists public.today_delivery_view cascade;

drop table if exists public.delivery_qr_login_tokens cascade;
drop table if exists public.whatsapp_otp_requests cascade;
drop table if exists public.invoice_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.payments cascade;
drop table if exists public.deliveries cascade;
drop table if exists public.products cascade;
drop table if exists public.customers cascade;
drop table if exists public.delivery_boys cascade;
drop table if exists public.routes cascade;
drop table if exists public.profiles cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.current_admin_id() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.generate_admin_access_code() cascade;
drop function if exists public.generate_otp_code() cascade;
drop function if exists public.normalize_indian_phone(text) cascade;
drop function if exists public.create_whatsapp_otp_request(text, text, text, text, text, text, text) cascade;
drop function if exists public.verify_whatsapp_otp(text, text) cascade;
drop function if exists public.get_admin_by_verified_phone(text) cascade;
drop function if exists public.admin_create_delivery_qr_token(uuid, text, int, text) cascade;
drop function if exists public.consume_delivery_qr_token(text, text) cascade;
drop function if exists public.create_admin_profile(text, text, text, text) cascade;
drop function if exists public.create_delivery_boy_profile(text, text, text, text) cascade;
drop function if exists public.generate_today_deliveries() cascade;
drop function if exists public.generate_today_deliveries(date, uuid) cascade;
drop function if exists public.delivery_boy_update_today_delivery(uuid, text, text, text) cascade;

-- =========================================================
-- 1. PROFILES
-- =========================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    full_name text not null,
    dairy_name text,
    email text unique,
    phone text unique,

    role text not null check (role in ('admin', 'delivery_boy')),

    -- Admin: admin_id = own user id
    -- Delivery boy: admin_id = owner/admin id
    admin_id uuid references public.profiles(id) on delete cascade,

    admin_access_code text unique,

    phone_verified boolean default false,
    phone_verified_at timestamptz,
    normalized_phone text unique,
    auth_email text,
    login_enabled boolean default true,
    qr_login_enabled boolean default true,
    seeded_by_developer boolean default false,
    last_login_method text
        check (last_login_method is null or last_login_method in ('whatsapp_otp', 'qr_scan', 'email_password')),
    last_login_at timestamptz,

    status text not null default 'active'
        check (status in ('active', 'inactive', 'blocked')),

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_admin_id on public.profiles(admin_id);
create index idx_profiles_access_code on public.profiles(admin_access_code);
create index idx_profiles_phone on public.profiles(phone);

-- =========================================================
-- 2. ROUTES
-- =========================================================

create table public.routes (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,

    route_name text not null,
    area text,
    description text,

    status text not null default 'active'
        check (status in ('active', 'inactive')),

    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    unique(admin_id, route_name)
);

create index idx_routes_admin_id on public.routes(admin_id);
create index idx_routes_status on public.routes(status);

-- =========================================================
-- 3. DELIVERY BOYS
-- =========================================================

create table public.delivery_boys (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,

    -- Supabase auth profile of delivery boy
    profile_id uuid unique references public.profiles(id) on delete cascade,

    full_name text not null,
    email text,
    phone text,

    assigned_route_id uuid references public.routes(id) on delete set null,

    status text not null default 'active'
        check (status in ('active', 'inactive', 'blocked')),

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_delivery_boys_admin_id on public.delivery_boys(admin_id);
create index idx_delivery_boys_profile_id on public.delivery_boys(profile_id);
create index idx_delivery_boys_route_id on public.delivery_boys(assigned_route_id);
create index idx_delivery_boys_status on public.delivery_boys(status);

alter table public.profiles
add column delivery_boy_id uuid references public.delivery_boys(id) on delete set null;

create index idx_profiles_delivery_boy_id on public.profiles(delivery_boy_id);

-- =========================================================
-- 4. CUSTOMERS
-- =========================================================

create table public.customers (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,
    route_id uuid references public.routes(id) on delete set null,

    full_name text not null,
    phone text,
    email text,

    address text,
    area text,

    milk_type text default 'Cow',

    delivery_time text default 'Morning'
        check (delivery_time in ('Morning', 'Evening', 'Both')),

    daily_quantity numeric(10,2) default 0,
    morning_quantity numeric(10,2) default 0,
    evening_quantity numeric(10,2) default 0,

    price_per_liter numeric(10,2) default 0,
    opening_balance numeric(10,2) default 0,

    status text default 'active'
        check (status in ('active', 'inactive', 'paused')),

    notes text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_customers_admin_id on public.customers(admin_id);
create index idx_customers_route_id on public.customers(route_id);
create index idx_customers_status on public.customers(status);
create index idx_customers_phone on public.customers(phone);

-- =========================================================
-- 5. PRODUCTS
-- =========================================================

create table public.products (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,

    name text not null,
    category text default 'Milk',
    unit text default 'Liter',

    price numeric(10,2) default 0,
    stock_quantity numeric(10,2) default 0,

    description text,

    status text default 'active'
        check (status in ('active', 'inactive')),

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_products_admin_id on public.products(admin_id);
create index idx_products_status on public.products(status);

-- =========================================================
-- 6. DELIVERIES
-- =========================================================

create table public.deliveries (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,

    customer_id uuid not null references public.customers(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    route_id uuid references public.routes(id) on delete set null,
    delivery_boy_id uuid references public.delivery_boys(id) on delete set null,

    delivery_date date not null default current_date,

    delivery_time text default 'Morning'
        check (delivery_time in ('Morning', 'Evening')),

    quantity numeric(10,2) default 0,
    unit_price numeric(10,2) default 0,

    total_amount numeric(10,2) default 0,

    delivery_status text default 'Pending'
        check (delivery_status in ('Pending', 'Delivered', 'Skipped', 'Cancelled')),

    payment_status text default 'Unpaid'
        check (payment_status in ('Paid', 'Unpaid', 'Billed')),

    skip_reason text,
    notes text,

    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    unique(customer_id, delivery_date, delivery_time)
);

create index idx_deliveries_admin_id on public.deliveries(admin_id);
create index idx_deliveries_customer_id on public.deliveries(customer_id);
create index idx_deliveries_route_id on public.deliveries(route_id);
create index idx_deliveries_delivery_boy_id on public.deliveries(delivery_boy_id);
create index idx_deliveries_date on public.deliveries(delivery_date);
create index idx_deliveries_status on public.deliveries(delivery_status);
create index idx_deliveries_payment_status on public.deliveries(payment_status);

-- =========================================================
-- 7. PAYMENTS
-- =========================================================

create table public.payments (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,

    customer_id uuid not null references public.customers(id) on delete cascade,
    delivery_id uuid references public.deliveries(id) on delete set null,

    collected_by uuid references public.delivery_boys(id) on delete set null,

    amount numeric(10,2) not null default 0,

    payment_date date not null default current_date,

    payment_method text default 'Cash'
        check (payment_method in ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Other')),

    notes text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_payments_admin_id on public.payments(admin_id);
create index idx_payments_customer_id on public.payments(customer_id);
create index idx_payments_delivery_id on public.payments(delivery_id);
create index idx_payments_collected_by on public.payments(collected_by);
create index idx_payments_date on public.payments(payment_date);

create unique index idx_payments_unique_delivery_collector
on public.payments(delivery_id, collected_by)
where delivery_id is not null and collected_by is not null;

-- =========================================================
-- 8. INVOICES
-- =========================================================

create table public.invoices (
    id uuid primary key default gen_random_uuid(),

    admin_id uuid not null references public.profiles(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,

    invoice_number text not null,
    billing_month text not null,

    subtotal numeric(10,2) default 0,
    previous_balance numeric(10,2) default 0,
    total_amount numeric(10,2) default 0,
    paid_amount numeric(10,2) default 0,
    balance_amount numeric(10,2) default 0,

    status text default 'Unpaid'
        check (status in ('Paid', 'Unpaid', 'Partial')),

    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    unique(admin_id, customer_id, billing_month)
);

create index idx_invoices_admin_id on public.invoices(admin_id);
create index idx_invoices_customer_id on public.invoices(customer_id);
create index idx_invoices_billing_month on public.invoices(billing_month);
create index idx_invoices_status on public.invoices(status);

alter table public.payments
add column invoice_id uuid references public.invoices(id) on delete set null;

create index idx_payments_invoice_id on public.payments(invoice_id);

-- =========================================================
-- 9. INVOICE ITEMS
-- =========================================================

create table public.invoice_items (
    id uuid primary key default gen_random_uuid(),

    invoice_id uuid not null references public.invoices(id) on delete cascade,
    delivery_id uuid references public.deliveries(id) on delete set null,

    product_name text,
    delivery_date date,
    quantity numeric(10,2) default 0,
    unit_price numeric(10,2) default 0,
    total_amount numeric(10,2) default 0,

    created_at timestamptz default now()
);

create index idx_invoice_items_invoice_id on public.invoice_items(invoice_id);
create index idx_invoice_items_delivery_id on public.invoice_items(delivery_id);

-- =========================================================
-- 10. WHATSAPP OTP REQUESTS
-- =========================================================

create table public.whatsapp_otp_requests (
    id uuid primary key default gen_random_uuid(),

    phone text not null,
    otp_hash text not null,

    purpose text not null default 'login'
        check (purpose in ('signup', 'login', 'reset', 'reset_password')),

    role text
        check (role in ('admin', 'delivery_boy')),

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

create index idx_whatsapp_otp_phone on public.whatsapp_otp_requests(phone);
create index idx_whatsapp_otp_expires on public.whatsapp_otp_requests(expires_at);
create index idx_whatsapp_otp_verified on public.whatsapp_otp_requests(is_verified);
create index idx_whatsapp_otp_created_at on public.whatsapp_otp_requests(created_at);

-- =========================================================
-- 11. UPDATED AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_routes_updated_at
before update on public.routes
for each row execute function public.set_updated_at();

create trigger set_delivery_boys_updated_at
before update on public.delivery_boys
for each row execute function public.set_updated_at();

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_deliveries_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- =========================================================
-- 12. HELPER FUNCTIONS
-- =========================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select p.role
    from public.profiles p
    where p.id = auth.uid()
    limit 1
$$;

create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select
        case
            when p.role = 'admin' then p.id
            else p.admin_id
        end
    from public.profiles p
    where p.id = auth.uid()
    limit 1
$$;

create or replace function public.generate_admin_access_code()
returns text
language plpgsql
as $$
declare
    new_code text;
    code_exists boolean;
begin
    loop
        new_code := 'DAIRY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

        select exists (
            select 1
            from public.profiles
            where admin_access_code = new_code
        )
        into code_exists;

        exit when not code_exists;
    end loop;

    return new_code;
end;
$$;

create or replace function public.generate_otp_code()
returns text
language plpgsql
as $$
begin
    return lpad(floor(random() * 1000000)::text, 6, '0');
end;
$$;

-- =========================================================
-- 13. OTP FUNCTIONS
-- These should be called from Supabase Edge Functions,
-- not directly from Android.
-- =========================================================

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
begin
    -- 60 second cooldown
    select count(*)
    into recent_count
    from public.whatsapp_otp_requests
    where phone = p_phone
      and created_at > now() - interval '60 seconds';

    if recent_count > 0 then
        raise exception 'Please wait before requesting another OTP';
    end if;

    -- maximum 5 OTP requests per phone per day
    select count(*)
    into today_count
    from public.whatsapp_otp_requests
    where phone = p_phone
      and created_at::date = current_date;

    if today_count >= 5 then
        raise exception 'Daily OTP limit reached';
    end if;

    delete from public.whatsapp_otp_requests
    where phone = p_phone
      and is_verified = false;

    insert into public.whatsapp_otp_requests (
        phone,
        otp_hash,
        purpose,
        role,
        admin_access_code,
        expires_at,
        ip_address,
        device_id
    )
    values (
        p_phone,
        extensions.crypt(p_otp, extensions.gen_salt('bf')),
        p_purpose,
        p_role,
        p_admin_access_code,
        now() + interval '5 minutes',
        p_ip_address,
        p_device_id
    )
    returning id into request_id;

    return request_id;
end;
$$;

create or replace function public.verify_whatsapp_otp(
    p_phone text,
    p_otp text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    otp_row public.whatsapp_otp_requests;
begin
    select *
    into otp_row
    from public.whatsapp_otp_requests
    where phone = p_phone
      and is_verified = false
      and expires_at > now()
    order by created_at desc
    limit 1;

    if otp_row.id is null then
        return false;
    end if;

    if otp_row.attempts >= otp_row.max_attempts then
        return false;
    end if;

    update public.whatsapp_otp_requests
    set attempts = attempts + 1
    where id = otp_row.id;

    if otp_row.otp_hash = extensions.crypt(p_otp, otp_row.otp_hash) then
        update public.whatsapp_otp_requests
        set is_verified = true,
            verified_at = now()
        where id = otp_row.id;

        return true;
    end if;

    return false;
end;
$$;

-- =========================================================
-- 14. PROFILE CREATION FUNCTIONS
-- Call after Supabase Auth signup.
-- Email confirmation must be OFF in Supabase Auth settings.
-- =========================================================

create or replace function public.create_admin_profile(
    p_full_name text,
    p_dairy_name text,
    p_email text,
    p_phone text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    created_profile public.profiles;
    access_code text;
    verified_otp_exists boolean;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select exists (
        select 1
        from public.whatsapp_otp_requests
        where phone = p_phone
          and is_verified = true
          and verified_at > now() - interval '15 minutes'
    )
    into verified_otp_exists;

    if not verified_otp_exists then
        raise exception 'Phone number is not verified';
    end if;

    access_code := public.generate_admin_access_code();

    insert into public.profiles (
        id,
        full_name,
        dairy_name,
        email,
        phone,
        role,
        admin_id,
        admin_access_code,
        phone_verified,
        phone_verified_at,
        status
    )
    values (
        auth.uid(),
        p_full_name,
        p_dairy_name,
        p_email,
        p_phone,
        'admin',
        auth.uid(),
        access_code,
        true,
        now(),
        'active'
    )
    returning * into created_profile;

    return created_profile;
end;
$$;

create or replace function public.create_delivery_boy_profile(
    p_full_name text,
    p_email text,
    p_phone text,
    p_admin_access_code text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    matched_admin_id uuid;
    created_profile public.profiles;
    verified_otp_exists boolean;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select exists (
        select 1
        from public.whatsapp_otp_requests
        where phone = p_phone
          and is_verified = true
          and verified_at > now() - interval '15 minutes'
    )
    into verified_otp_exists;

    if not verified_otp_exists then
        raise exception 'Phone number is not verified';
    end if;

    select id
    into matched_admin_id
    from public.profiles
    where role = 'admin'
      and admin_access_code = p_admin_access_code
      and status = 'active'
    limit 1;

    if matched_admin_id is null then
        raise exception 'Invalid admin access code';
    end if;

    insert into public.profiles (
        id,
        full_name,
        dairy_name,
        email,
        phone,
        role,
        admin_id,
        admin_access_code,
        phone_verified,
        phone_verified_at,
        status
    )
    values (
        auth.uid(),
        p_full_name,
        null,
        p_email,
        p_phone,
        'delivery_boy',
        matched_admin_id,
        null,
        true,
        now(),
        'active'
    )
    returning * into created_profile;

    insert into public.delivery_boys (
        admin_id,
        profile_id,
        full_name,
        email,
        phone,
        status
    )
    values (
        matched_admin_id,
        auth.uid(),
        p_full_name,
        p_email,
        p_phone,
        'active'
    );

    return created_profile;
end;
$$;

-- =========================================================
-- 15. DAILY DELIVERY FUNCTIONS
-- =========================================================

create or replace function public.generate_today_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    inserted_total integer := 0;
    inserted_now integer := 0;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    if public.current_user_role() <> 'admin' then
        raise exception 'Only admin can generate deliveries';
    end if;

    -- Morning or Evening single delivery customers
    insert into public.deliveries (
        admin_id,
        customer_id,
        route_id,
        delivery_boy_id,
        delivery_date,
        delivery_time,
        quantity,
        unit_price,
        delivery_status,
        payment_status
    )
    select
        c.admin_id,
        c.id,
        c.route_id,
        db.id,
        current_date,
        case
            when c.delivery_time = 'Evening' then 'Evening'
            else 'Morning'
        end,
        case
            when c.delivery_time = 'Evening' then c.evening_quantity
            else c.morning_quantity
        end,
        c.price_per_liter,
        'Pending',
        'Unpaid'
    from public.customers c
    left join public.delivery_boys db
        on db.assigned_route_id = c.route_id
        and db.admin_id = c.admin_id
        and db.status = 'active'
    where c.admin_id = auth.uid()
      and c.status = 'active'
      and c.delivery_time in ('Morning', 'Evening')
    on conflict (customer_id, delivery_date, delivery_time) do nothing;

    get diagnostics inserted_now = row_count;
    inserted_total := inserted_total + inserted_now;

    -- Both: Morning
    insert into public.deliveries (
        admin_id,
        customer_id,
        route_id,
        delivery_boy_id,
        delivery_date,
        delivery_time,
        quantity,
        unit_price,
        delivery_status,
        payment_status
    )
    select
        c.admin_id,
        c.id,
        c.route_id,
        db.id,
        current_date,
        'Morning',
        c.morning_quantity,
        c.price_per_liter,
        'Pending',
        'Unpaid'
    from public.customers c
    left join public.delivery_boys db
        on db.assigned_route_id = c.route_id
        and db.admin_id = c.admin_id
        and db.status = 'active'
    where c.admin_id = auth.uid()
      and c.status = 'active'
      and c.delivery_time = 'Both'
    on conflict (customer_id, delivery_date, delivery_time) do nothing;

    get diagnostics inserted_now = row_count;
    inserted_total := inserted_total + inserted_now;

    -- Both: Evening
    insert into public.deliveries (
        admin_id,
        customer_id,
        route_id,
        delivery_boy_id,
        delivery_date,
        delivery_time,
        quantity,
        unit_price,
        delivery_status,
        payment_status
    )
    select
        c.admin_id,
        c.id,
        c.route_id,
        db.id,
        current_date,
        'Evening',
        c.evening_quantity,
        c.price_per_liter,
        'Pending',
        'Unpaid'
    from public.customers c
    left join public.delivery_boys db
        on db.assigned_route_id = c.route_id
        and db.admin_id = c.admin_id
        and db.status = 'active'
    where c.admin_id = auth.uid()
      and c.status = 'active'
      and c.delivery_time = 'Both'
    on conflict (customer_id, delivery_date, delivery_time) do nothing;

    get diagnostics inserted_now = row_count;
    inserted_total := inserted_total + inserted_now;

    return inserted_total;
end;
$$;

create or replace function public.delivery_boy_update_today_delivery(
    p_delivery_id uuid,
    p_delivery_status text,
    p_payment_status text,
    p_skip_reason text default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
    current_db_id uuid;
    updated_delivery public.deliveries;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    if public.current_user_role() <> 'delivery_boy' then
        raise exception 'Only delivery boy can use this function';
    end if;

    if p_delivery_status not in ('Pending', 'Delivered', 'Skipped', 'Cancelled') then
        raise exception 'Invalid delivery status';
    end if;

    if p_payment_status not in ('Paid', 'Unpaid') then
        raise exception 'Invalid payment status';
    end if;

    select id
    into current_db_id
    from public.delivery_boys
    where profile_id = auth.uid()
      and status = 'active'
    limit 1;

    if current_db_id is null then
        raise exception 'Delivery boy profile not found';
    end if;

    update public.deliveries
    set
        delivery_status = p_delivery_status,
        payment_status = p_payment_status,
        skip_reason = case
            when p_delivery_status = 'Skipped' then p_skip_reason
            else null
        end,
        updated_at = now()
    where id = p_delivery_id
      and delivery_boy_id = current_db_id
      and delivery_date = current_date
    returning * into updated_delivery;

    if updated_delivery.id is null then
        raise exception 'Delivery not found or not allowed';
    end if;

    return updated_delivery;
end;
$$;

-- =========================================================
-- 16. TODAY DELIVERY VIEW
-- Security invoker keeps RLS behavior for user queries.
-- =========================================================

create or replace view public.today_delivery_view
with (security_invoker = true)
as
select
    d.id,
    d.admin_id,
    d.customer_id,
    d.product_id,
    d.delivery_boy_id,
    d.route_id,
    r.route_name,
    c.full_name as customer_name,
    c.phone as customer_phone,
    c.address as customer_address,
    d.delivery_date,
    d.delivery_time,
    d.quantity,
    d.unit_price,
    d.total_amount,
    d.delivery_status,
    d.payment_status,
    d.skip_reason,
    db.full_name as delivery_boy_name
from public.deliveries d
join public.customers c on c.id = d.customer_id
left join public.routes r on r.id = d.route_id
left join public.delivery_boys db on db.id = d.delivery_boy_id
where d.delivery_date = current_date;

-- =========================================================
-- 17. ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.routes enable row level security;
alter table public.delivery_boys enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.whatsapp_otp_requests enable row level security;

-- =========================================================
-- 18. RLS POLICIES
-- =========================================================

-- PROFILES
create policy "profiles_select_policy"
on public.profiles
for select
to authenticated
using (
    id = auth.uid()
    or admin_id = public.current_admin_id()
    or id = public.current_admin_id()
);

create policy "profiles_insert_policy"
on public.profiles
for insert
to authenticated
with check (
    id = auth.uid()
);

create policy "profiles_update_policy"
on public.profiles
for update
to authenticated
using (
    id = auth.uid()
    or (
        public.current_user_role() = 'admin'
        and admin_id = auth.uid()
    )
)
with check (
    id = auth.uid()
    or (
        public.current_user_role() = 'admin'
        and admin_id = auth.uid()
    )
);

-- ROUTES
create policy "routes_select_policy"
on public.routes
for select
to authenticated
using (
    admin_id = public.current_admin_id()
);

create policy "routes_insert_policy"
on public.routes
for insert
to authenticated
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "routes_update_policy"
on public.routes
for update
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
)
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "routes_delete_policy"
on public.routes
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- DELIVERY BOYS
create policy "delivery_boys_select_policy"
on public.delivery_boys
for select
to authenticated
using (
    admin_id = public.current_admin_id()
    or profile_id = auth.uid()
);

create policy "delivery_boys_insert_policy"
on public.delivery_boys
for insert
to authenticated
with check (
    admin_id = public.current_admin_id()
);

create policy "delivery_boys_update_policy"
on public.delivery_boys
for update
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
)
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "delivery_boys_delete_policy"
on public.delivery_boys
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- CUSTOMERS
create policy "customers_select_policy"
on public.customers
for select
to authenticated
using (
    admin_id = public.current_admin_id()
);

create policy "customers_insert_policy"
on public.customers
for insert
to authenticated
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or (
        admin_id = public.current_admin_id()
        and public.current_user_role() = 'delivery_boy'
    )
);

create policy "customers_update_policy"
on public.customers
for update
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
)
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "customers_delete_policy"
on public.customers
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- PRODUCTS
create policy "products_select_policy"
on public.products
for select
to authenticated
using (
    admin_id = public.current_admin_id()
);

create policy "products_insert_policy"
on public.products
for insert
to authenticated
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "products_update_policy"
on public.products
for update
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
)
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "products_delete_policy"
on public.products
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- DELIVERIES
create policy "deliveries_select_policy"
on public.deliveries
for select
to authenticated
using (
    admin_id = public.current_admin_id()
);

create policy "deliveries_insert_policy"
on public.deliveries
for insert
to authenticated
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or (
        public.current_user_role() = 'delivery_boy'
        and admin_id = public.current_admin_id()
        and delivery_date = current_date
        and exists (
            select 1
            from public.profiles p
            join public.delivery_boys db on db.id = p.delivery_boy_id
            where p.id = auth.uid()
              and p.status = 'active'
              and p.role = 'delivery_boy'
              and db.status = 'active'
              and db.admin_id = public.deliveries.admin_id
              and db.id = public.deliveries.delivery_boy_id
              and (
                  public.deliveries.route_id is null
                  or db.assigned_route_id = public.deliveries.route_id
              )
        )
    )
);

create policy "deliveries_update_policy"
on public.deliveries
for update
to authenticated
using (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or
    (
        public.current_user_role() = 'delivery_boy'
        and delivery_date = current_date
        and delivery_boy_id in (
            select db.id
            from public.delivery_boys db
            where db.profile_id = auth.uid()
              and db.status = 'active'
        )
    )
)
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or
    (
        public.current_user_role() = 'delivery_boy'
        and delivery_date = current_date
        and delivery_boy_id in (
            select db.id
            from public.delivery_boys db
            where db.profile_id = auth.uid()
              and db.status = 'active'
        )
    )
);

create policy "deliveries_delete_policy"
on public.deliveries
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- PAYMENTS
create policy "payments_select_policy"
on public.payments
for select
to authenticated
using (
    admin_id = public.current_admin_id()
);

create policy "payments_insert_policy"
on public.payments
for insert
to authenticated
with check (
    admin_id = public.current_admin_id()
);

create policy "payments_update_policy"
on public.payments
for update
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
)
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "payments_delete_policy"
on public.payments
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- INVOICES
create policy "invoices_select_policy"
on public.invoices
for select
to authenticated
using (
    admin_id = public.current_admin_id()
);

create policy "invoices_insert_policy"
on public.invoices
for insert
to authenticated
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "invoices_update_policy"
on public.invoices
for update
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
)
with check (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

create policy "invoices_delete_policy"
on public.invoices
for delete
to authenticated
using (
    admin_id = auth.uid()
    and public.current_user_role() = 'admin'
);

-- INVOICE ITEMS
create policy "invoice_items_select_policy"
on public.invoice_items
for select
to authenticated
using (
    exists (
        select 1
        from public.invoices i
        where i.id = invoice_items.invoice_id
          and i.admin_id = public.current_admin_id()
    )
);

create policy "invoice_items_insert_policy"
on public.invoice_items
for insert
to authenticated
with check (
    exists (
        select 1
        from public.invoices i
        where i.id = invoice_items.invoice_id
          and i.admin_id = auth.uid()
          and public.current_user_role() = 'admin'
    )
);

create policy "invoice_items_update_policy"
on public.invoice_items
for update
to authenticated
using (
    exists (
        select 1
        from public.invoices i
        where i.id = invoice_items.invoice_id
          and i.admin_id = auth.uid()
          and public.current_user_role() = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.invoices i
        where i.id = invoice_items.invoice_id
          and i.admin_id = auth.uid()
          and public.current_user_role() = 'admin'
    )
);

create policy "invoice_items_delete_policy"
on public.invoice_items
for delete
to authenticated
using (
    exists (
        select 1
        from public.invoices i
        where i.id = invoice_items.invoice_id
          and i.admin_id = auth.uid()
          and public.current_user_role() = 'admin'
    )
);

-- OTP TABLE: no direct app access.
-- Edge Functions should use service role key.
create policy "otp_no_direct_select"
on public.whatsapp_otp_requests
for select
to authenticated
using (false);

create policy "otp_no_direct_insert"
on public.whatsapp_otp_requests
for insert
to authenticated
with check (false);

create policy "otp_no_direct_update"
on public.whatsapp_otp_requests
for update
to authenticated
using (false)
with check (false);

create policy "otp_no_direct_delete"
on public.whatsapp_otp_requests
for delete
to authenticated
using (false);

-- =========================================================
-- 19. GRANTS
-- =========================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.routes to authenticated;
grant select, insert, update, delete on public.delivery_boys to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.deliveries to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
grant select on public.today_delivery_view to authenticated;

grant execute on function public.current_admin_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.generate_admin_access_code() to authenticated;
grant execute on function public.create_admin_profile(text, text, text, text) to authenticated;
grant execute on function public.create_delivery_boy_profile(text, text, text, text) to authenticated;
grant execute on function public.generate_today_deliveries() to authenticated;
grant execute on function public.delivery_boy_update_today_delivery(uuid, text, text, text) to authenticated;

-- These OTP functions should be used by Edge Functions with service role.
grant execute on function public.generate_otp_code() to service_role;
grant execute on function public.create_whatsapp_otp_request(text, text, text, text, text, text, text) to service_role;
grant execute on function public.verify_whatsapp_otp(text, text) to service_role;

-- =========================================================
-- 20. LATEST ADMIN OTP + DELIVERY QR LOGIN UPDATE
-- =========================================================

create index idx_profiles_normalized_phone on public.profiles(normalized_phone);
create index idx_profiles_login_enabled on public.profiles(login_enabled);
create index idx_profiles_seeded_by_developer on public.profiles(seeded_by_developer);

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

update public.profiles
set normalized_phone = public.normalize_indian_phone(phone)
where phone is not null and normalized_phone is null;

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
    select count(*) into recent_count from public.whatsapp_otp_requests
    where phone = v_phone and created_at > now() - interval '60 seconds';
    if recent_count > 0 then raise exception 'Please wait before requesting another OTP'; end if;
    select count(*) into today_count from public.whatsapp_otp_requests
    where phone = v_phone and created_at::date = current_date;
    if today_count >= 5 then raise exception 'Daily OTP limit reached'; end if;
    delete from public.whatsapp_otp_requests where phone = v_phone and is_verified = false;
    insert into public.whatsapp_otp_requests (
        phone, otp_hash, purpose, role, admin_access_code, expires_at, ip_address, device_id
    ) values (
        v_phone, extensions.crypt(p_otp, extensions.gen_salt('bf')), p_purpose, p_role, p_admin_access_code,
        now() + interval '5 minutes', p_ip_address, p_device_id
    ) returning id into request_id;
    return request_id;
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
    select * into otp_row from public.whatsapp_otp_requests
    where phone = v_phone and is_verified = false and expires_at > now()
    order by created_at desc limit 1;
    if otp_row.id is null or otp_row.attempts >= otp_row.max_attempts then return false; end if;
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
    v_phone text := public.normalize_indian_phone(p_phone);
begin
    if not exists (
        select 1 from public.whatsapp_otp_requests
        where phone = v_phone and is_verified = true and verified_at > now() - interval '15 minutes'
    ) then raise exception 'Mobile number is not verified'; end if;
    return query
    select p.id, p.full_name, p.dairy_name, p.email, p.auth_email, p.phone, p.normalized_phone,
           p.role, p.admin_id, p.admin_access_code, p.login_enabled, p.status
    from public.profiles p
    where p.role = 'admin' and p.normalized_phone = v_phone and p.status = 'active'
      and p.login_enabled = true
    limit 1;
end;
$$;

create table public.delivery_qr_login_tokens (
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

create index idx_delivery_qr_tokens_admin_id on public.delivery_qr_login_tokens(admin_id);
create index idx_delivery_qr_tokens_delivery_boy_id on public.delivery_qr_login_tokens(delivery_boy_id);
create index idx_delivery_qr_tokens_status on public.delivery_qr_login_tokens(status);
create index idx_delivery_qr_tokens_expires_at on public.delivery_qr_login_tokens(expires_at);

create trigger set_delivery_qr_tokens_updated_at
before update on public.delivery_qr_login_tokens
for each row execute function public.set_updated_at();

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
    v_token_id uuid;
    v_expires_at timestamptz;
begin
    if auth.uid() is null or public.current_user_role() <> 'admin' then raise exception 'Only admin can generate delivery boy QR'; end if;
    if not exists (
        select 1 from public.delivery_boys
        where id = p_delivery_boy_id and admin_id = auth.uid() and status = 'active'
    ) then raise exception 'Delivery boy not found under this admin'; end if;
    update public.delivery_qr_login_tokens set status = 'revoked', revoked_at = now()
    where delivery_boy_id = p_delivery_boy_id and status = 'active';
    v_expires_at := now() + make_interval(mins => p_expires_minutes);
    insert into public.delivery_qr_login_tokens (
        admin_id, delivery_boy_id, token_hash, expires_at, qr_label, created_by
    ) values (
        auth.uid(), p_delivery_boy_id, extensions.crypt(p_raw_token, extensions.gen_salt('bf')), v_expires_at, p_qr_label, auth.uid()
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
    for token_row in select t.* from public.delivery_qr_login_tokens t
        where t.status = 'active' and t.expires_at > now() order by t.created_at desc
    loop
        if token_row.token_hash = extensions.crypt(p_raw_token, token_row.token_hash) then
            update public.delivery_qr_login_tokens
            set status = 'used', used_at = now(), device_id = p_device_id where id = token_row.id;
            update public.profiles set last_login_at = now(), last_login_method = 'qr_scan'
            where id = (select db.profile_id from public.delivery_boys db where db.id = token_row.delivery_boy_id);
            return query
            select db.profile_id, db.admin_id, db.id, db.full_name, db.email, p.auth_email,
                   db.phone, db.assigned_route_id, p.qr_login_enabled, p.status
            from public.delivery_boys db join public.profiles p on p.id = db.profile_id
            where db.id = token_row.delivery_boy_id and db.status = 'active'
              and p.status = 'active' and p.qr_login_enabled = true and p.role = 'delivery_boy'
            limit 1;
            return;
        end if;
    end loop;
    raise exception 'Invalid or expired QR token';
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
    inserted_total integer;
begin
    if auth.uid() is null or public.current_user_role() <> 'admin' then raise exception 'Only admin can generate deliveries'; end if;
    insert into public.deliveries (
        admin_id, customer_id, route_id, delivery_boy_id, delivery_date, delivery_time,
        quantity, unit_price, total_amount, delivery_status, payment_status
    )
    select c.admin_id, c.id, c.route_id, db.id, p_delivery_date, shifts.delivery_time,
           shifts.quantity, c.price_per_liter, shifts.quantity * c.price_per_liter, 'Pending', 'Unpaid'
    from public.customers c
    cross join lateral (
        values ('Morning'::text, c.morning_quantity), ('Evening'::text, c.evening_quantity)
    ) as shifts(delivery_time, quantity)
    left join public.delivery_boys db
      on db.assigned_route_id = c.route_id and db.admin_id = c.admin_id and db.status = 'active'
    where c.admin_id = auth.uid() and c.status = 'active'
      and (p_route_id is null or c.route_id = p_route_id) and shifts.quantity > 0
    on conflict (customer_id, delivery_date, delivery_time) do nothing;
    get diagnostics inserted_total = row_count;
    return inserted_total;
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
    select * into v_profile from public.profiles
    where id = auth.uid() and role = 'delivery_boy' and status = 'active';
    if not found or v_profile.admin_id is null or v_profile.delivery_boy_id is null then
        raise exception 'Delivery boy access is required';
    end if;
    select d.* into v_delivery
    from public.deliveries d
    join public.delivery_boys b on b.id = v_profile.delivery_boy_id
    where d.id = p_delivery_id and d.admin_id = v_profile.admin_id
      and d.delivery_boy_id = v_profile.delivery_boy_id
      and d.route_id = b.assigned_route_id and d.delivery_date = current_date
      and b.status = 'active'
    for update;
    if not found then raise exception 'Delivery is not assigned for today'; end if;
    v_next_delivery_status := coalesce(p_delivery_status, v_delivery.delivery_status);
    v_next_payment_status := coalesce(p_payment_status, v_delivery.payment_status);
    if v_next_delivery_status not in ('Pending', 'Delivered', 'Skipped') then raise exception 'Invalid delivery status'; end if;
    if v_next_payment_status not in ('Unpaid', 'Paid') then raise exception 'Invalid payment status'; end if;
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
            admin_id, customer_id, invoice_id, delivery_id, collected_by,
            amount, payment_date, payment_method, notes
        ) values (
            v_delivery.admin_id, v_delivery.customer_id, null, v_delivery.id, v_profile.delivery_boy_id,
            v_delivery.total_amount, current_date, 'Cash', 'Collected by delivery boy'
        )
        on conflict (delivery_id, collected_by) where delivery_id is not null and collected_by is not null
        do update set amount = excluded.amount, payment_date = excluded.payment_date, updated_at = now();
    end if;
    return v_delivery;
end;
$$;

alter table public.delivery_qr_login_tokens enable row level security;

create policy "delivery_qr_tokens_select_policy" on public.delivery_qr_login_tokens
for select to authenticated using (admin_id = auth.uid() and public.current_user_role() = 'admin');
create policy "delivery_qr_tokens_update_policy" on public.delivery_qr_login_tokens
for update to authenticated
using (admin_id = auth.uid() and public.current_user_role() = 'admin')
with check (admin_id = auth.uid() and public.current_user_role() = 'admin');
create policy "delivery_qr_tokens_delete_policy" on public.delivery_qr_login_tokens
for delete to authenticated using (admin_id = auth.uid() and public.current_user_role() = 'admin');

grant select, update on public.delivery_qr_login_tokens to authenticated;
revoke execute on function public.create_whatsapp_otp_request(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.verify_whatsapp_otp(text, text) from public, anon, authenticated;
revoke execute on function public.get_admin_by_verified_phone(text) from public, anon, authenticated;
revoke execute on function public.consume_delivery_qr_token(text, text) from public, anon, authenticated;
grant execute on function public.normalize_indian_phone(text) to authenticated, service_role;
grant execute on function public.admin_create_delivery_qr_token(uuid, text, int, text) to authenticated;
grant execute on function public.create_whatsapp_otp_request(text, text, text, text, text, text, text) to service_role;
grant execute on function public.verify_whatsapp_otp(text, text) to service_role;
grant execute on function public.get_admin_by_verified_phone(text) to service_role;
grant execute on function public.consume_delivery_qr_token(text, text) to service_role;
grant execute on function public.generate_today_deliveries(date, uuid) to authenticated;

notify pgrst, 'reload schema';

-- =========================================================
-- DONE
-- =========================================================


-- =========================================================
-- Included from supabase\migrations\202606040001_fix_delivery_boy_account_and_reusable_qr.sql
-- =========================================================

create or replace function public.admin_upsert_delivery_boy_account(
    p_delivery_boy_id uuid default null,
    p_full_name text default '',
    p_email text default '',
    p_phone text default null,
    p_assigned_route_id uuid default null,
    p_active boolean default true
)
returns table (delivery_boy_id uuid, profile_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin_id uuid := auth.uid();
    v_email text := lower(trim(coalesce(p_email, '')));
    v_full_name text := trim(coalesce(p_full_name, ''));
    v_phone text := public.normalize_indian_phone(p_phone);
    v_status text := case when p_active then 'active' else 'inactive' end;
    v_user_id uuid;
    v_delivery_boy_id uuid;
begin
    if v_admin_id is null then
        raise exception 'Admin login is required';
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = v_admin_id
          and p.role = 'admin'
          and p.status = 'active'
    ) then
        raise exception 'Only admin can create delivery boy accounts';
    end if;

    if v_full_name = '' then
        raise exception 'Delivery boy name is required';
    end if;

    if v_email = '' then
        raise exception 'Delivery boy email is required for QR login';
    end if;

    select u.id into v_user_id
    from auth.users u
    where lower(u.email) = v_email
    limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            phone,
            encrypted_password,
            email_confirmed_at,
            phone_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            is_sso_user,
            is_anonymous
        ) values (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            nullif(v_phone, ''),
            extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
            now(),
            now(),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('full_name', v_full_name, 'phone', v_phone, 'role', 'delivery_boy'),
            now(),
            now(),
            false,
            false
        );
    else
        update auth.users u
        set instance_id = coalesce(u.instance_id, '00000000-0000-0000-0000-000000000000'),
            phone = nullif(v_phone, ''),
            encrypted_password = coalesce(u.encrypted_password, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))),
            email_confirmed_at = coalesce(u.email_confirmed_at, now()),
            phone_confirmed_at = coalesce(u.phone_confirmed_at, now()),
            confirmation_token = coalesce(u.confirmation_token, ''),
            recovery_token = coalesce(u.recovery_token, ''),
            email_change = coalesce(u.email_change, ''),
            email_change_token_new = coalesce(u.email_change_token_new, ''),
            email_change_token_current = coalesce(u.email_change_token_current, ''),
            phone_change = coalesce(u.phone_change, ''),
            phone_change_token = coalesce(u.phone_change_token, ''),
            reauthentication_token = coalesce(u.reauthentication_token, ''),
            raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) ||
                jsonb_build_object('full_name', v_full_name, 'phone', v_phone, 'role', 'delivery_boy'),
            updated_at = now()
        where u.id = v_user_id;
    end if;

    if not exists (select 1 from auth.identities i where i.user_id = v_user_id and i.provider = 'email') then
        insert into auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            created_at,
            updated_at
        ) values (
            v_email,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone', v_phone),
            'email',
            now(),
            now()
        );
    else
        update auth.identities i
        set provider_id = v_email,
            identity_data = coalesce(i.identity_data, '{}'::jsonb) ||
                jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone', v_phone),
            updated_at = now()
        where i.user_id = v_user_id
          and i.provider = 'email';
    end if;

    if p_delivery_boy_id is not null then
        update public.delivery_boys db
        set profile_id = v_user_id,
            full_name = v_full_name,
            phone = nullif(v_phone, ''),
            email = v_email,
            assigned_route_id = p_assigned_route_id,
            status = v_status,
            updated_at = now()
        where db.id = p_delivery_boy_id
          and db.admin_id = v_admin_id
        returning db.id into v_delivery_boy_id;

        if v_delivery_boy_id is null then
            raise exception 'Delivery boy not found under this admin';
        end if;
    else
        select db.id into v_delivery_boy_id
        from public.delivery_boys db
        where db.admin_id = v_admin_id
          and (
              db.profile_id = v_user_id
              or lower(coalesce(db.email, '')) = v_email
              or (v_phone <> '' and public.normalize_indian_phone(db.phone) = v_phone)
          )
        order by db.created_at desc
        limit 1;

        if v_delivery_boy_id is null then
            insert into public.delivery_boys (
                admin_id,
                profile_id,
                full_name,
                phone,
                email,
                assigned_route_id,
                status,
                updated_at
            ) values (
                v_admin_id,
                v_user_id,
                v_full_name,
                nullif(v_phone, ''),
                v_email,
                p_assigned_route_id,
                v_status,
                now()
            )
            returning id into v_delivery_boy_id;
        else
            update public.delivery_boys db
            set profile_id = v_user_id,
                full_name = v_full_name,
                phone = nullif(v_phone, ''),
                email = v_email,
                assigned_route_id = p_assigned_route_id,
                status = v_status,
                updated_at = now()
            where db.id = v_delivery_boy_id;
        end if;
    end if;

    insert into public.profiles (
        id,
        admin_id,
        delivery_boy_id,
        full_name,
        email,
        auth_email,
        phone,
        normalized_phone,
        role,
        phone_verified,
        login_enabled,
        qr_login_enabled,
        status,
        updated_at
    ) values (
        v_user_id,
        v_admin_id,
        v_delivery_boy_id,
        v_full_name,
        v_email,
        v_email,
        nullif(v_phone, ''),
        nullif(v_phone, ''),
        'delivery_boy',
        true,
        true,
        true,
        v_status,
        now()
    )
    on conflict (id) do update set
        admin_id = excluded.admin_id,
        delivery_boy_id = excluded.delivery_boy_id,
        full_name = excluded.full_name,
        email = excluded.email,
        auth_email = excluded.auth_email,
        phone = excluded.phone,
        normalized_phone = excluded.normalized_phone,
        role = 'delivery_boy',
        phone_verified = true,
        login_enabled = true,
        qr_login_enabled = true,
        status = excluded.status,
        updated_at = now();

    return query select v_delivery_boy_id, v_user_id;
end;
$$;

grant execute on function public.admin_upsert_delivery_boy_account(uuid, text, text, text, uuid, boolean) to authenticated;

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
        select t.*
        from public.delivery_qr_login_tokens t
        where t.status = 'active'
          and t.expires_at > now()
        order by t.created_at desc
    loop
        if token_row.token_hash = extensions.crypt(p_raw_token, token_row.token_hash) then
            return query
            select
                db.profile_id,
                db.admin_id,
                db.id,
                db.full_name,
                db.email,
                coalesce(p.auth_email, au.email),
                db.phone,
                db.assigned_route_id,
                p.qr_login_enabled,
                p.status
            from public.delivery_boys db
            join public.profiles p on p.id = db.profile_id
            left join auth.users au on au.id = db.profile_id
            where db.id = token_row.delivery_boy_id
              and db.status = 'active'
              and p.status = 'active'
              and p.qr_login_enabled = true
              and p.role = 'delivery_boy'
              and coalesce(p.auth_email, au.email, db.email) is not null
            limit 1;

            if found then
                update public.delivery_qr_login_tokens t
                set used_at = now(),
                    device_id = p_device_id
                where t.id = token_row.id;

                update public.profiles p
                set last_login_at = now(),
                    last_login_method = 'qr_scan'
                where p.id = (
                    select db.profile_id
                    from public.delivery_boys db
                    where db.id = token_row.delivery_boy_id
                );
                return;
            end if;

            raise exception 'Delivery boy account is not active or is not linked for QR login';
        end if;
    end loop;

    raise exception 'Invalid or expired QR token';
end;
$$;

revoke execute on function public.consume_delivery_qr_token(text, text) from public, anon, authenticated;
grant execute on function public.consume_delivery_qr_token(text, text) to service_role;

notify pgrst, 'reload schema';


-- =========================================================
-- Included from supabase\migrations\202606040004_stage_delivery_boy_completion.sql
-- =========================================================

alter table public.deliveries
  add column if not exists delivery_boy_status text
    check (delivery_boy_status is null or delivery_boy_status in ('Pending', 'Delivered', 'Skipped')),
  add column if not exists delivery_boy_skip_reason text,
  add column if not exists delivery_completed_at timestamptz,
  add column if not exists is_extra_delivery boolean not null default false;

update public.deliveries
set delivery_status = 'Pending',
    payment_status = 'Unpaid',
    skip_reason = null,
    updated_at = now()
where delivery_date = current_date
  and delivery_status = 'Delivered'
  and delivery_completed_at is null;

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
  d.delivery_boy_status,
  d.payment_status,
  d.skip_reason,
  d.delivery_boy_skip_reason,
  d.delivery_completed_at,
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

create or replace function public.delivery_boy_update_today_delivery(
  p_delivery_id uuid,
  p_delivery_status text default null,
  p_payment_status text default null,
  p_skip_reason text default null,
  p_product_id uuid default null,
  p_quantity numeric default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_delivery public.deliveries%rowtype;
  v_product public.products%rowtype;
  v_next_boy_status text;
  v_next_product_id uuid;
  v_next_quantity numeric;
  v_next_unit_price numeric;
  v_next_total_amount numeric;
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

  if v_delivery.delivery_completed_at is not null
     and (p_delivery_status is not null or p_product_id is not null or p_quantity is not null) then
    raise exception 'Today delivery is already completed';
  end if;

  v_next_boy_status := coalesce(p_delivery_status, v_delivery.delivery_boy_status, v_delivery.delivery_status, 'Pending');
  v_next_product_id := coalesce(p_product_id, v_delivery.product_id);
  v_next_quantity := coalesce(p_quantity, v_delivery.quantity);
  v_next_unit_price := v_delivery.unit_price;

  if v_next_boy_status not in ('Pending', 'Delivered', 'Skipped') then
    raise exception 'Invalid delivery status';
  end if;

  if p_payment_status is not null and p_payment_status not in ('Unpaid', 'Paid') then
    raise exception 'Invalid payment status';
  end if;

  if v_next_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  if p_product_id is not null then
    select *
    into v_product
    from public.products
    where id = p_product_id
      and admin_id = v_profile.admin_id
      and status = 'active';

    if not found then
      raise exception 'Product is not available';
    end if;

    v_next_unit_price := v_product.price;
  end if;

  v_next_total_amount := case
    when v_next_boy_status = 'Skipped' then 0
    else v_next_quantity * v_next_unit_price
  end;

  update public.deliveries
  set product_id = v_next_product_id,
      quantity = v_next_quantity,
      unit_price = v_next_unit_price,
      total_amount = v_next_total_amount,
      delivery_boy_status = v_next_boy_status,
      delivery_boy_skip_reason = case
        when v_next_boy_status = 'Skipped' then coalesce(nullif(p_skip_reason, ''), 'Skipped by delivery boy')
        when v_next_boy_status = 'Delivered' then null
        else delivery_boy_skip_reason
      end,
      payment_status = coalesce(p_payment_status, payment_status),
      updated_at = now()
  where id = p_delivery_id
  returning * into v_delivery;

  return v_delivery;
end;
$$;

create or replace function public.delivery_boy_complete_today_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_count integer;
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

  update public.deliveries d
  set delivery_status = d.delivery_boy_status,
      total_amount = case
        when d.delivery_boy_status = 'Skipped' then 0
        else d.quantity * d.unit_price
      end,
      payment_status = case
        when d.delivery_boy_status = 'Skipped' then 'Unpaid'
        else d.payment_status
      end,
      skip_reason = case
        when d.delivery_boy_status = 'Skipped' then coalesce(d.delivery_boy_skip_reason, 'Skipped by delivery boy')
        else null
      end,
      delivery_completed_at = now(),
      updated_at = now()
  from public.delivery_boys b
  where b.id = v_profile.delivery_boy_id
    and b.admin_id = v_profile.admin_id
    and b.status = 'active'
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and d.delivery_completed_at is null
    and d.delivery_boy_status in ('Delivered', 'Skipped');

  get diagnostics v_count = row_count;

  delete from public.payments p
  using public.deliveries d
  where p.delivery_id = d.id
    and p.collected_by = v_profile.delivery_boy_id
    and d.delivery_date = current_date
    and d.delivery_status = 'Skipped';

  return v_count;
end;
$$;

create or replace function public.delivery_boy_add_extra_today_product(
  p_delivery_id uuid,
  p_product_id uuid,
  p_quantity numeric
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_base_delivery public.deliveries%rowtype;
  v_product public.products%rowtype;
  v_extra_count integer;
  v_delivery_time text;
  v_inserted public.deliveries%rowtype;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

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
  into v_base_delivery
  from public.deliveries d
  join public.delivery_boys b on b.id = v_profile.delivery_boy_id
  where d.id = p_delivery_id
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and b.status = 'active';

  if not found then
    raise exception 'Delivery is not assigned for today';
  end if;

  if v_base_delivery.delivery_completed_at is not null then
    raise exception 'Today delivery is already completed';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
    and admin_id = v_profile.admin_id
    and status = 'active';

  if not found then
    raise exception 'Product is not available';
  end if;

  select count(*)
  into v_extra_count
  from public.deliveries
  where admin_id = v_profile.admin_id
    and customer_id = v_base_delivery.customer_id
    and delivery_date = current_date
    and delivery_time like v_base_delivery.delivery_time || ' Extra%';

  v_delivery_time := v_base_delivery.delivery_time || ' Extra';
  if v_extra_count > 0 then
    v_delivery_time := v_delivery_time || ' ' || (v_extra_count + 1)::text;
  end if;

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
    delivery_boy_status,
    payment_status,
    notes,
    is_extra_delivery
  ) values (
    v_profile.admin_id,
    v_base_delivery.customer_id,
    p_product_id,
    v_base_delivery.route_id,
    v_profile.delivery_boy_id,
    current_date,
    v_delivery_time,
    p_quantity,
    v_product.price,
    p_quantity * v_product.price,
    'Pending',
    'Delivered',
    'Unpaid',
    'Extra product added by delivery boy',
    true
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

grant select on public.today_delivery_view to authenticated;
grant execute on function public.delivery_boy_update_today_delivery(uuid, text, text, text, uuid, numeric) to authenticated;
grant execute on function public.delivery_boy_complete_today_deliveries() to authenticated;
grant execute on function public.delivery_boy_add_extra_today_product(uuid, uuid, numeric) to authenticated;


-- =========================================================
-- Compatibility RPC used by InvoiceRepository
-- =========================================================

drop function if exists public.generate_monthly_invoices(text, uuid, uuid);
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
  if v_admin_id is null or public.current_user_role() <> 'admin' then
    raise exception 'Admin access is required';
  end if;

  -- Current Android billing flow creates invoices/items client-side.
  -- Keep this RPC present for app compatibility and future server-side generation.
  return 0;
end;
$$;

grant execute on function public.generate_monthly_invoices(text, uuid, uuid) to authenticated;
notify pgrst, 'reload schema';


-- =========================================================
-- Included from supabase\migrations\202606110001_secure_whatsapp_otp_login.sql
-- =========================================================

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


-- =========================================================
-- Included from supabase\migrations\202606150001_payments_invoice_flow.sql
-- =========================================================

alter table public.invoices
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists billing_month text,
  add column if not exists generated_at timestamptz default now(),
  add column if not exists total_amount numeric not null default 0,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists previous_balance numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists balance_amount numeric not null default 0,
  add column if not exists status text not null default 'Unpaid';

update public.invoices
set generated_at = coalesce(generated_at, created_at, now())
where generated_at is null;

alter table public.payments
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists amount numeric not null default 0,
  add column if not exists payment_mode text,
  add column if not exists payment_method text,
  add column if not exists transaction_id text,
  add column if not exists received_at timestamptz default now();

update public.payments
set payment_method = coalesce(payment_method, payment_mode, 'Cash'),
    payment_mode = coalesce(payment_mode, payment_method, 'Cash'),
    received_at = coalesce(received_at, created_at, now())
where payment_method is null
   or payment_mode is null
   or received_at is null;

create unique index if not exists invoices_unique_admin_customer_month_idx
on public.invoices(admin_id, customer_id, billing_month)
where customer_id is not null and billing_month is not null;

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
  v_session_admin_id uuid := auth.uid();
  v_admin_id uuid;
  v_start date;
  v_end date;
  v_customer record;
  v_invoice_id uuid;
  v_invoice_count integer := 0;
  v_subtotal numeric;
  v_previous_balance numeric;
  v_total numeric;
begin
  if p_billing_month !~ '^\d{4}-\d{2}$' then
    raise exception 'Billing month must be yyyy-mm.';
  end if;

  v_start := (p_billing_month || '-01')::date;
  v_end := (v_start + interval '1 month - 1 day')::date;

  for v_admin_id in
    select v_session_admin_id
    where v_session_admin_id is not null
    union
    select distinct c.admin_id
    from public.customers c
    where v_session_admin_id is null
      and c.admin_id is not null
  loop
    for v_customer in
      select c.*
      from public.customers c
      where c.admin_id = v_admin_id
        and lower(coalesce(c.status, 'active')) = 'active'
        and (p_customer_id is null or c.id = p_customer_id)
        and (p_route_id is null or c.route_id = p_route_id)
        and not exists (
          select 1
          from public.invoices i
          where i.admin_id = v_admin_id
            and i.customer_id = c.id
            and i.billing_month = p_billing_month
        )
    loop
      select coalesce(sum(d.total_amount), 0)
      into v_subtotal
      from public.deliveries d
      where d.admin_id = v_admin_id
        and d.customer_id = v_customer.id
        and d.delivery_status = 'Delivered'
        and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
        and d.delivery_date between v_start and v_end;

      select coalesce(sum(i.balance_amount), 0)
      into v_previous_balance
      from public.invoices i
      where i.admin_id = v_admin_id
        and i.customer_id = v_customer.id
        and i.billing_month < p_billing_month
        and i.status <> 'Paid';

      v_previous_balance := coalesce(v_customer.opening_balance, 0) + coalesce(v_previous_balance, 0);
      v_total := coalesce(v_subtotal, 0) + coalesce(v_previous_balance, 0);

      if v_total > 0 then
        insert into public.invoices (
          admin_id,
          customer_id,
          invoice_number,
          billing_month,
          generated_at,
          subtotal,
          previous_balance,
          total_amount,
          paid_amount,
          balance_amount,
          status
        )
        values (
          v_admin_id,
          v_customer.id,
          'DF-' || replace(p_billing_month, '-', '') || '-' || upper(left(v_customer.id::text, 6)) || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
          p_billing_month,
          now(),
          v_subtotal,
          v_previous_balance,
          v_total,
          0,
          v_total,
          'Unpaid'
        )
        on conflict do nothing
        returning id into v_invoice_id;

        if v_invoice_id is not null then
          insert into public.invoice_items (
            invoice_id,
            delivery_id,
            product_name,
            delivery_date,
            quantity,
            unit_price,
            total_amount
          )
          select
            v_invoice_id,
            d.id,
            p.name,
            d.delivery_date,
            d.quantity,
            d.unit_price,
            d.total_amount
          from public.deliveries d
          left join public.products p on p.id = d.product_id
          where d.admin_id = v_admin_id
            and d.customer_id = v_customer.id
            and d.delivery_status = 'Delivered'
            and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
            and d.delivery_date between v_start and v_end;

          update public.deliveries d
          set payment_status = 'Billed'
          where d.admin_id = v_admin_id
            and d.customer_id = v_customer.id
            and d.delivery_status = 'Delivered'
            and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
            and d.delivery_date between v_start and v_end;

          v_invoice_count := v_invoice_count + 1;
        end if;
      end if;
    end loop;
  end loop;

  return v_invoice_count;
end;
$$;

grant execute on function public.generate_monthly_invoices(text, uuid, uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('dairyflow-month-end-invoices');
    perform cron.schedule(
      'dairyflow-month-end-invoices',
      '55 18 28-31 * *',
      $cron$
        select public.generate_monthly_invoices(to_char(current_date, 'YYYY-MM'), null, null)
        where current_date = (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
      $cron$
    );
  end if;
exception
  when others then
    null;
end;
$$;


-- =========================================================
-- Included from supabase\migrations\202606170001_customer_delivery_holds.sql
-- =========================================================

create table if not exists public.customer_holds (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  hold_date date not null,
  reason text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  unique(customer_id, hold_date)
);

create index if not exists idx_customer_holds_admin_customer_status
  on public.customer_holds(customer_id, status);

create index if not exists idx_customer_holds_active_range
  on public.customer_holds(status, hold_date);

alter table public.customer_holds enable row level security;

drop policy if exists customer_holds_admin_all on public.customer_holds;
create policy customer_holds_admin_all
on public.customer_holds
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.customer_holds to authenticated;

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
  d.delivery_boy_status,
  d.payment_status,
  d.skip_reason,
  d.delivery_boy_skip_reason,
  d.delivery_completed_at,
  c.full_name as customer_name,
  c.phone as customer_phone,
  c.address as customer_address,
  r.route_name,
  b.full_name as delivery_boy_name
from public.deliveries d
left join public.customers c on c.id = d.customer_id and c.admin_id = d.admin_id
left join public.routes r on r.id = d.route_id and r.admin_id = d.admin_id
left join public.delivery_boys b on b.id = d.delivery_boy_id and b.admin_id = d.admin_id
where d.delivery_date = current_date
  and not exists (
    select 1
    from public.customer_holds h
    where h.customer_id = d.customer_id
      and h.status = 'active'
      and d.delivery_date = h.hold_date
  );

grant select on public.today_delivery_view to authenticated;

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
    from public.customers c
    where c.admin_id = v_admin_id
      and c.status = 'active'
      and (p_route_id is null or c.route_id = p_route_id)
      and not exists (
        select 1
        from public.customer_holds h
        where h.customer_id = c.id
          and h.status = 'active'
          and p_delivery_date = h.hold_date
      )
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

grant execute on function public.generate_today_deliveries(date, uuid) to authenticated;

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
  v_session_admin_id uuid := auth.uid();
  v_admin_id uuid;
  v_start date;
  v_end date;
  v_customer record;
  v_invoice_id uuid;
  v_invoice_count integer := 0;
  v_subtotal numeric;
  v_previous_balance numeric;
  v_total numeric;
begin
  if p_billing_month !~ '^\d{4}-\d{2}$' then
    raise exception 'Billing month must be yyyy-mm.';
  end if;

  v_start := (p_billing_month || '-01')::date;
  v_end := (v_start + interval '1 month - 1 day')::date;

  for v_admin_id in
    select v_session_admin_id
    where v_session_admin_id is not null
    union
    select distinct c.admin_id
    from public.customers c
    where v_session_admin_id is null
      and c.admin_id is not null
  loop
    for v_customer in
      select c.*
      from public.customers c
      where c.admin_id = v_admin_id
        and lower(coalesce(c.status, 'active')) = 'active'
        and (p_customer_id is null or c.id = p_customer_id)
        and (p_route_id is null or c.route_id = p_route_id)
        and not exists (
          select 1
          from public.invoices i
          where i.admin_id = v_admin_id
            and i.customer_id = c.id
            and i.billing_month = p_billing_month
        )
    loop
      select coalesce(sum(d.total_amount), 0)
      into v_subtotal
      from public.deliveries d
      where d.admin_id = v_admin_id
        and d.customer_id = v_customer.id
        and d.delivery_status = 'Delivered'
        and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
        and d.delivery_date between v_start and v_end
        and not exists (
          select 1
          from public.customer_holds h
          where h.customer_id = d.customer_id
            and h.status = 'active'
            and d.delivery_date = h.hold_date
        );

      select coalesce(sum(i.balance_amount), 0)
      into v_previous_balance
      from public.invoices i
      where i.admin_id = v_admin_id
        and i.customer_id = v_customer.id
        and i.billing_month < p_billing_month
        and i.status <> 'Paid';

      v_previous_balance := coalesce(v_customer.opening_balance, 0) + coalesce(v_previous_balance, 0);
      v_total := coalesce(v_subtotal, 0) + coalesce(v_previous_balance, 0);

      if v_total > 0 then
        insert into public.invoices (
          admin_id,
          customer_id,
          invoice_number,
          billing_month,
          generated_at,
          subtotal,
          previous_balance,
          total_amount,
          paid_amount,
          balance_amount,
          status
        )
        values (
          v_admin_id,
          v_customer.id,
          'DF-' || replace(p_billing_month, '-', '') || '-' || upper(left(v_customer.id::text, 6)) || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
          p_billing_month,
          now(),
          v_subtotal,
          v_previous_balance,
          v_total,
          0,
          v_total,
          'Unpaid'
        )
        on conflict do nothing
        returning id into v_invoice_id;

        if v_invoice_id is not null then
          insert into public.invoice_items (
            invoice_id,
            delivery_id,
            product_name,
            delivery_date,
            quantity,
            unit_price,
            total_amount
          )
          select
            v_invoice_id,
            d.id,
            p.name,
            d.delivery_date,
            d.quantity,
            d.unit_price,
            d.total_amount
          from public.deliveries d
          left join public.products p on p.id = d.product_id
          where d.admin_id = v_admin_id
            and d.customer_id = v_customer.id
            and d.delivery_status = 'Delivered'
            and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
            and d.delivery_date between v_start and v_end
            and not exists (
              select 1
              from public.customer_holds h
              where h.customer_id = d.customer_id
                and h.status = 'active'
                and d.delivery_date = h.hold_date
            );

          update public.deliveries d
          set payment_status = 'Billed'
          where d.admin_id = v_admin_id
            and d.customer_id = v_customer.id
            and d.delivery_status = 'Delivered'
            and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
            and d.delivery_date between v_start and v_end
            and not exists (
              select 1
              from public.customer_holds h
              where h.customer_id = d.customer_id
                and h.status = 'active'
                and d.delivery_date = h.hold_date
            );

          v_invoice_count := v_invoice_count + 1;
        end if;
      end if;
    end loop;
  end loop;

  return v_invoice_count;
end;
$$;

grant execute on function public.generate_monthly_invoices(text, uuid, uuid) to authenticated;


-- =========================================================
-- Included from supabase\migrations\202606170002_customer_products_and_advance_payments.sql
-- =========================================================

alter table if exists public.customers
    add column if not exists product_id uuid null;

alter table if exists public.customers
    add column if not exists product_category text null;

alter table if exists public.customers
    add column if not exists product_name text null;

alter table if exists public.customers
    add column if not exists advance_payment numeric(12,2) not null default 0;

update public.customers
set product_category = coalesce(nullif(product_category, ''), nullif(milk_type, ''), 'Cow')
where product_category is null
   or product_category = '';

update public.customers c
set product_name = p.name
from public.products p
where c.product_id = p.id
  and (c.product_name is null or c.product_name = '');

update public.customers
set advance_payment = 0
where advance_payment is null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'customers_product_id_fkey'
    ) then
        alter table public.customers
            add constraint customers_product_id_fkey
            foreign key (product_id) references public.products(id) on delete set null;
    end if;
end $$;

alter table if exists public.payments
    add column if not exists payment_type text not null default 'regular';

update public.payments
set payment_type = 'regular'
where payment_type is null
   or payment_type = '';

create index if not exists idx_customers_product_id on public.customers(product_id);
create index if not exists idx_customers_product_category on public.customers(product_category);
create index if not exists idx_payments_payment_type on public.payments(payment_type);


-- =========================================================
-- Included from supabase\migrations\202606170003_customer_product_name.sql
-- =========================================================

alter table if exists public.customers
    add column if not exists product_name text null;

update public.customers c
set product_name = p.name
from public.products p
where c.product_id = p.id
  and (c.product_name is null or c.product_name = '');


-- =========================================================
-- Included from supabase\migrations\202606180001_customer_save_optional_fields.sql
-- =========================================================

alter table public.customers
    add column if not exists product_id uuid references public.products(id) on delete set null;

alter table public.customers
    add column if not exists product_name text null;

alter table public.customers
    add column if not exists product_category text null;

alter table public.customers
    add column if not exists advance_payment numeric(12,2) not null default 0;

alter table public.payments
    add column if not exists payment_type text not null default 'regular';

alter table public.payments
    add column if not exists payment_mode text null;

alter table public.payments
    add column if not exists received_at timestamptz null;

create index if not exists idx_customers_product_category
on public.customers(product_category);


-- =========================================================
-- Included from supabase\migrations\202606190001_delivery_boy_performance_calendar_stock.sql
-- =========================================================

create table if not exists public.delivery_boy_daily_stock (
    id uuid primary key default gen_random_uuid(),
    delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
    stock_date date not null,
    cow_milk_taken_liters numeric(10,2) not null default 0,
    buffalo_milk_taken_liters numeric(10,2) not null default 0,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint delivery_boy_daily_stock_non_negative check (
        cow_milk_taken_liters >= 0 and buffalo_milk_taken_liters >= 0
    ),
    constraint delivery_boy_daily_stock_unique unique (delivery_boy_id, stock_date)
);

create table if not exists public.delivery_day_completion (
    id uuid primary key default gen_random_uuid(),
    delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
    completion_date date not null,
    status text not null default 'completed',
    completed_at timestamptz null,
    created_at timestamptz not null default now(),
    constraint delivery_day_completion_status_check check (status in ('completed', 'partial', 'pending')),
    constraint delivery_day_completion_unique unique (delivery_boy_id, completion_date)
);

create index if not exists idx_delivery_boy_daily_stock_boy_date
on public.delivery_boy_daily_stock(delivery_boy_id, stock_date);

create index if not exists idx_delivery_day_completion_boy_date
on public.delivery_day_completion(delivery_boy_id, completion_date);

alter table public.delivery_boy_daily_stock enable row level security;
alter table public.delivery_day_completion enable row level security;

drop policy if exists "delivery_boy_daily_stock_admin_all" on public.delivery_boy_daily_stock;
create policy "delivery_boy_daily_stock_admin_all"
on public.delivery_boy_daily_stock for all
using (
    exists (
        select 1 from public.delivery_boys db
        where db.id = delivery_boy_id and db.admin_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.delivery_boys db
        where db.id = delivery_boy_id and db.admin_id = auth.uid()
    )
);

drop policy if exists "delivery_day_completion_admin_select" on public.delivery_day_completion;
create policy "delivery_day_completion_admin_select"
on public.delivery_day_completion for select
using (
    exists (
        select 1 from public.delivery_boys db
        where db.id = delivery_boy_id and db.admin_id = auth.uid()
    )
);

drop policy if exists "delivery_day_completion_boy_select" on public.delivery_day_completion;
create policy "delivery_day_completion_boy_select"
on public.delivery_day_completion for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'delivery_boy'
          and p.delivery_boy_id = delivery_day_completion.delivery_boy_id
    )
);

grant select, insert, update, delete on public.delivery_boy_daily_stock to authenticated;
grant select, insert, update on public.delivery_day_completion to authenticated;

create or replace function public.delivery_boy_complete_today_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_count integer;
  v_completed_count integer;
  v_skipped_count integer;
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

  update public.deliveries d
  set delivery_status = d.delivery_boy_status,
      total_amount = case
        when d.delivery_boy_status = 'Skipped' then 0
        else d.quantity * d.unit_price
      end,
      payment_status = case
        when d.delivery_boy_status = 'Skipped' then 'Unpaid'
        else d.payment_status
      end,
      skip_reason = case
        when d.delivery_boy_status = 'Skipped' then coalesce(d.delivery_boy_skip_reason, 'Skipped by delivery boy')
        else null
      end,
      delivery_completed_at = now(),
      updated_at = now()
  from public.delivery_boys b
  where b.id = v_profile.delivery_boy_id
    and b.admin_id = v_profile.admin_id
    and b.status = 'active'
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and d.delivery_completed_at is null
    and d.delivery_boy_status in ('Delivered', 'Skipped');

  get diagnostics v_count = row_count;

  delete from public.payments p
  using public.deliveries d
  where p.delivery_id = d.id
    and p.collected_by = v_profile.delivery_boy_id
    and d.delivery_date = current_date
    and d.delivery_status = 'Skipped';

  select
    count(*) filter (where delivery_status = 'Delivered'),
    count(*) filter (where delivery_status = 'Skipped')
  into v_completed_count, v_skipped_count
  from public.deliveries
  where delivery_boy_id = v_profile.delivery_boy_id
    and delivery_date = current_date
    and delivery_completed_at is not null;

  if v_completed_count > 0 or v_skipped_count > 0 then
    insert into public.delivery_day_completion (
      delivery_boy_id, completion_date, status, completed_at
    )
    values (
      v_profile.delivery_boy_id,
      current_date,
      case when v_skipped_count > 0 then 'partial' else 'completed' end,
      now()
    )
    on conflict (delivery_boy_id, completion_date)
    do update set
      status = excluded.status,
      completed_at = excluded.completed_at;
  end if;

  return v_count;
end;
$$;

grant execute on function public.delivery_boy_complete_today_deliveries() to authenticated;


-- =========================================================
-- Included from supabase\migrations\202606190002_delivery_boy_customer_insert_policy.sql
-- =========================================================

drop policy if exists "customers_insert_policy" on public.customers;

create policy "customers_insert_policy"
on public.customers
for insert
to authenticated
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or (
        admin_id = public.current_admin_id()
        and public.current_user_role() = 'delivery_boy'
    )
);


-- =========================================================
-- Included from supabase\migrations\202606190003_delivery_boy_today_delivery_insert_policy.sql
-- =========================================================

drop policy if exists "deliveries_insert_policy" on public.deliveries;

create policy "deliveries_insert_policy"
on public.deliveries
for insert
to authenticated
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or (
        public.current_user_role() = 'delivery_boy'
        and admin_id = public.current_admin_id()
        and delivery_date = current_date
        and exists (
            select 1
            from public.profiles p
            join public.delivery_boys db on db.id = p.delivery_boy_id
            where p.id = auth.uid()
              and p.status = 'active'
              and p.role = 'delivery_boy'
              and db.status = 'active'
              and db.admin_id = public.deliveries.admin_id
              and db.id = public.deliveries.delivery_boy_id
              and (
                  public.deliveries.route_id is null
                  or db.assigned_route_id = public.deliveries.route_id
              )
        )
    )
);


notify pgrst, 'reload schema';

