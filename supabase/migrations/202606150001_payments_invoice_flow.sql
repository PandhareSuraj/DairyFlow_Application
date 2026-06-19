alter table public.invoices
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists billing_month text,
  add column if not exists generated_at timestamptz default now(),
  add column if not exists total_amount numeric not null default 0,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists previous_balance numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists balance_amount numeric not null default 0,
  add column if not exists status text not null default 'Unpaid';

update public.invoices
set generated_at = coalesce(generated_at, created_at, now())
where generated_at is null;

alter table public.payments
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists amount numeric not null default 0,
  add column if not exists payment_mode text,
  add column if not exists payment_method text,
  add column if not exists transaction_id text,
  add column if not exists received_at timestamptz default now();

update public.payments
set payment_method = coalesce(payment_method, payment_mode, 'Cash'),
    payment_mode = coalesce(payment_mode, payment_method, 'Cash'),
    received_at = coalesce(received_at, created_at, now())
where payment_method is null
   or payment_mode is null
   or received_at is null;

create unique index if not exists invoices_unique_admin_customer_month_idx
on public.invoices(admin_id, customer_id, billing_month)
where customer_id is not null and billing_month is not null;

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
        and d.delivery_date between v_start and v_end;

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
            and d.delivery_date between v_start and v_end;

          update public.deliveries d
          set payment_status = 'Billed'
          where d.admin_id = v_admin_id
            and d.customer_id = v_customer.id
            and d.delivery_status = 'Delivered'
            and coalesce(d.payment_status, 'Unpaid') = 'Unpaid'
            and d.delivery_date between v_start and v_end;

          v_invoice_count := v_invoice_count + 1;
        end if;
      end if;
    end loop;
  end loop;

  return v_invoice_count;
end;
$$;

grant execute on function public.generate_monthly_invoices(text, uuid, uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('dairyflow-month-end-invoices');
    perform cron.schedule(
      'dairyflow-month-end-invoices',
      '55 18 28-31 * *',
      $cron$
        select public.generate_monthly_invoices(to_char(current_date, 'YYYY-MM'), null, null)
        where current_date = (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
      $cron$
    );
  end if;
exception
  when others then
    null;
end;
$$;
