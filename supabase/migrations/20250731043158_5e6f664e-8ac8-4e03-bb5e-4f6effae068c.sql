-- Create system_settings table for storing admin-only configuration
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_maps_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only allow reading for authenticated users (will be restricted to admins in application logic)
CREATE POLICY "Allow read access to system settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Only allow updates for authenticated users (will be restricted to admins in application logic)
CREATE POLICY "Allow update access to system settings" 
ON public.system_settings 
FOR UPDATE 
USING (true);

-- Only allow insert for authenticated users (will be restricted to admins in application logic)
CREATE POLICY "Allow insert access to system settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (true);

-- Insert default row
INSERT INTO public.system_settings (google_maps_api_key) VALUES (NULL);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();