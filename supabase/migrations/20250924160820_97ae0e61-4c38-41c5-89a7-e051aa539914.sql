-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'dairy_owner', 'delivery_boy', 'customer');

-- Create profiles table linked to Supabase Auth
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  dairy_id UUID REFERENCES public.dairies(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for multiple roles per user if needed
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  dairy_id UUID REFERENCES public.dairies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, dairy_id)
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_dairy_id(user_id UUID)
RETURNS UUID AS $$
  SELECT dairy_id FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'super_admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create audit trail table
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'customer'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for user_roles updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Super admins can manage all user roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for audit_log
CREATE POLICY "Super admins can view audit logs" ON public.audit_log
  FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Update RLS policies for existing tables with proper data isolation

-- Dairies table - only super admin and dairy owners can manage
DROP POLICY IF EXISTS "Anyone can view dairies" ON public.dairies;
DROP POLICY IF EXISTS "Anyone can create dairies" ON public.dairies;
DROP POLICY IF EXISTS "Anyone can update dairies" ON public.dairies;
DROP POLICY IF EXISTS "Anyone can delete dairies" ON public.dairies;

CREATE POLICY "Super admins can manage all dairies" ON public.dairies
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view dairies" ON public.dairies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can create dairies" ON public.dairies
  FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));

-- Customers table - dairy owners can only see their dairy's customers
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;

CREATE POLICY "Super admins can manage all customers" ON public.customers
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Dairy owners can manage their customers" ON public.customers
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'dairy_owner' 
    AND dairy_id = public.get_user_dairy_id(auth.uid())
  );

CREATE POLICY "Customers can view their own data" ON public.customers
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'customer' 
    AND id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
  );

-- Products table - dairy specific access
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can create products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;

CREATE POLICY "Super admins can manage all products" ON public.products
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Dairy owners can manage their products" ON public.products
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'dairy_owner' 
    AND dairy_id = public.get_user_dairy_id(auth.uid())
  );

CREATE POLICY "Users can view products" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Delivery boys table - dairy specific access
DROP POLICY IF EXISTS "Anyone can view delivery_boys" ON public.delivery_boys;
DROP POLICY IF EXISTS "Anyone can create delivery_boys" ON public.delivery_boys;
DROP POLICY IF EXISTS "Anyone can update delivery_boys" ON public.delivery_boys;
DROP POLICY IF EXISTS "Anyone can delete delivery_boys" ON public.delivery_boys;

CREATE POLICY "Super admins can manage all delivery boys" ON public.delivery_boys
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Dairy owners can manage their delivery boys" ON public.delivery_boys
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'dairy_owner' 
    AND dairy_id = public.get_user_dairy_id(auth.uid())
  );

CREATE POLICY "Delivery boys can view their own data" ON public.delivery_boys
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'delivery_boy' 
    AND dairy_id = public.get_user_dairy_id(auth.uid())
  );

-- Orders table - complex access control
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;

CREATE POLICY "Super admins can manage all orders" ON public.orders
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Dairy owners can manage their dairy orders" ON public.orders
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'dairy_owner' 
    AND dairy_id = public.get_user_dairy_id(auth.uid())
  );

CREATE POLICY "Delivery boys can view and update assigned orders" ON public.orders
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'delivery_boy' 
    AND (delivery_boy_id = auth.uid() OR dairy_id = public.get_user_dairy_id(auth.uid()))
  );

CREATE POLICY "Delivery boys can update assigned orders" ON public.orders
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'delivery_boy' 
    AND delivery_boy_id = auth.uid()
  );

-- Customer subscriptions table - customer and dairy access
DROP POLICY IF EXISTS "Anyone can view subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Anyone can create subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Anyone can update subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete subscriptions" ON public.customer_subscriptions;

CREATE POLICY "Super admins can manage all subscriptions" ON public.customer_subscriptions
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Dairy owners can manage their dairy subscriptions" ON public.customer_subscriptions
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'dairy_owner' 
    AND dairy_id = public.get_user_dairy_id(auth.uid())
  );

CREATE POLICY "Customers can view their subscriptions" ON public.customer_subscriptions
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'customer' 
    AND customer_id IN (SELECT id FROM public.customers WHERE id = auth.uid())
  );

-- System settings - super admin only
DROP POLICY IF EXISTS "Allow read access to system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow insert access to system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow update access to system settings" ON public.system_settings;

CREATE POLICY "Super admins can manage system settings" ON public.system_settings
  FOR ALL USING (public.is_super_admin(auth.uid()));