-- Create demo users for testing
-- Note: These are demo accounts for development/testing purposes only

-- Insert demo users into auth.users (this requires special handling)
-- We'll create a function to safely insert demo users

-- First, create the demo profiles that will be linked to auth users
-- We'll create these manually through the application signup process
-- But we need to ensure the trigger and profile creation works correctly

-- Add a trigger to automatically create user profiles when auth users are created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to create demo accounts
CREATE OR REPLACE FUNCTION create_demo_accounts()
RETURNS void AS $$
BEGIN
  -- Note: In production, demo accounts should be created through the normal signup flow
  -- This is just for development/testing purposes
  
  -- Insert demo profiles directly (these will be created by the signup process)
  -- We'll rely on the application signup flow to create these accounts properly
  
  RAISE NOTICE 'Demo accounts should be created through the application signup process';
END;
$$ LANGUAGE plpgsql;

-- Call the function
SELECT create_demo_accounts();

-- Drop the function as it's no longer needed
DROP FUNCTION create_demo_accounts();