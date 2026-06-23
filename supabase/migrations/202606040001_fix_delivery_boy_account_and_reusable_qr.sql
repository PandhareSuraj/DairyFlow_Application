create or replace function public.admin_upsert_delivery_boy_account(
    p_delivery_boy_id uuid default null,
    p_full_name text default '',
    p_email text default '',
    p_phone text default null,
    p_assigned_route_id uuid default null,
    p_active boolean default true
)
returns table (delivery_boy_id uuid, profile_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin_id uuid := auth.uid();
    v_email text := lower(trim(coalesce(p_email, '')));
    v_full_name text := trim(coalesce(p_full_name, ''));
    v_phone text := public.normalize_indian_phone(p_phone);
    v_status text := case when p_active then 'active' else 'inactive' end;
    v_user_id uuid;
    v_delivery_boy_id uuid;
begin
    if v_admin_id is null then
        raise exception 'Admin login is required';
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = v_admin_id
          and p.role = 'admin'
          and p.status = 'active'
    ) then
        raise exception 'Only admin can create delivery boy accounts';
    end if;

    if v_full_name = '' then
        raise exception 'Delivery boy name is required';
    end if;

    if v_email = '' then
        raise exception 'Delivery boy email is required for QR login';
    end if;

    select u.id into v_user_id
    from auth.users u
    where lower(u.email) = v_email
    limit 1;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            phone,
            encrypted_password,
            email_confirmed_at,
            phone_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            is_sso_user,
            is_anonymous
        ) values (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            nullif(v_phone, ''),
            extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
            now(),
            now(),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('full_name', v_full_name, 'phone', v_phone, 'role', 'delivery_boy'),
            now(),
            now(),
            false,
            false
        );
    else
        update auth.users u
        set instance_id = coalesce(u.instance_id, '00000000-0000-0000-0000-000000000000'),
            phone = nullif(v_phone, ''),
            encrypted_password = coalesce(u.encrypted_password, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))),
            email_confirmed_at = coalesce(u.email_confirmed_at, now()),
            phone_confirmed_at = coalesce(u.phone_confirmed_at, now()),
            confirmation_token = coalesce(u.confirmation_token, ''),
            recovery_token = coalesce(u.recovery_token, ''),
            email_change = coalesce(u.email_change, ''),
            email_change_token_new = coalesce(u.email_change_token_new, ''),
            email_change_token_current = coalesce(u.email_change_token_current, ''),
            phone_change = coalesce(u.phone_change, ''),
            phone_change_token = coalesce(u.phone_change_token, ''),
            reauthentication_token = coalesce(u.reauthentication_token, ''),
            raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) ||
                jsonb_build_object('full_name', v_full_name, 'phone', v_phone, 'role', 'delivery_boy'),
            updated_at = now()
        where u.id = v_user_id;
    end if;

    if not exists (select 1 from auth.identities i where i.user_id = v_user_id and i.provider = 'email') then
        insert into auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            created_at,
            updated_at
        ) values (
            v_email,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone', v_phone),
            'email',
            now(),
            now()
        );
    else
        update auth.identities i
        set provider_id = v_email,
            identity_data = coalesce(i.identity_data, '{}'::jsonb) ||
                jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone', v_phone),
            updated_at = now()
        where i.user_id = v_user_id
          and i.provider = 'email';
    end if;

    if p_delivery_boy_id is not null then
        update public.delivery_boys db
        set profile_id = v_user_id,
            full_name = v_full_name,
            phone = nullif(v_phone, ''),
            email = v_email,
            assigned_route_id = p_assigned_route_id,
            status = v_status,
            updated_at = now()
        where db.id = p_delivery_boy_id
          and db.admin_id = v_admin_id
        returning db.id into v_delivery_boy_id;

        if v_delivery_boy_id is null then
            raise exception 'Delivery boy not found under this admin';
        end if;
    else
        select db.id into v_delivery_boy_id
        from public.delivery_boys db
        where db.admin_id = v_admin_id
          and (
              db.profile_id = v_user_id
              or lower(coalesce(db.email, '')) = v_email
              or (v_phone <> '' and public.normalize_indian_phone(db.phone) = v_phone)
          )
        order by db.created_at desc
        limit 1;

        if v_delivery_boy_id is null then
            insert into public.delivery_boys (
                admin_id,
                profile_id,
                full_name,
                phone,
                email,
                assigned_route_id,
                status,
                updated_at
            ) values (
                v_admin_id,
                v_user_id,
                v_full_name,
                nullif(v_phone, ''),
                v_email,
                p_assigned_route_id,
                v_status,
                now()
            )
            returning id into v_delivery_boy_id;
        else
            update public.delivery_boys db
            set profile_id = v_user_id,
                full_name = v_full_name,
                phone = nullif(v_phone, ''),
                email = v_email,
                assigned_route_id = p_assigned_route_id,
                status = v_status,
                updated_at = now()
            where db.id = v_delivery_boy_id;
        end if;
    end if;

    insert into public.profiles (
        id,
        admin_id,
        delivery_boy_id,
        full_name,
        email,
        auth_email,
        phone,
        normalized_phone,
        role,
        phone_verified,
        login_enabled,
        qr_login_enabled,
        status,
        updated_at
    ) values (
        v_user_id,
        v_admin_id,
        v_delivery_boy_id,
        v_full_name,
        v_email,
        v_email,
        nullif(v_phone, ''),
        nullif(v_phone, ''),
        'delivery_boy',
        true,
        true,
        true,
        v_status,
        now()
    )
    on conflict (id) do update set
        admin_id = excluded.admin_id,
        delivery_boy_id = excluded.delivery_boy_id,
        full_name = excluded.full_name,
        email = excluded.email,
        auth_email = excluded.auth_email,
        phone = excluded.phone,
        normalized_phone = excluded.normalized_phone,
        role = 'delivery_boy',
        phone_verified = true,
        login_enabled = true,
        qr_login_enabled = true,
        status = excluded.status,
        updated_at = now();

    return query select v_delivery_boy_id, v_user_id;
end;
$$;

grant execute on function public.admin_upsert_delivery_boy_account(uuid, text, text, text, uuid, boolean) to authenticated;

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
            return query
            select
                db.profile_id,
                db.admin_id,
                db.id,
                db.full_name,
                db.email,
                coalesce(p.auth_email, au.email),
                db.phone,
                db.assigned_route_id,
                p.qr_login_enabled,
                p.status
            from public.delivery_boys db
            join public.profiles p on p.id = db.profile_id
            left join auth.users au on au.id = db.profile_id
            where db.id = token_row.delivery_boy_id
              and db.status = 'active'
              and p.status = 'active'
              and p.qr_login_enabled = true
              and p.role = 'delivery_boy'
              and coalesce(p.auth_email, au.email, db.email) is not null
            limit 1;

            if found then
                update public.delivery_qr_login_tokens t
                set used_at = now(),
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
                return;
            end if;

            raise exception 'Delivery boy account is not active or is not linked for QR login';
        end if;
    end loop;

    raise exception 'Invalid or expired QR token';
end;
$$;

revoke execute on function public.consume_delivery_qr_token(text, text) from public, anon, authenticated;
grant execute on function public.consume_delivery_qr_token(text, text) to service_role;

notify pgrst, 'reload schema';
