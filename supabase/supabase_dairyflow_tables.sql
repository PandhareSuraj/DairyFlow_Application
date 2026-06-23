create extension if not exists pgcrypto;

grant usage on schema public to authenticated;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  full_name text not null,
  phone text not null,
  email text,
  address text,
  area text,
  daily_quantity numeric default 0,
  milk_type text default 'Cow',
  price_per_liter numeric default 0,
  delivery_time text default 'Morning',
  status text default 'active',
  opening_balance numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  name text not null,
  category text not null,
  unit text not null,
  price numeric not null default 0,
  stock_quantity numeric default 0,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  customer_id uuid references public.customers(id) on delete cascade,
  product_id uuid references public.products(id),
  delivery_date date not null,
  delivery_time text default 'Morning',
  quantity numeric not null,
  unit_price numeric not null,
  total_amount numeric not null,
  delivery_status text default 'Pending',
  payment_status text default 'Unpaid',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  customer_id uuid references public.customers(id) on delete cascade,
  invoice_number text unique not null,
  billing_month text not null,
  subtotal numeric default 0,
  previous_balance numeric default 0,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  balance_amount numeric default 0,
  status text default 'Unpaid',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  delivery_id uuid references public.deliveries(id),
  product_name text,
  delivery_date date,
  quantity numeric,
  unit_price numeric,
  total_amount numeric,
  created_at timestamptz default now()
);

alter table public.customers add column if not exists admin_id uuid references auth.users(id);
alter table public.customers alter column admin_id set default auth.uid();
alter table public.customers add column if not exists full_name text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists area text;
alter table public.customers add column if not exists daily_quantity numeric default 0;
alter table public.customers add column if not exists milk_type text default 'Cow';
alter table public.customers add column if not exists price_per_liter numeric default 0;
alter table public.customers add column if not exists delivery_time text default 'Morning';
alter table public.customers add column if not exists status text default 'active';
alter table public.customers add column if not exists opening_balance numeric default 0;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists created_at timestamptz default now();
alter table public.customers add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'name') then
    execute 'alter table public.customers alter column name drop not null';
    execute 'alter table public.customers alter column name set default ''''';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'name') then
    execute 'update public.customers set full_name = coalesce(full_name, name) where full_name is null and name is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'mobile_number') then
    execute 'update public.customers set phone = coalesce(phone, mobile_number) where phone is null and mobile_number is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'milk_rate') then
    execute 'update public.customers set price_per_liter = coalesce(nullif(price_per_liter, 0), milk_rate, 0) where milk_rate is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'rate') then
    execute 'update public.customers set price_per_liter = coalesce(nullif(price_per_liter, 0), rate, 0) where rate is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'opening_pending_balance') then
    execute 'update public.customers set opening_balance = coalesce(nullif(opening_balance, 0), opening_pending_balance, 0) where opening_pending_balance is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'is_active') then
    execute 'update public.customers set status = case when is_active is false then ''inactive'' else coalesce(status, ''active'') end';
  end if;
end $$;

alter table public.products add column if not exists admin_id uuid references auth.users(id);
alter table public.products alter column admin_id set default auth.uid();
alter table public.products add column if not exists name text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists unit text;
alter table public.products alter column unit drop default;
alter table public.products alter column unit type text using unit::text;
alter table public.products alter column unit set default 'Liter';
alter table public.products add column if not exists price numeric default 0;
alter table public.products add column if not exists stock_quantity numeric default 0;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists status text default 'active';
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'product_name') then
    execute 'alter table public.products alter column product_name drop not null';
    execute 'alter table public.products alter column product_name set default ''''';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_per_unit') then
    execute 'alter table public.products alter column price_per_unit set default 0';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'product_name') then
    execute 'update public.products set name = coalesce(name, product_name) where name is null and product_name is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'product_type') then
    execute 'update public.products set category = coalesce(category, initcap(product_type::text), ''Milk'')';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_per_unit') then
    execute 'update public.products set price = coalesce(nullif(price, 0), price_per_unit, 0) where price_per_unit is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'is_active') then
    execute 'update public.products set status = case when is_active is false then ''inactive'' else coalesce(status, ''active'') end';
  end if;
end $$;

