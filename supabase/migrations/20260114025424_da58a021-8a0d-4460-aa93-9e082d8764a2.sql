-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language text DEFAULT 'en';

-- Add preferred_language column to customers table
ALTER TABLE public.customers 
ADD COLUMN preferred_language text DEFAULT 'en';