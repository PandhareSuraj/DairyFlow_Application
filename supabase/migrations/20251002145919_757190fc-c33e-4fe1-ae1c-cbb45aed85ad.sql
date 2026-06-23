-- Update the handle_new_user trigger to extract more fields from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, name, role, email, phone, dairy_id, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'customer'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    (NEW.raw_user_meta_data ->> 'dairy_id')::uuid,
    NEW.raw_user_meta_data ->> 'address'
  );
  RETURN NEW;
END;
$function$;