-- Add 'pending' and 'rejected' status to customer_subscriptions if not already present
-- Note: The status column already exists with default 'active', we're just documenting valid values

-- Drop existing customer subscription policies to recreate them with proper logic
DROP POLICY IF EXISTS "Customers can view their subscriptions" ON customer_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON customer_subscriptions;
DROP POLICY IF EXISTS "Dairy owners can manage their dairy subscriptions" ON customer_subscriptions;

-- Allow customers to INSERT subscriptions with pending status for their own dairy
CREATE POLICY "Customers can request subscriptions"
ON customer_subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'customer' AND
  auth.uid() = customer_id AND
  status = 'pending' AND
  dairy_id IN (SELECT dairy_id FROM customers WHERE id = auth.uid())
);

-- Allow customers to view their own subscriptions (all statuses)
CREATE POLICY "Customers can view their subscriptions"
ON customer_subscriptions FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'customer' AND
  auth.uid() = customer_id
);

-- Allow super admins to manage all subscriptions
CREATE POLICY "Super admins can manage all subscriptions"
ON customer_subscriptions FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Allow dairy owners to view all subscriptions for their dairy
CREATE POLICY "Dairy owners can view their dairy subscriptions"
ON customer_subscriptions FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'dairy_owner' AND
  dairy_id = get_user_dairy_id(auth.uid())
);

-- Allow dairy owners to approve/reject/update subscriptions (change status from pending to active/rejected)
CREATE POLICY "Dairy owners can manage their dairy subscriptions"
ON customer_subscriptions FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'dairy_owner' AND
  dairy_id = get_user_dairy_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'dairy_owner' AND
  dairy_id = get_user_dairy_id(auth.uid())
);

-- Allow dairy owners to insert subscriptions for their customers (manual creation)
CREATE POLICY "Dairy owners can create subscriptions"
ON customer_subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'dairy_owner' AND
  dairy_id = get_user_dairy_id(auth.uid())
);