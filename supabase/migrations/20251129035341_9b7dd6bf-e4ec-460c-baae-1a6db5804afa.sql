-- Create referrals table to track referral relationships
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_customer_id)
);

-- Add referral_code column to customers table
ALTER TABLE public.customers ADD COLUMN referral_code TEXT UNIQUE;

-- Generate unique referral codes for existing customers
UPDATE public.customers 
SET referral_code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create indexes for faster lookups
CREATE INDEX idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_customer_id);
CREATE INDEX idx_customers_referral_code ON customers(referral_code);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Customers can view their referrals"
ON public.referrals FOR SELECT
USING (
  get_user_role(auth.uid()) = 'customer' AND 
  (referrer_customer_id = auth.uid() OR referred_customer_id = auth.uid())
);

CREATE POLICY "Dairy owners can view their customers referrals"
ON public.referrals FOR SELECT
USING (
  get_user_role(auth.uid()) = 'dairy_owner' AND 
  referrer_customer_id IN (
    SELECT id FROM customers WHERE dairy_id = get_user_dairy_id(auth.uid())
  )
);

CREATE POLICY "Super admins can manage all referrals"
ON public.referrals FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger to generate referral code for new customers
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();