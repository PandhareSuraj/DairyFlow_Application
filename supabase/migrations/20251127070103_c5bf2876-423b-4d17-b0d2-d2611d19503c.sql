-- Add birthday and anniversary tracking to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS anniversary_date date;

-- Create table to track awarded rewards to prevent duplicates
CREATE TABLE IF NOT EXISTS public.reward_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('birthday', 'anniversary')),
  reward_year integer NOT NULL,
  points_awarded integer NOT NULL,
  tier text NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, reward_type, reward_year)
);

-- Enable RLS on reward_history
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for reward_history
CREATE POLICY "Customers can view their own reward history"
ON public.reward_history
FOR SELECT
USING (get_user_role(auth.uid()) = 'customer' AND auth.uid() = customer_id);

CREATE POLICY "Dairy owners can view their customers reward history"
ON public.reward_history
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'dairy_owner' 
  AND customer_id IN (
    SELECT id FROM customers WHERE dairy_id = get_user_dairy_id(auth.uid())
  )
);

CREATE POLICY "Super admins can manage all reward history"
ON public.reward_history
FOR ALL
USING (is_super_admin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reward_history_customer_id ON public.reward_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_reward_type ON public.reward_history(reward_type);
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON public.customers(birthday) WHERE birthday IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_anniversary ON public.customers(anniversary_date) WHERE anniversary_date IS NOT NULL;