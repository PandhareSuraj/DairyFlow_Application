-- DairyFlow web compatibility migration.
-- Safe additive fields used by the web app and Android business flow.

alter table if exists public.customers
  add column if not exists product_id uuid null,
  add column if not exists product_category text null,
  add column if not exists product_name text null,
  add column if not exists advance_payment numeric(12,2) not null default 0;

alter table if exists public.payments
  add column if not exists payment_type text not null default 'regular';

create table if not exists public.customer_holds (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_boy_daily_stock (
  id uuid primary key default gen_random_uuid(),
  delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
  stock_date date not null,
  cow_milk_taken_liters numeric(10,2) not null default 0,
  buffalo_milk_taken_liters numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_boy_daily_stock_unique unique (delivery_boy_id, stock_date)
);

create table if not exists public.delivery_day_completion (
  id uuid primary key default gen_random_uuid(),
  delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
  completion_date date not null,
  status text not null default 'completed',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint delivery_day_completion_unique unique (delivery_boy_id, completion_date)
);

create index if not exists idx_customers_product_id on public.customers(product_id);
create index if not exists idx_customers_product_category on public.customers(product_category);
create index if not exists idx_payments_payment_type on public.payments(payment_type);
create index if not exists idx_customer_holds_admin_customer on public.customer_holds(admin_id, customer_id);
create index if not exists idx_delivery_boy_daily_stock_boy_date on public.delivery_boy_daily_stock(delivery_boy_id, stock_date);
create index if not exists idx_delivery_day_completion_boy_date on public.delivery_day_completion(delivery_boy_id, completion_date);
