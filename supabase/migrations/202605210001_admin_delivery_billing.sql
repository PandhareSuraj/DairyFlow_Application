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
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  name text,
  email text,
  phone text,
  role app_role not null default 'customer',
  status text not null default 'active',
  is_active boolean not null default true,
  permissions text[] not null default '{}',
  customer_id uuid,
  delivery_boy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  area text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  product_type product_type not null default 'milk',
  unit product_unit not null default 'liter',
  price_per_unit numeric(12,2) not null default 0,
  stock_quantity numeric(12,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  full_name text,
  name text,
  mobile_number text,
  phone text,
  address text,
  area text,
  route_id uuid references routes(id) on delete set null,
  default_product_id uuid references products(id) on delete set null,
  daily_quantity numeric(12,3) not null default 0,
  morning_quantity numeric(12,3) not null default 0,
  evening_quantity numeric(12,3) not null default 0,
  rate numeric(12,2) not null default 0,
  milk_rate numeric(12,2) not null default 0,
  is_active boolean not null default true,
  opening_pending_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists delivery_boys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  mobile_number text,
  phone text,
  email text,
  assigned_route_id uuid references routes(id) on delete set null,
  route_id uuid references routes(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  delivery_boy_id uuid references delivery_boys(id) on delete set null,
  route_id uuid references routes(id) on delete set null,
  delivery_date date not null,
  delivery_shift delivery_shift not null default 'morning',
  quantity numeric(12,3) not null default 0,
  unit_price numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status delivery_status not null default 'pending',
  skip_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references customers(id) on delete cascade,
  billing_month int not null check (billing_month between 1 and 12),
  billing_year int not null,
  total_quantity numeric(12,3) not null default 0,
  rate numeric(12,2) not null default 0,
  monthly_delivery_amount numeric(12,2) not null default 0,
  previous_pending_amount numeric(12,2) not null default 0,
  total_bill_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  pending_amount numeric(12,2) not null default 0,
  invoice_status invoice_status not null default 'unpaid',
  generated_date date not null default current_date,
  due_date date,
  notes text,
  unique (customer_id, billing_month, billing_year)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  billing_record_id uuid,
  customer_id uuid not null references customers(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method payment_method,
  method payment_method,
  transaction_id text,
  payment_date date not null default current_date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

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
