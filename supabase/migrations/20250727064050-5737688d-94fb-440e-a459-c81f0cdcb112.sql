-- Add location fields to customers table for map functionality
ALTER TABLE public.customers 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN location_notes TEXT;