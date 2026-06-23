-- Update the handle_new_user function to include partner_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Get partner_id from metadata if provided
  v_partner_id := (NEW.raw_user_meta_data ->> 'partner_id')::uuid;
  
  -- Insert profile with partner association
  INSERT INTO public.profiles (id, email, first_name, last_name, profile_image_url, partner_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    v_partner_id
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Auto-assign admin role for specific emails
  IF NEW.email IN ('admin@coinsbloom.com', 'jochanae@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    -- If partner_id is invalid, insert without it
    INSERT INTO public.profiles (id, email, first_name, last_name, profile_image_url)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'avatar_url'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    IF NEW.email IN ('admin@coinsbloom.com', 'jochanae@gmail.com') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$;