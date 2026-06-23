-- Create tier enum
CREATE TYPE public.loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Add tier column to customers table
ALTER TABLE public.customers 
ADD COLUMN tier public.loyalty_tier NOT NULL DEFAULT 'bronze';

-- Create function to calculate tier based on points
CREATE OR REPLACE FUNCTION public.calculate_customer_tier(points integer)
RETURNS loyalty_tier
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF points >= 5000 THEN
    RETURN 'platinum';
  ELSIF points >= 3000 THEN
    RETURN 'gold';
  ELSIF points >= 1500 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;

-- Create function to update customer tier
CREATE OR REPLACE FUNCTION public.update_customer_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.tier := calculate_customer_tier(NEW.loyalty_points);
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update tier when points change
CREATE TRIGGER update_customer_tier_trigger
BEFORE INSERT OR UPDATE OF loyalty_points ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_tier();

-- Update existing customers to set their tier based on current points
UPDATE public.customers
SET tier = calculate_customer_tier(loyalty_points);