drop policy if exists "customers_insert_policy" on public.customers;

create policy "customers_insert_policy"
on public.customers
for insert
to authenticated
with check (
    (
        admin_id = auth.uid()
        and public.current_user_role() = 'admin'
    )
    or (
        admin_id = public.current_admin_id()
        and public.current_user_role() = 'delivery_boy'
    )
);
