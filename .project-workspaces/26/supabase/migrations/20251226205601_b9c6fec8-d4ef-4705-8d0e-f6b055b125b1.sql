-- Fix handle_new_user to properly extract names from Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_partner_id uuid;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_name_parts text[];
BEGIN
  -- Get partner_id from metadata if provided
  v_partner_id := (NEW.raw_user_meta_data ->> 'partner_id')::uuid;
  
  -- Try to get first_name directly (email/password signup)
  v_first_name := NEW.raw_user_meta_data ->> 'first_name';
  v_last_name := NEW.raw_user_meta_data ->> 'last_name';
  
  -- If no first_name, try to parse from full_name/name (Google OAuth)
  IF v_first_name IS NULL THEN
    v_full_name := COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    );
    
    IF v_full_name IS NOT NULL AND v_full_name != '' THEN
      -- Split full name into parts
      v_name_parts := string_to_array(trim(v_full_name), ' ');
      
      IF array_length(v_name_parts, 1) >= 1 THEN
        v_first_name := v_name_parts[1];
      END IF;
      
      IF array_length(v_name_parts, 1) >= 2 THEN
        -- Join remaining parts as last name (handles middle names)
        v_last_name := array_to_string(v_name_parts[2:], ' ');
      END IF;
    END IF;
  END IF;
  
  -- Insert profile with partner association
  INSERT INTO public.profiles (id, email, first_name, last_name, profile_image_url, partner_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    v_last_name,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'),
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
      v_first_name,
      v_last_name,
      COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
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
$$;