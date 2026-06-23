-- Create orders table for tracking all delivery orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  dairy_id UUID NOT NULL,
  product_id UUID NOT NULL,
  delivery_boy_id UUID,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  delivery_date DATE NOT NULL,
  delivery_time TIME DEFAULT '08:00:00',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  order_type TEXT NOT NULL DEFAULT 'one_time' CHECK (order_type IN ('one_time', 'recurring')),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer subscriptions table for recurring orders
CREATE TABLE public.customer_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  dairy_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_delivery_date DATE NOT NULL,
  delivery_time TIME DEFAULT '08:00:00',
  days_of_week TEXT[] DEFAULT NULL, -- For weekly subscriptions: ['monday', 'tuesday', etc.]
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete orders" ON public.orders FOR DELETE USING (true);

-- Create policies for customer_subscriptions
CREATE POLICY "Anyone can view subscriptions" ON public.customer_subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can create subscriptions" ON public.customer_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subscriptions" ON public.customer_subscriptions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete subscriptions" ON public.customer_subscriptions FOR DELETE USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_dairy_id ON public.orders(dairy_id);
CREATE INDEX idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_subscriptions_customer_id ON public.customer_subscriptions(customer_id);
CREATE INDEX idx_subscriptions_dairy_id ON public.customer_subscriptions(dairy_id);
CREATE INDEX idx_subscriptions_next_delivery_date ON public.customer_subscriptions(next_delivery_date);