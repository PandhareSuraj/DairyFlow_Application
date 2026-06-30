create extension if not exists "pgcrypto";

do $$ begin
  create type product_type as enum ('milk', 'curd', 'paneer', 'ghee', 'butter', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_unit as enum ('liter', 'kg', 'packet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_shift as enum ('morning', 'evening');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('pending', 'delivered', 'skipped', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'upi', 'online', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('admin', 'delivery_boy', 'customer');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists name text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists role app_role not null default 'customer';
alter table profiles add column if not exists status text not null default 'active';
alter table profiles add column if not exists is_active boolean not null default true;
alter table profiles add column if not exists permissions text[] not null default '{}';
alter table profiles add column if not exists customer_id uuid;
alter table profiles add column if not exists delivery_boy_id uuid;
alter table profiles add column if not exists created_at timestamptz not null default now();
alter table profiles add column if not exists updated_at timestamptz not null default now();

update profiles
set full_name = coalesce(full_name, name)
where full_name is null and name is not null;

update profiles
set name = coalesce(name, full_name)
where name is null and full_name is not null;

create table if not exists routes (
  id uuid primary key default gen_random_uuid()
);

alter table routes add column if not exists route_name text not null default '';
alter table routes add column if not exists area text;
alter table routes add column if not exists description text;
alter table routes add column if not exists is_active boolean not null default true;
alter table routes add column if not exists created_at timestamptz not null default now();

create table if not exists products (
  id uuid primary key default gen_random_uuid()
);

alter table products add column if not exists product_name text not null default '';
alter table products add column if not exists product_type product_type not null default 'milk';
alter table products add column if not exists unit product_unit not null default 'liter';
alter table products add column if not exists price_per_unit numeric(12,2) not null default 0;
alter table products add column if not exists stock_quantity numeric(12,3) not null default 0;
alter table products add column if not exists is_active boolean not null default true;
alter table products add column if not exists created_at timestamptz not null default now();

create table if not exists customers (
  id uuid primary key default gen_random_uuid()
);

alter table customers add column if not exists profile_id uuid references profiles(id) on delete set null;
alter table customers add column if not exists full_name text;
alter table customers add column if not exists name text;
alter table customers add column if not exists mobile_number text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists address text;
alter table customers add column if not exists area text;
alter table customers add column if not exists route_id uuid references routes(id) on delete set null;
alter table customers add column if not exists default_product_id uuid references products(id) on delete set null;
alter table customers add column if not exists daily_quantity numeric(12,3) not null default 0;
alter table customers add column if not exists morning_quantity numeric(12,3) not null default 0;
alter table customers add column if not exists evening_quantity numeric(12,3) not null default 0;
alter table customers add column if not exists rate numeric(12,2) not null default 0;
alter table customers add column if not exists milk_rate numeric(12,2) not null default 0;
alter table customers add column if not exists is_active boolean not null default true;
alter table customers add column if not exists opening_pending_balance numeric(12,2) not null default 0;
alter table customers add column if not exists created_at timestamptz not null default now();

create table if not exists delivery_boys (
  id uuid primary key default gen_random_uuid()
);

alter table delivery_boys add column if not exists profile_id uuid references profiles(id) on delete set null;
alter table delivery_boys add column if not exists name text not null default '';
alter table delivery_boys add column if not exists mobile_number text;
alter table delivery_boys add column if not exists phone text;
alter table delivery_boys add column if not exists email text;
alter table delivery_boys add column if not exists assigned_route_id uuid references routes(id) on delete set null;
alter table delivery_boys add column if not exists route_id uuid references routes(id) on delete set null;
alter table delivery_boys add column if not exists is_active boolean not null default true;
alter table delivery_boys add column if not exists created_at timestamptz not null default now();

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid()
);

alter table deliveries add column if not exists customer_id uuid references customers(id) on delete cascade;
alter table deliveries add column if not exists product_id uuid references products(id) on delete restrict;
alter table deliveries add column if not exists delivery_boy_id uuid references delivery_boys(id) on delete set null;
alter table deliveries add column if not exists route_id uuid references routes(id) on delete set null;
alter table deliveries add column if not exists delivery_date date not null default current_date;
alter table deliveries add column if not exists delivery_shift delivery_shift not null default 'morning';
alter table deliveries add column if not exists quantity numeric(12,3) not null default 0;
alter table deliveries add column if not exists unit_price numeric(12,2) not null default 0;
alter table deliveries add column if not exists total_amount numeric(12,2) not null default 0;
alter table deliveries add column if not exists status delivery_status not null default 'pending';
alter table deliveries add column if not exists skip_reason text;
alter table deliveries add column if not exists notes text;
alter table deliveries add column if not exists created_at timestamptz not null default now();
alter table deliveries add column if not exists updated_at timestamptz not null default now();

create table if not exists invoices (
  id uuid primary key default gen_random_uuid()
);

alter table invoices add column if not exists invoice_number text;
alter table invoices add column if not exists customer_id uuid references customers(id) on delete cascade;
alter table invoices add column if not exists billing_month int;
alter table invoices add column if not exists billing_year int;
alter table invoices add column if not exists total_quantity numeric(12,3) not null default 0;
alter table invoices add column if not exists rate numeric(12,2) not null default 0;
alter table invoices add column if not exists monthly_delivery_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists previous_pending_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists total_bill_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists paid_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists pending_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists invoice_status invoice_status not null default 'unpaid';
alter table invoices add column if not exists generated_date date not null default current_date;
alter table invoices add column if not exists due_date date;
alter table invoices add column if not exists notes text;

create table if not exists payments (
  id uuid primary key default gen_random_uuid()
);

alter table payments add column if not exists invoice_id uuid references invoices(id) on delete cascade;
alter table payments add column if not exists billing_record_id uuid;
alter table payments add column if not exists customer_id uuid references customers(id) on delete cascade;
alter table payments add column if not exists amount numeric(12,2) not null default 0;
alter table payments add column if not exists payment_method payment_method;
alter table payments add column if not exists method payment_method;
alter table payments add column if not exists transaction_id text;
alter table payments add column if not exists payment_date date not null default current_date;
alter table payments add column if not exists paid_at timestamptz;
alter table payments add column if not exists notes text;
alter table payments add column if not exists created_at timestamptz not null default now();

create index if not exists idx_customers_route_id on customers(route_id);
create index if not exists idx_customers_profile_id on customers(profile_id);
create index if not exists idx_delivery_boys_route_id on delivery_boys(assigned_route_id);
create index if not exists idx_deliveries_customer_id on deliveries(customer_id);
create index if not exists idx_deliveries_delivery_date on deliveries(delivery_date);
create index if not exists idx_deliveries_delivery_boy_id on deliveries(delivery_boy_id);
create index if not exists idx_deliveries_route_id on deliveries(route_id);
create index if not exists idx_deliveries_product_id on deliveries(product_id);
create index if not exists idx_invoices_customer_id on invoices(customer_id);
create index if not exists idx_invoices_billing_month on invoices(billing_month);
create index if not exists idx_invoices_billing_year on invoices(billing_year);
create index if not exists idx_invoices_status on invoices(invoice_status);
create index if not exists idx_payments_customer_id on payments(customer_id);
create index if not exists idx_payments_invoice_id on payments(invoice_id);
create index if not exists idx_profiles_role on profiles(role);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deliveries_set_updated_at on deliveries;
create trigger deliveries_set_updated_at
before update on deliveries
for each row execute function set_updated_at();

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function current_delivery_boy_id()
returns uuid language sql stable security definer set search_path = public as $$
  select delivery_boy_id from profiles where id = auth.uid() and is_active = true;
$$;

create or replace function current_customer_id()
returns uuid language sql stable security definer set search_path = public as $$
  select customer_id from profiles where id = auth.uid() and is_active = true;
$$;

alter table profiles enable row level security;
alter table routes enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table delivery_boys enable row level security;
alter table deliveries enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;

drop policy if exists "admin_all_profiles" on profiles;
create policy "admin_all_profiles" on profiles for all using (is_admin()) with check (is_admin());
drop policy if exists "users_read_own_profile" on profiles;
create policy "users_read_own_profile" on profiles for select using (id = auth.uid());
drop policy if exists "users_insert_own_customer_profile" on profiles;
create policy "users_insert_own_customer_profile" on profiles
for insert with check (id = auth.uid());
drop policy if exists "users_update_own_profile" on profiles;
create policy "users_update_own_profile" on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admin_all_routes" on routes;
create policy "admin_all_routes" on routes for all using (is_admin()) with check (is_admin());

drop policy if exists "admin_all_products" on products;
create policy "admin_all_products" on products for all using (is_admin()) with check (is_admin());

drop policy if exists "admin_all_customers" on customers;
create policy "admin_all_customers" on customers for all using (is_admin()) with check (is_admin());
drop policy if exists "customers_read_own_record" on customers;
create policy "customers_read_own_record" on customers for select using (id = current_customer_id());

drop policy if exists "admin_all_delivery_boys" on delivery_boys;
create policy "admin_all_delivery_boys" on delivery_boys for all using (is_admin()) with check (is_admin());
drop policy if exists "delivery_boys_read_own_record" on delivery_boys;
create policy "delivery_boys_read_own_record" on delivery_boys for select using (id = current_delivery_boy_id());

drop policy if exists "admin_all_deliveries" on deliveries;
create policy "admin_all_deliveries" on deliveries for all using (is_admin()) with check (is_admin());
drop policy if exists "delivery_boys_assigned_deliveries" on deliveries;
create policy "delivery_boys_assigned_deliveries" on deliveries
for select using (delivery_boy_id = current_delivery_boy_id());
drop policy if exists "delivery_boys_update_status" on deliveries;
create policy "delivery_boys_update_status" on deliveries
for update using (delivery_boy_id = current_delivery_boy_id())
with check (delivery_boy_id = current_delivery_boy_id());

drop policy if exists "admin_all_invoices" on invoices;
create policy "admin_all_invoices" on invoices for all using (is_admin()) with check (is_admin());
drop policy if exists "customers_read_own_invoices" on invoices;
create policy "customers_read_own_invoices" on invoices for select using (customer_id = current_customer_id());

drop policy if exists "admin_all_payments" on payments;
create policy "admin_all_payments" on payments for all using (is_admin()) with check (is_admin());
drop policy if exists "customers_read_own_payments" on payments;
create policy "customers_read_own_payments" on payments for select using (customer_id = current_customer_id());

notify pgrst, 'reload schema';
