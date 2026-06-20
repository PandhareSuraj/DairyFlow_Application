create table if not exists public.delivery_boy_daily_stock (
    id uuid primary key default gen_random_uuid(),
    delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
    stock_date date not null,
    cow_milk_taken_liters numeric(10,2) not null default 0,
    buffalo_milk_taken_liters numeric(10,2) not null default 0,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint delivery_boy_daily_stock_non_negative check (
        cow_milk_taken_liters >= 0 and buffalo_milk_taken_liters >= 0
    ),
    constraint delivery_boy_daily_stock_unique unique (delivery_boy_id, stock_date)
);

create table if not exists public.delivery_day_completion (
    id uuid primary key default gen_random_uuid(),
    delivery_boy_id uuid not null references public.delivery_boys(id) on delete cascade,
    completion_date date not null,
    status text not null default 'completed',
    completed_at timestamptz null,
    created_at timestamptz not null default now(),
    constraint delivery_day_completion_status_check check (status in ('completed', 'partial', 'pending')),
    constraint delivery_day_completion_unique unique (delivery_boy_id, completion_date)
);

create index if not exists idx_delivery_boy_daily_stock_boy_date
on public.delivery_boy_daily_stock(delivery_boy_id, stock_date);

create index if not exists idx_delivery_day_completion_boy_date
on public.delivery_day_completion(delivery_boy_id, completion_date);

alter table public.delivery_boy_daily_stock enable row level security;
alter table public.delivery_day_completion enable row level security;

drop policy if exists "delivery_boy_daily_stock_admin_all" on public.delivery_boy_daily_stock;
create policy "delivery_boy_daily_stock_admin_all"
on public.delivery_boy_daily_stock for all
using (
    exists (
        select 1 from public.delivery_boys db
        where db.id = delivery_boy_id and db.admin_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.delivery_boys db
        where db.id = delivery_boy_id and db.admin_id = auth.uid()
    )
);

drop policy if exists "delivery_day_completion_admin_select" on public.delivery_day_completion;
create policy "delivery_day_completion_admin_select"
on public.delivery_day_completion for select
using (
    exists (
        select 1 from public.delivery_boys db
        where db.id = delivery_boy_id and db.admin_id = auth.uid()
    )
);

drop policy if exists "delivery_day_completion_boy_select" on public.delivery_day_completion;
create policy "delivery_day_completion_boy_select"
on public.delivery_day_completion for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'delivery_boy'
          and p.delivery_boy_id = delivery_day_completion.delivery_boy_id
    )
);

grant select, insert, update, delete on public.delivery_boy_daily_stock to authenticated;
grant select, insert, update on public.delivery_day_completion to authenticated;

create or replace function public.delivery_boy_complete_today_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_count integer;
  v_completed_count integer;
  v_skipped_count integer;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and role::text = 'delivery_boy'
    and status = 'active';

  if not found or v_profile.admin_id is null or v_profile.delivery_boy_id is null then
    raise exception 'Delivery boy access is required';
  end if;

  update public.deliveries d
  set delivery_status = d.delivery_boy_status,
      total_amount = case
        when d.delivery_boy_status = 'Skipped' then 0
        else d.quantity * d.unit_price
      end,
      payment_status = case
        when d.delivery_boy_status = 'Skipped' then 'Unpaid'
        else d.payment_status
      end,
      skip_reason = case
        when d.delivery_boy_status = 'Skipped' then coalesce(d.delivery_boy_skip_reason, 'Skipped by delivery boy')
        else null
      end,
      delivery_completed_at = now(),
      updated_at = now()
  from public.delivery_boys b
  where b.id = v_profile.delivery_boy_id
    and b.admin_id = v_profile.admin_id
    and b.status = 'active'
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and d.delivery_completed_at is null
    and d.delivery_boy_status in ('Delivered', 'Skipped');

  get diagnostics v_count = row_count;

  delete from public.payments p
  using public.deliveries d
  where p.delivery_id = d.id
    and p.collected_by = v_profile.delivery_boy_id
    and d.delivery_date = current_date
    and d.delivery_status = 'Skipped';

  select
    count(*) filter (where delivery_status = 'Delivered'),
    count(*) filter (where delivery_status = 'Skipped')
  into v_completed_count, v_skipped_count
  from public.deliveries
  where delivery_boy_id = v_profile.delivery_boy_id
    and delivery_date = current_date
    and delivery_completed_at is not null;

  if v_completed_count > 0 or v_skipped_count > 0 then
    insert into public.delivery_day_completion (
      delivery_boy_id, completion_date, status, completed_at
    )
    values (
      v_profile.delivery_boy_id,
      current_date,
      case when v_skipped_count > 0 then 'partial' else 'completed' end,
      now()
    )
    on conflict (delivery_boy_id, completion_date)
    do update set
      status = excluded.status,
      completed_at = excluded.completed_at;
  end if;

  return v_count;
end;
$$;

grant execute on function public.delivery_boy_complete_today_deliveries() to authenticated;
