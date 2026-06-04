create or replace function public.consume_delivery_qr_token(p_raw_token text, p_device_id text default null)
returns table (
    profile_id uuid,
    admin_id uuid,
    delivery_boy_id uuid,
    full_name text,
    email text,
    auth_email text,
    phone text,
    assigned_route_id uuid,
    qr_login_enabled boolean,
    status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    token_row public.delivery_qr_login_tokens;
begin
    for token_row in
        select t.*
        from public.delivery_qr_login_tokens t
        where t.status = 'active'
          and t.expires_at > now()
        order by t.created_at desc
    loop
        if token_row.token_hash = extensions.crypt(p_raw_token, token_row.token_hash) then
            update public.delivery_qr_login_tokens t
            set status = 'used',
                used_at = now(),
                device_id = p_device_id
            where t.id = token_row.id;

            update public.profiles p
            set last_login_at = now(),
                last_login_method = 'qr_scan'
            where p.id = (
                select db.profile_id
                from public.delivery_boys db
                where db.id = token_row.delivery_boy_id
            );

            return query
            select
                db.profile_id,
                db.admin_id,
                db.id,
                db.full_name,
                db.email,
                p.auth_email,
                db.phone,
                db.assigned_route_id,
                p.qr_login_enabled,
                p.status
            from public.delivery_boys db
            join public.profiles p on p.id = db.profile_id
            where db.id = token_row.delivery_boy_id
              and db.status = 'active'
              and p.status = 'active'
              and p.qr_login_enabled = true
              and p.role = 'delivery_boy'
            limit 1;
            return;
        end if;
    end loop;

    raise exception 'Invalid or expired QR token';
end;
$$;

revoke execute on function public.consume_delivery_qr_token(text, text) from public, anon, authenticated;
grant execute on function public.consume_delivery_qr_token(text, text) to service_role;

notify pgrst, 'reload schema';
