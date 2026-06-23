-- Create dairies table for storing dairy information
CREATE TABLE public.dairies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dairies ENABLE ROW LEVEL SECURITY;

-- Create policies for basic access (making it simple for now)
CREATE POLICY "Anyone can view dairies" 
ON public.dairies 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create dairies" 
ON public.dairies 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update dairies" 
ON public.dairies 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete dairies" 
ON public.dairies 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dairies_updated_at
BEFORE UPDATE ON public.dairies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();