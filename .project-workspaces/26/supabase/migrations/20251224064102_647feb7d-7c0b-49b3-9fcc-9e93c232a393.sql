-- Drop existing policies on admin_emails
DROP POLICY IF EXISTS "Admins can delete admin emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admins can insert admin emails" ON public.admin_emails;
DROP POLICY IF EXISTS "Admins can view admin emails" ON public.admin_emails;

-- Create stricter policies requiring super_admin role
CREATE POLICY "Super admins can view admin emails" 
ON public.admin_emails 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert admin emails" 
ON public.admin_emails 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete admin emails" 
ON public.admin_emails 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'));