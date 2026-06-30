-- Multi-tenant dairy management schema for admins and delivery boys.
-- Apply after the existing DairyFlow schema migrations.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists admin_id uuid references auth.users(id) on delete cascade;
alter table public.profiles add column if not exists delivery_boy_id uuid;
alter table public.profiles add column if not exists admin_access_code text;

update public.profiles
set role = 'admin'
where role is null or role = 'customer';

update public.profiles
set admin_id = id
where role = 'admin' and admin_id is null;

update public.profiles
set admin_access_code = 'DF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where role = 'admin' and (admin_access_code is null or admin_access_code = '');

create unique index if not exists profiles_admin_access_code_idx
on public.profiles(admin_access_code)
where admin_access_code is not null;

create index if not exists profiles_admin_id_idx on public.profiles(admin_id);
create index if not exists profiles_delivery_boy_id_idx on public.profiles(delivery_boy_id);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  route_name text not null,
  area text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_boys (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  route_id uuid references public.routes(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_delivery_boy_id_fkey
  foreign key (delivery_boy_id) references public.delivery_boys(id) on delete set null
  not valid;

alter table public.profiles validate constraint profiles_delivery_boy_id_fkey;

alter table public.customers add column if not exists route_id uuid references public.routes(id) on delete set null;
alter table public.customers add column if not exists morning_quantity numeric not null default 0;
alter table public.customers add column if not exists evening_quantity numeric not null default 0;

update public.customers
set morning_quantity = case when delivery_time = 'Evening' then 0 else daily_quantity end,
    evening_quantity = case when delivery_time = 'Evening' then daily_quantity else 0 end
where morning_quantity = 0 and evening_quantity = 0 and daily_quantity > 0;

alter table public.deliveries add column if not exists route_id uuid references public.routes(id) on delete set null;
alter table public.deliveries add column if not exists delivery_boy_id uuid references public.delivery_boys(id) on delete set null;
alter table public.deliveries add column if not exists skip_reason text;

alter table public.payments add column if not exists delivery_id uuid references public.deliveries(id) on delete set null;
alter table public.payments add column if not exists collected_by uuid references public.delivery_boys(id) on delete set null;

create index if not exists routes_admin_id_idx on public.routes(admin_id);
create index if not exists delivery_boys_admin_id_idx on public.delivery_boys(admin_id);
create index if not exists delivery_boys_profile_id_idx on public.delivery_boys(profile_id);
create index if not exists delivery_boys_route_id_idx on public.delivery_boys(route_id);
create index if not exists customers_route_id_idx on public.customers(route_id);
create index if not exists deliveries_route_id_idx on public.deliveries(route_id);
create index if not exists deliveries_delivery_boy_id_idx on public.deliveries(delivery_boy_id);
create index if not exists deliveries_today_delivery_boy_idx on public.deliveries(delivery_date, delivery_boy_id);
create index if not exists payments_delivery_id_idx on public.payments(delivery_id);
create index if not exists payments_collected_by_idx on public.payments(collected_by);

drop trigger if exists routes_set_updated_at on public.routes;
create trigger routes_set_updated_at
before update on public.routes
for each row execute function public.set_updated_at();

drop trigger if exists delivery_boys_set_updated_at on public.delivery_boys;
create trigger delivery_boys_set_updated_at
before update on public.delivery_boys
for each row execute function public.set_updated_at();

create or replace function public.current_tenant_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'admin' then p.id
    when p.role = 'delivery_boy' then p.admin_id
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
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
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
    and p.role = 'delivery_boy'
    and p.status = 'active'
$$;

create or replace function public.current_delivery_boy_route_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.route_id
  from public.profiles p
  join public.delivery_boys b on b.id = p.delivery_boy_id
  where p.id = auth.uid()
    and p.role = 'delivery_boy'
    and p.status = 'active'
    and b.status = 'active'
$$;

grant select, insert, update, delete on public.routes to authenticated;
grant select, insert, update, delete on public.delivery_boys to authenticated;

alter table public.routes enable row level security;
alter table public.delivery_boys enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'routes', 'delivery_boys', 'customers', 'products', 'deliveries', 'invoices', 'invoice_items', 'payments')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy "Profiles are readable by owner admin or login code"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or admin_id = public.current_tenant_admin_id()
  or (role = 'admin' and status = 'active')
);

