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
