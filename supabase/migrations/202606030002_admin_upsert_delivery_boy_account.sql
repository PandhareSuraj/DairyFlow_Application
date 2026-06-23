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

    if public.current_user_role() <> 'admin' then
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
            email_confirmed_at,
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
            now(),
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
            email_confirmed_at = coalesce(u.email_confirmed_at, now()),
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
              or public.normalize_indian_phone(db.phone) = v_phone
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
notify pgrst, 'reload schema';
