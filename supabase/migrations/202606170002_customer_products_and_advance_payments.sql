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
