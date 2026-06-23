-- Drop the existing admin view policy
DROP POLICY IF EXISTS "Admins can view all applications" ON professional_applications;

-- Create a new policy using is_admin function which is more permissive
CREATE POLICY "Admins can view all applications" 
ON professional_applications 
FOR SELECT 
USING (is_admin(auth.uid()));