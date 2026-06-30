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
