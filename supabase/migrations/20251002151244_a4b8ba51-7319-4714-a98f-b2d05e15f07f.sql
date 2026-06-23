-- Add RLS policies for customers to update their own location
CREATE POLICY "Customers can update their own location"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'customer' AND 
  id = auth.uid()
)
WITH CHECK (
  get_user_role(auth.uid()) = 'customer' AND 
  id = auth.uid()
);

-- Add RLS policy for delivery boys to update customer locations for assigned deliveries
CREATE POLICY "Delivery boys can update assigned customer locations"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'delivery_boy' AND 
  id IN (
    SELECT customer_id FROM orders 
    WHERE delivery_boy_id = auth.uid()
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'delivery_boy' AND 
  id IN (
    SELECT customer_id FROM orders 
    WHERE delivery_boy_id = auth.uid()
  )
);