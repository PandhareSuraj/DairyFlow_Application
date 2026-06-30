drop policy if exists "deliveries_insert_policy" on public.deliveries;

create policy "deliveries_insert_policy"
on public.deliveries
for insert
to authenticated
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or (
        public.current_user_role() = 'delivery_boy'
        and admin_id = public.current_admin_id()
        and delivery_date = current_date
        and exists (
            select 1
            from public.profiles p
            join public.delivery_boys db on db.id = p.delivery_boy_id
            where p.id = auth.uid()
              and p.status = 'active'
              and p.role = 'delivery_boy'
              and db.status = 'active'
              and db.admin_id = public.deliveries.admin_id
              and db.id = public.deliveries.delivery_boy_id
              and (
                  public.deliveries.route_id is null
                  or db.assigned_route_id = public.deliveries.route_id
              )
        )
    )
);
