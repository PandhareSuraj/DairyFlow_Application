-- Update user 2259db4a-2409-4e4a-ba89-54967c3e462e to super admin
UPDATE profiles 
SET role = 'super_admin'::app_role, 
    dairy_id = NULL,
    updated_at = now()
WHERE id = '2259db4a-2409-4e4a-ba89-54967c3e462e';