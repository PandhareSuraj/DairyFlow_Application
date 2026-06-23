-- Add indexes for performance on dairy_id columns
CREATE INDEX IF NOT EXISTS idx_profiles_dairy_id ON profiles(dairy_id);
CREATE INDEX IF NOT EXISTS idx_customers_dairy_id ON customers(dairy_id);
CREATE INDEX IF NOT EXISTS idx_delivery_boys_dairy_id ON delivery_boys(dairy_id);
CREATE INDEX IF NOT EXISTS idx_products_dairy_id ON products(dairy_id);
CREATE INDEX IF NOT EXISTS idx_orders_dairy_id ON orders(dairy_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_dairy_id ON customer_subscriptions(dairy_id);

-- Add indexes on role for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add indexes on status columns for filtering
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_delivery_boys_status ON delivery_boys(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(status);

-- Ensure delivery_boys always have a dairy_id
ALTER TABLE delivery_boys 
  DROP CONSTRAINT IF EXISTS delivery_boys_dairy_id_required;
  
ALTER TABLE delivery_boys 
  ADD CONSTRAINT delivery_boys_dairy_id_required 
  CHECK (dairy_id IS NOT NULL);

-- Ensure customers always have a dairy_id
ALTER TABLE customers 
  DROP CONSTRAINT IF EXISTS customers_dairy_id_required;
  
ALTER TABLE customers 
  ADD CONSTRAINT customers_dairy_id_required 
  CHECK (dairy_id IS NOT NULL);