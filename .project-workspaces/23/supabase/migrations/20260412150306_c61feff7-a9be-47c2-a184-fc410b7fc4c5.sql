
-- Allow users to insert their own record
CREATE POLICY "Users can insert own record"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow authenticated users to insert organizations (for signup)
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-create org + user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a default organization for the new user
  INSERT INTO public.organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    REPLACE(LOWER(split_part(NEW.email, '@', 1)), '.', '-') || '-' || substr(gen_random_uuid()::text, 1, 8)
  )
  RETURNING id INTO new_org_id;

  -- Create the user profile
  INSERT INTO public.users (id, email, org_id, role)
  VALUES (NEW.id, NEW.email, new_org_id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
