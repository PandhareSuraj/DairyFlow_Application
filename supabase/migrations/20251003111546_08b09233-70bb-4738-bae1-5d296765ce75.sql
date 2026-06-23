-- Fix Issue 1: Drop and recreate status constraint with all required values
ALTER TABLE customer_subscriptions
DROP CONSTRAINT IF EXISTS customer_subscriptions_status_check;

ALTER TABLE customer_subscriptions
ADD CONSTRAINT customer_subscriptions_status_check 
CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'rejected'));

-- Fix Issue 2: Add foreign key constraints for customer_subscriptions
ALTER TABLE customer_subscriptions
ADD CONSTRAINT fk_customer_subscriptions_customer
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE customer_subscriptions
ADD CONSTRAINT fk_customer_subscriptions_product
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE customer_subscriptions
ADD CONSTRAINT fk_customer_subscriptions_dairy
FOREIGN KEY (dairy_id) REFERENCES dairies(id) ON DELETE CASCADE;

-- Add foreign key constraints for orders
ALTER TABLE orders
ADD CONSTRAINT fk_orders_customer
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_product
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_dairy
FOREIGN KEY (dairy_id) REFERENCES dairies(id) ON DELETE CASCADE;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_delivery_boy
FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boys(id) ON DELETE SET NULL;

-- Add indexes on foreign key columns for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_product_id ON customer_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_dairy_id ON customer_subscriptions(dairy_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_dairy_id ON orders(dairy_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy_id ON orders(delivery_boy_id);