create policy "Profiles are insertable by owner"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "Profiles are updatable by owner or admin"
on public.profiles for update to authenticated
using (id = auth.uid() or admin_id = auth.uid())
with check (id = auth.uid() or admin_id = auth.uid());

create policy "Routes admin owns all and delivery boy reads assigned"
on public.routes for select to authenticated
using (
  admin_id = auth.uid()
  or id = public.current_delivery_boy_route_id()
);

create policy "Routes admin writes"
on public.routes for all to authenticated
using (admin_id = auth.uid() and public.is_current_admin())
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Delivery boys admin owns all or own row"
on public.delivery_boys for select to authenticated
using (
  admin_id = auth.uid()
  or id = public.current_delivery_boy_id()
  or (
    admin_id = public.current_tenant_admin_id()
    and (
      profile_id = auth.uid()
      or (
        profile_id is null
        and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  )
);

create policy "Delivery boys admin writes"
on public.delivery_boys for all to authenticated
using (admin_id = auth.uid() and public.is_current_admin())
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Delivery boys claim own login row"
on public.delivery_boys for update to authenticated
using (
  admin_id = public.current_tenant_admin_id()
  and (
    profile_id = auth.uid()
    or (
      profile_id is null
      and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
)
with check (
  admin_id = public.current_tenant_admin_id()
  and profile_id = auth.uid()
);

create policy "Delivery boys create own login row"
on public.delivery_boys for insert to authenticated
with check (
  admin_id = public.current_tenant_admin_id()
  and profile_id = auth.uid()
);

create policy "Customers admin owns all and delivery boy reads route"
on public.customers for select to authenticated
using (
  admin_id = auth.uid()
  or (
    admin_id = public.current_tenant_admin_id()
    and route_id = public.current_delivery_boy_route_id()
  )
);

create policy "Customers admin writes"
on public.customers for all to authenticated
using (admin_id = auth.uid() and public.is_current_admin())
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Products admin owns all"
on public.products for all to authenticated
using (admin_id = auth.uid() and public.is_current_admin())
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Deliveries admin owns all and delivery boy reads today assigned"
on public.deliveries for select to authenticated
using (
  admin_id = auth.uid()
  or (
    admin_id = public.current_tenant_admin_id()
    and delivery_boy_id = public.current_delivery_boy_id()
    and route_id = public.current_delivery_boy_route_id()
  )
);

create policy "Deliveries admin writes"
on public.deliveries for all to authenticated
using (admin_id = auth.uid() and public.is_current_admin())
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Delivery boys update today's assigned deliveries"
on public.deliveries for update to authenticated
using (
  admin_id = public.current_tenant_admin_id()
  and delivery_boy_id = public.current_delivery_boy_id()
  and route_id = public.current_delivery_boy_route_id()
  and delivery_date = current_date
)
with check (
  admin_id = public.current_tenant_admin_id()
  and delivery_boy_id = public.current_delivery_boy_id()
  and route_id = public.current_delivery_boy_route_id()
  and delivery_date = current_date
);

create policy "Invoices admin owns all"
on public.invoices for all to authenticated
using (admin_id = auth.uid() and public.is_current_admin())
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Invoice items readable through owned invoice"
on public.invoice_items for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.admin_id = auth.uid()
      and public.is_current_admin()
  )
);

create policy "Invoice items insertable through owned invoice"
on public.invoice_items for insert to authenticated
with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.admin_id = auth.uid()
      and public.is_current_admin()
  )
);

create policy "Payments admin owns all and delivery boy records own collection"
on public.payments for select to authenticated
using (
  admin_id = auth.uid()
  or collected_by = public.current_delivery_boy_id()
);

create policy "Payments admin inserts"
on public.payments for insert to authenticated
with check (admin_id = auth.uid() and public.is_current_admin());

create policy "Payments delivery boy inserts today assigned collection"
on public.payments for insert to authenticated
with check (
  admin_id = public.current_tenant_admin_id()
  and collected_by = public.current_delivery_boy_id()
  and exists (
    select 1 from public.deliveries d
    where d.id = payments.delivery_id
      and d.admin_id = payments.admin_id
      and d.delivery_boy_id = payments.collected_by
      and d.delivery_date = current_date
  )
);

notify pgrst, 'reload schema';
