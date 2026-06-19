alter table if exists public.customers
    add column if not exists product_name text null;

update public.customers c
set product_name = p.name
from public.products p
where c.product_id = p.id
  and (c.product_name is null or c.product_name = '');
