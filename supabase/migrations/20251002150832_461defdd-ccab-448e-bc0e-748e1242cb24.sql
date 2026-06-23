-- Drop all existing policies on system_settings
DROP POLICY IF EXISTS "Super admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Super admins can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Super admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Super admins can delete system settings" ON public.system_settings;

-- Allow all authenticated users to read system settings (for Google Maps API key)
CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- Only super admins can insert system settings
CREATE POLICY "Super admins can insert system settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can update system settings
CREATE POLICY "Super admins can update system settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can delete system settings
CREATE POLICY "Super admins can delete system settings"
ON public.system_settings
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));