-- Drop the potentially problematic policy that targets public role
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Ensure the authenticated-only policy exists and is correct
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);