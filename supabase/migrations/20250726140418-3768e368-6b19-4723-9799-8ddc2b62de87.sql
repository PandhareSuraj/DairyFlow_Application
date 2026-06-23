-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES public.dairies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES public.dairies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_boys table
CREATE TABLE public.delivery_boys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dairy_id UUID NOT NULL REFERENCES public.dairies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_boys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete products" 
ON public.products 
FOR DELETE 
USING (true);

-- Create RLS policies for customers
CREATE POLICY "Anyone can view customers" 
ON public.customers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update customers" 
ON public.customers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete customers" 
ON public.customers 
FOR DELETE 
USING (true);

-- Create RLS policies for delivery_boys
CREATE POLICY "Anyone can view delivery_boys" 
ON public.delivery_boys 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create delivery_boys" 
ON public.delivery_boys 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update delivery_boys" 
ON public.delivery_boys 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete delivery_boys" 
ON public.delivery_boys 
FOR DELETE 
USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_boys_updated_at
BEFORE UPDATE ON public.delivery_boys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();