-- Add onboarding_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Set existing users as already onboarded (so they don't see the wizard)
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE created_at < NOW() - INTERVAL '1 minute';