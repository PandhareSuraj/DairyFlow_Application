-- Add loyalty points to customers table
ALTER TABLE public.customers 
ADD COLUMN loyalty_points integer NOT NULL DEFAULT 0;

-- Add points earned to orders table
ALTER TABLE public.orders 
ADD COLUMN points_earned integer DEFAULT 0,
ADD COLUMN points_redeemed integer DEFAULT 0,
ADD COLUMN discount_applied numeric DEFAULT 0;

-- Create delivery ratings table
CREATE TABLE public.delivery_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  dairy_id uuid NOT NULL,
  delivery_rating integer NOT NULL CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  product_rating integer NOT NULL CHECK (product_rating >= 1 AND product_rating <= 5),
  delivery_feedback text,
  product_feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id, customer_id)
);

-- Enable RLS on delivery_ratings
ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

-- Customers can view their own ratings
CREATE POLICY "Customers can view their own ratings"
ON public.delivery_ratings
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'customer' AND 
  auth.uid() = customer_id
);

-- Customers can create ratings for their completed orders
CREATE POLICY "Customers can rate their completed orders"
ON public.delivery_ratings
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'customer' AND 
  auth.uid() = customer_id AND
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_id 
    AND orders.customer_id = auth.uid()
    AND orders.status = 'delivered'
  )
);

-- Dairy owners can view ratings for their dairy
CREATE POLICY "Dairy owners can view their dairy ratings"
ON public.delivery_ratings
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'dairy_owner' AND 
  dairy_id = get_user_dairy_id(auth.uid())
);

-- Super admins can manage all ratings
CREATE POLICY "Super admins can manage all ratings"
ON public.delivery_ratings
FOR ALL
USING (is_super_admin(auth.uid()));

-- Create points transactions table for tracking points history
CREATE TABLE public.points_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjustment')),
  points integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on points_transactions
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Customers can view their own points history
CREATE POLICY "Customers can view their points history"
ON public.points_transactions
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'customer' AND 
  auth.uid() = customer_id
);

-- Dairy owners can view points history for their customers
CREATE POLICY "Dairy owners can view their customers points"
ON public.points_transactions
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'dairy_owner' AND 
  customer_id IN (
    SELECT id FROM public.customers 
    WHERE dairy_id = get_user_dairy_id(auth.uid())
  )
);

-- Super admins can manage all points transactions
CREATE POLICY "Super admins can manage all points transactions"
ON public.points_transactions
FOR ALL
USING (is_super_admin(auth.uid()));

-- Create trigger for updated_at on delivery_ratings
CREATE TRIGGER update_delivery_ratings_updated_at
BEFORE UPDATE ON public.delivery_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_delivery_ratings_order_id ON public.delivery_ratings(order_id);
CREATE INDEX idx_delivery_ratings_customer_id ON public.delivery_ratings(customer_id);
CREATE INDEX idx_points_transactions_customer_id ON public.points_transactions(customer_id);
CREATE INDEX idx_points_transactions_order_id ON public.points_transactions(order_id);