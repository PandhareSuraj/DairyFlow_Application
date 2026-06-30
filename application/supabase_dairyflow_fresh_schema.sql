-- Run this manually in Supabase SQL Editor before testing app save flows.

create extension if not exists pgcrypto;

grant usage on schema public to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'customer',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  full_name text not null,
  phone text not null,
  email text,
  address text,
  area text,
  daily_quantity numeric not null default 0,
  milk_type text not null default 'Cow',
  price_per_liter numeric not null default 0,
  delivery_time text not null default 'Morning',
  status text not null default 'active',
  opening_balance numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  category text not null,
  unit text not null,
  price numeric not null default 0,
  stock_quantity numeric not null default 0,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  delivery_date date not null,
  delivery_time text not null default 'Morning',
  quantity numeric not null,
  unit_price numeric not null,
  total_amount numeric not null,
  delivery_status text not null default 'Pending',
  payment_status text not null default 'Unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_number text not null unique,
  billing_month text not null,
  subtotal numeric not null default 0,
  previous_balance numeric not null default 0,
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  balance_amount numeric not null default 0,
  status text not null default 'Unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_id, customer_id, billing_month)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  product_name text,
  delivery_date date,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric not null,
  payment_date date not null default current_date,
  payment_method text not null default 'Cash',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists deliveries_set_updated_at on public.deliveries;
create trigger deliveries_set_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.deliveries to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.deliveries enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'customers', 'products', 'deliveries', 'invoices', 'invoice_items', 'payments')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy "Profiles are owned by auth user"
on public.profiles for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Customers are owned by admin"
on public.customers for all to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Products are owned by admin"
on public.products for all to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Deliveries are owned by admin"
on public.deliveries for all to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Invoices are owned by admin"
on public.invoices for all to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Payments are owned by admin"
on public.payments for all to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Invoice items readable through owned invoice"
on public.invoice_items for select to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create policy "Invoice items insertable through owned invoice"
on public.invoice_items for insert to authenticated
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create policy "Invoice items updatable through owned invoice"
on public.invoice_items for update to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create policy "Invoice items deletable through owned invoice"
on public.invoice_items for delete to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create index if not exists customers_admin_id_idx on public.customers(admin_id);
create index if not exists products_admin_id_idx on public.products(admin_id);
create index if not exists deliveries_admin_id_idx on public.deliveries(admin_id);
create index if not exists deliveries_customer_date_idx on public.deliveries(customer_id, delivery_date);
create index if not exists invoices_admin_id_idx on public.invoices(admin_id);
create index if not exists invoices_customer_month_idx on public.invoices(customer_id, billing_month);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists payments_admin_id_idx on public.payments(admin_id);
create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
create index if not exists payments_customer_date_idx on public.payments(customer_id, payment_date);

notify pgrst, 'reload schema';