alter table public.deliveries add column if not exists admin_id uuid references auth.users(id);
alter table public.deliveries alter column admin_id set default auth.uid();
alter table public.deliveries add column if not exists customer_id uuid references public.customers(id) on delete cascade;
alter table public.deliveries add column if not exists product_id uuid references public.products(id);
alter table public.deliveries alter column product_id drop not null;
alter table public.deliveries add column if not exists delivery_date date;
alter table public.deliveries add column if not exists delivery_time text default 'Morning';
alter table public.deliveries add column if not exists quantity numeric default 0;
alter table public.deliveries add column if not exists unit_price numeric default 0;
alter table public.deliveries add column if not exists total_amount numeric default 0;
alter table public.deliveries add column if not exists delivery_status text default 'Pending';
alter table public.deliveries add column if not exists payment_status text default 'Unpaid';
alter table public.deliveries add column if not exists notes text;
alter table public.deliveries add column if not exists created_at timestamptz default now();
alter table public.deliveries add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'deliveries' and column_name = 'delivery_shift') then
    execute 'update public.deliveries set delivery_time = case when delivery_shift is null then coalesce(delivery_time, ''Morning'') else initcap(delivery_shift::text) end';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'deliveries' and column_name = 'status') then
    execute 'update public.deliveries set delivery_status = case when status is null then coalesce(delivery_status, ''Pending'') else initcap(status::text) end';
  end if;
  update public.deliveries set payment_status = coalesce(payment_status, 'Unpaid');
end $$;

alter table public.invoices add column if not exists admin_id uuid references auth.users(id);
alter table public.invoices alter column admin_id set default auth.uid();
alter table public.invoices add column if not exists customer_id uuid references public.customers(id) on delete cascade;
alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists billing_month text;
alter table public.invoices drop constraint if exists invoices_billing_month_check;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'billing_year'
  ) then
    alter table public.invoices
      alter column billing_month type text
      using (
        case
          when billing_month is null then null
          when billing_month::text ~ '^[0-9]{4}-[0-9]{2}$' then billing_month::text
          else billing_year::text || '-' || lpad(billing_month::text, 2, '0')
        end
      );
  else
    alter table public.invoices
      alter column billing_month type text
      using billing_month::text;
  end if;
end $$;

alter table public.invoices add column if not exists subtotal numeric default 0;
alter table public.invoices add column if not exists previous_balance numeric default 0;
alter table public.invoices add column if not exists total_amount numeric default 0;
alter table public.invoices add column if not exists paid_amount numeric default 0;
alter table public.invoices add column if not exists balance_amount numeric default 0;
alter table public.invoices add column if not exists status text default 'Unpaid';
alter table public.invoices add column if not exists created_at timestamptz default now();
alter table public.invoices add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invoices' and column_name = 'billing_year') then
    execute 'alter table public.invoices alter column billing_year drop not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invoices' and column_name = 'monthly_delivery_amount') then
    execute 'update public.invoices set subtotal = coalesce(nullif(subtotal, 0), monthly_delivery_amount, 0) where monthly_delivery_amount is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invoices' and column_name = 'previous_pending_amount') then
    execute 'update public.invoices set previous_balance = coalesce(nullif(previous_balance, 0), previous_pending_amount, 0) where previous_pending_amount is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invoices' and column_name = 'total_bill_amount') then
    execute 'update public.invoices set total_amount = coalesce(nullif(total_amount, 0), total_bill_amount, 0) where total_bill_amount is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invoices' and column_name = 'pending_amount') then
    execute 'update public.invoices set balance_amount = coalesce(nullif(balance_amount, 0), pending_amount, 0) where pending_amount is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invoices' and column_name = 'invoice_status') then
    execute 'update public.invoices set status = case when invoice_status is null then coalesce(status, ''Unpaid'') else initcap(invoice_status::text) end';
  end if;
end $$;

alter table public.invoice_items add column if not exists invoice_id uuid references public.invoices(id) on delete cascade;
alter table public.invoice_items add column if not exists delivery_id uuid references public.deliveries(id);
alter table public.invoice_items add column if not exists product_name text;
alter table public.invoice_items add column if not exists delivery_date date;
alter table public.invoice_items add column if not exists quantity numeric default 0;
alter table public.invoice_items add column if not exists unit_price numeric default 0;
alter table public.invoice_items add column if not exists total_amount numeric default 0;
alter table public.invoice_items add column if not exists created_at timestamptz default now();

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.deliveries to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;

alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.deliveries enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "admin_all_customers" on public.customers;
drop policy if exists "customers_read_own_record" on public.customers;
drop policy if exists "Admins can view own customers" on public.customers;
drop policy if exists "Admins can insert own customers" on public.customers;
drop policy if exists "Admins can update own customers" on public.customers;
drop policy if exists "Admins can delete own customers" on public.customers;

create policy "Admins can view own customers"
on public.customers for select to authenticated
using (admin_id = auth.uid());

create policy "Admins can insert own customers"
on public.customers for insert to authenticated
with check (admin_id = auth.uid());

create policy "Admins can update own customers"
on public.customers for update to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Admins can delete own customers"
on public.customers for delete to authenticated
using (admin_id = auth.uid());

drop policy if exists "admin_all_products" on public.products;
drop policy if exists "Admins can view own products" on public.products;
drop policy if exists "Admins can insert own products" on public.products;
drop policy if exists "Admins can update own products" on public.products;
drop policy if exists "Admins can delete own products" on public.products;

create policy "Admins can view own products"
on public.products for select to authenticated
using (admin_id = auth.uid());

create policy "Admins can insert own products"
on public.products for insert to authenticated
with check (admin_id = auth.uid());

create policy "Admins can update own products"
on public.products for update to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Admins can delete own products"
on public.products for delete to authenticated
using (admin_id = auth.uid());

drop policy if exists "admin_all_deliveries" on public.deliveries;
drop policy if exists "delivery_boys_assigned_deliveries" on public.deliveries;
drop policy if exists "delivery_boys_update_status" on public.deliveries;
drop policy if exists "Admins can view own deliveries" on public.deliveries;
drop policy if exists "Admins can insert own deliveries" on public.deliveries;
drop policy if exists "Admins can update own deliveries" on public.deliveries;
drop policy if exists "Admins can delete own deliveries" on public.deliveries;

create policy "Admins can view own deliveries"
on public.deliveries for select to authenticated
using (admin_id = auth.uid());

create policy "Admins can insert own deliveries"
on public.deliveries for insert to authenticated
with check (admin_id = auth.uid());

create policy "Admins can update own deliveries"
on public.deliveries for update to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Admins can delete own deliveries"
on public.deliveries for delete to authenticated
using (admin_id = auth.uid());

drop policy if exists "admin_all_invoices" on public.invoices;
drop policy if exists "customers_read_own_invoices" on public.invoices;
drop policy if exists "Admins can view own invoices" on public.invoices;
drop policy if exists "Admins can insert own invoices" on public.invoices;
drop policy if exists "Admins can update own invoices" on public.invoices;
drop policy if exists "Admins can delete own invoices" on public.invoices;

create policy "Admins can view own invoices"
on public.invoices for select to authenticated
using (admin_id = auth.uid());

create policy "Admins can insert own invoices"
on public.invoices for insert to authenticated
with check (admin_id = auth.uid());

create policy "Admins can update own invoices"
on public.invoices for update to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Admins can delete own invoices"
on public.invoices for delete to authenticated
using (admin_id = auth.uid());

drop policy if exists "Admins can view own invoice items" on public.invoice_items;
drop policy if exists "Admins can insert own invoice items" on public.invoice_items;
drop policy if exists "Admins can update own invoice items" on public.invoice_items;
drop policy if exists "Admins can delete own invoice items" on public.invoice_items;

create policy "Admins can view own invoice items"
on public.invoice_items for select to authenticated
using (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create policy "Admins can insert own invoice items"
on public.invoice_items for insert to authenticated
with check (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create policy "Admins can update own invoice items"
on public.invoice_items for update to authenticated
using (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create policy "Admins can delete own invoice items"
on public.invoice_items for delete to authenticated
using (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.admin_id = auth.uid()
  )
);

create index if not exists customers_admin_id_idx on public.customers(admin_id);
create index if not exists products_admin_id_idx on public.products(admin_id);
create index if not exists deliveries_admin_id_idx on public.deliveries(admin_id);
create index if not exists deliveries_customer_month_idx on public.deliveries(customer_id, delivery_date);
create index if not exists invoices_admin_id_idx on public.invoices(admin_id);
create index if not exists invoices_customer_month_idx on public.invoices(customer_id, billing_month);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

notify pgrst, 'reload schema';

-- Run this SQL manually in Supabase SQL Editor before using the Android app.
