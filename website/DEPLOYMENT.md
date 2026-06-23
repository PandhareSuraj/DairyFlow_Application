# Production Deployment Checklist

## Pre-Deployment

- [ ] Run Step 16 cleanup queries (verify with SELECT first)
- [ ] Apply Step 17 constraints migration
- [ ] Verify all RLS policies are restrictive (not `TO PUBLIC`)
- [ ] Confirm email verification is enforced for dairy owners
- [ ] Test order creation flow end-to-end
- [ ] Verify bundle size is under 500KB initial load
- [ ] Check PWA installability in Chrome DevTools
- [ ] Run `npx vitest run` — all tests pass
- [ ] Backup database before deploying schema changes

## Data Cleanup SQL (Step 16)

Run these in Supabase Dashboard > SQL Editor (with **Live** selected):

```sql
-- 1. Preview affected rows first
SELECT id, name, email FROM customers 
WHERE name ILIKE '%trail%' OR name ILIKE '%asdf%' OR name ILIKE '%test%'
  OR email ILIKE '%.kk' OR email ILIKE '%test%';

SELECT id, name, email FROM profiles 
WHERE name ILIKE '%trail%' OR name ILIKE '%asdf%' OR name ILIKE '%test%'
  OR email ILIKE '%.kk';

-- 2. After verifying, delete
DELETE FROM customers 
WHERE name ILIKE '%trail%' OR name ILIKE '%asdf%' OR name ILIKE '%test%'
  OR email ILIKE '%.kk' OR email ILIKE '%test%';

DELETE FROM orders WHERE customer_id NOT IN (SELECT id FROM customers);
DELETE FROM customer_subscriptions WHERE customer_id NOT IN (SELECT id FROM customers);
```

## Database Constraints (Step 17)

After Step 16 cleanup, apply the constraints migration via Supabase migrations.

## Migration 1: Security Triggers + Performance Indexes

Run this as a new migration in Supabase (Cloud View > Run SQL):

```sql
-- 1. Prevent self-role-change
CREATE OR REPLACE FUNCTION public.protect_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only super admins can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_role_change();

-- 2. Sync role changes to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_role_to_auth()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb) ||
      jsonb_build_object('role', NEW.role::text)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_auth();

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy_id ON orders(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer_id
  ON customer_subscriptions(customer_id);
```

## Migration 2: Data Integrity Constraints (run AFTER Step 16 cleanup)

```sql
ALTER TABLE customers ALTER COLUMN name SET NOT NULL;
ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;
ALTER TABLE customers ALTER COLUMN address SET NOT NULL;
ALTER TABLE customers ALTER COLUMN dairy_id SET NOT NULL;

ALTER TABLE products ALTER COLUMN name SET NOT NULL;
ALTER TABLE products ALTER COLUMN price SET NOT NULL;
ALTER TABLE products ALTER COLUMN dairy_id SET NOT NULL;

ALTER TABLE delivery_boys ALTER COLUMN name SET NOT NULL;
ALTER TABLE delivery_boys ALTER COLUMN phone SET NOT NULL;
ALTER TABLE delivery_boys ALTER COLUMN dairy_id SET NOT NULL;

ALTER TABLE customers ADD CONSTRAINT chk_customers_phone_format
  CHECK (phone ~ '^(\+91[-\s]?)?[6-9]\d{9}$');
ALTER TABLE customers ADD CONSTRAINT chk_customers_email_format
  CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE products ADD CONSTRAINT chk_products_price_positive CHECK (price > 0);
ALTER TABLE orders ADD CONSTRAINT chk_orders_quantity_positive CHECK (quantity > 0);
ALTER TABLE orders ADD CONSTRAINT chk_orders_price_positive CHECK (price > 0 AND total_price > 0);
ALTER TABLE customers ADD CONSTRAINT uq_customers_phone_dairy UNIQUE (phone, dairy_id);
ALTER TABLE delivery_boys ADD CONSTRAINT uq_delivery_boys_phone_dairy UNIQUE (phone, dairy_id);
```

## Post-Deployment

- [ ] Verify all dashboards load correctly
- [ ] Test login/logout flow
- [ ] Confirm PWA install works on mobile
- [ ] Check error tracking captures errors in console
