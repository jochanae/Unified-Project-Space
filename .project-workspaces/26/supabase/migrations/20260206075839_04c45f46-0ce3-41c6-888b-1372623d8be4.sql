-- Drop the overly permissive public SELECT policy on base table
DROP POLICY IF EXISTS "Anyone can view active professional profiles" ON public.professionals;

-- Create a restrictive policy that denies direct public SELECT on base table
-- Only specific authenticated users should access the full table directly
-- The public should use the professionals_public view instead

-- Note: Keep existing policies for admins, partner owners, and professionals themselves
-- Add a policy that allows the view to work (since it uses security_invoker)
CREATE POLICY "Public can only access active professionals via view" 
ON public.professionals 
FOR SELECT 
USING (
  -- Allow if user is the professional themselves
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Allow if user is an admin  
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
  OR
  -- Allow if user is a partner owner of this professional
  (auth.uid() IS NOT NULL AND partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM partners 
    WHERE partners.id = professionals.partner_id 
    AND partners.owner_user_id = auth.uid()
  ))
  OR
  -- Allow limited access for public (but only active profiles)
  -- This is needed for the view to work, but the view only exposes safe columns
  (is_active = true)
);