-- Fix the status constraint to include 'pending' and 'rejected'
ALTER TABLE customer_subscriptions
DROP CONSTRAINT IF EXISTS customer_subscriptions_status_check;

ALTER TABLE customer_subscriptions
ADD CONSTRAINT customer_subscriptions_status_check 
CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'rejected'));

-- Add indexes on foreign key columns for better query performance (IF NOT EXISTS prevents errors)
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_product_id ON customer_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_dairy_id ON customer_subscriptions(dairy_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_dairy_id ON orders(dairy_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy_id ON orders(delivery_boy_id);