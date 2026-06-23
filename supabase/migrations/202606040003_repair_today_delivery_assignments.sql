update public.deliveries d
set delivery_boy_id = b.id,
    delivery_status = case
      when d.delivery_status = 'Skipped' then 'Skipped'
      else 'Pending'
    end,
    payment_status = case
      when d.delivery_status = 'Skipped' then 'Unpaid'
      else d.payment_status
    end,
    total_amount = case
      when d.delivery_status = 'Skipped' then 0
      else d.quantity * d.unit_price
    end,
    updated_at = now()
from public.delivery_boys b
where d.admin_id = b.admin_id
  and d.route_id = b.assigned_route_id
  and b.status = 'active'
  and d.delivery_date = current_date
  and d.delivery_status in ('Delivered', 'Pending', 'Skipped');
