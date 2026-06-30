alter table public.deliveries
  add column if not exists delivery_boy_status text
    check (delivery_boy_status is null or delivery_boy_status in ('Pending', 'Delivered', 'Skipped')),
  add column if not exists delivery_boy_skip_reason text,
  add column if not exists delivery_completed_at timestamptz,
  add column if not exists is_extra_delivery boolean not null default false;

update public.deliveries
set delivery_status = 'Pending',
    payment_status = 'Unpaid',
    skip_reason = null,
    updated_at = now()
where delivery_date = current_date
  and delivery_status = 'Delivered'
  and delivery_completed_at is null;

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
where d.delivery_date = current_date;

create or replace function public.delivery_boy_update_today_delivery(
  p_delivery_id uuid,
  p_delivery_status text default null,
  p_payment_status text default null,
  p_skip_reason text default null,
  p_product_id uuid default null,
  p_quantity numeric default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_delivery public.deliveries%rowtype;
  v_product public.products%rowtype;
  v_next_boy_status text;
  v_next_product_id uuid;
  v_next_quantity numeric;
  v_next_unit_price numeric;
  v_next_total_amount numeric;
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

  select d.*
  into v_delivery
  from public.deliveries d
  join public.delivery_boys b on b.id = v_profile.delivery_boy_id
  where d.id = p_delivery_id
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and b.status = 'active'
  for update;

  if not found then
    raise exception 'Delivery is not assigned for today';
  end if;

  if v_delivery.delivery_completed_at is not null
     and (p_delivery_status is not null or p_product_id is not null or p_quantity is not null) then
    raise exception 'Today delivery is already completed';
  end if;

  v_next_boy_status := coalesce(p_delivery_status, v_delivery.delivery_boy_status, v_delivery.delivery_status, 'Pending');
  v_next_product_id := coalesce(p_product_id, v_delivery.product_id);
  v_next_quantity := coalesce(p_quantity, v_delivery.quantity);
  v_next_unit_price := v_delivery.unit_price;

  if v_next_boy_status not in ('Pending', 'Delivered', 'Skipped') then
    raise exception 'Invalid delivery status';
  end if;

  if p_payment_status is not null and p_payment_status not in ('Unpaid', 'Paid') then
    raise exception 'Invalid payment status';
  end if;

  if v_next_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  if p_product_id is not null then
    select *
    into v_product
    from public.products
    where id = p_product_id
      and admin_id = v_profile.admin_id
      and status = 'active';

    if not found then
      raise exception 'Product is not available';
    end if;

    v_next_unit_price := v_product.price;
  end if;

  v_next_total_amount := case
    when v_next_boy_status = 'Skipped' then 0
    else v_next_quantity * v_next_unit_price
  end;

  update public.deliveries
  set product_id = v_next_product_id,
      quantity = v_next_quantity,
      unit_price = v_next_unit_price,
      total_amount = v_next_total_amount,
      delivery_boy_status = v_next_boy_status,
      delivery_boy_skip_reason = case
        when v_next_boy_status = 'Skipped' then coalesce(nullif(p_skip_reason, ''), 'Skipped by delivery boy')
        when v_next_boy_status = 'Delivered' then null
        else delivery_boy_skip_reason
      end,
      payment_status = coalesce(p_payment_status, payment_status),
      updated_at = now()
  where id = p_delivery_id
  returning * into v_delivery;

  return v_delivery;
end;
$$;

create or replace function public.delivery_boy_complete_today_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_count integer;
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

  return v_count;
end;
$$;

create or replace function public.delivery_boy_add_extra_today_product(
  p_delivery_id uuid,
  p_product_id uuid,
  p_quantity numeric
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_base_delivery public.deliveries%rowtype;
  v_product public.products%rowtype;
  v_extra_count integer;
  v_delivery_time text;
  v_inserted public.deliveries%rowtype;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and role::text = 'delivery_boy'
    and status = 'active';

  if not found or v_profile.admin_id is null or v_profile.delivery_boy_id is null then
    raise exception 'Delivery boy access is required';
  end if;

  select d.*
  into v_base_delivery
  from public.deliveries d
  join public.delivery_boys b on b.id = v_profile.delivery_boy_id
  where d.id = p_delivery_id
    and d.admin_id = v_profile.admin_id
    and d.delivery_boy_id = v_profile.delivery_boy_id
    and d.route_id = b.assigned_route_id
    and d.delivery_date = current_date
    and b.status = 'active';

  if not found then
    raise exception 'Delivery is not assigned for today';
  end if;

  if v_base_delivery.delivery_completed_at is not null then
    raise exception 'Today delivery is already completed';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
    and admin_id = v_profile.admin_id
    and status = 'active';

  if not found then
    raise exception 'Product is not available';
  end if;

  select count(*)
  into v_extra_count
  from public.deliveries
  where admin_id = v_profile.admin_id
    and customer_id = v_base_delivery.customer_id
    and delivery_date = current_date
    and delivery_time like v_base_delivery.delivery_time || ' Extra%';

  v_delivery_time := v_base_delivery.delivery_time || ' Extra';
  if v_extra_count > 0 then
    v_delivery_time := v_delivery_time || ' ' || (v_extra_count + 1)::text;
  end if;

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
    delivery_boy_status,
    payment_status,
    notes,
    is_extra_delivery
  ) values (
    v_profile.admin_id,
    v_base_delivery.customer_id,
    p_product_id,
    v_base_delivery.route_id,
    v_profile.delivery_boy_id,
    current_date,
    v_delivery_time,
    p_quantity,
    v_product.price,
    p_quantity * v_product.price,
    'Pending',
    'Delivered',
    'Unpaid',
    'Extra product added by delivery boy',
    true
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

grant select on public.today_delivery_view to authenticated;
grant execute on function public.delivery_boy_update_today_delivery(uuid, text, text, text, uuid, numeric) to authenticated;
grant execute on function public.delivery_boy_complete_today_deliveries() to authenticated;
grant execute on function public.delivery_boy_add_extra_today_product(uuid, uuid, numeric) to authenticated;
