-- Drop existing policies that target public role
DROP POLICY IF EXISTS "Admins can delete admin emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admins can insert admin emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admins can view admin emails" ON public.admin_emails;

-- Recreate policies targeting only authenticated users with admin role
CREATE POLICY "Admins can view admin emails" 
ON public.admin_emails 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin emails" 
ON public.admin_emails 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin emails" 
ON public.admin_emails 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));