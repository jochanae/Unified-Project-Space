-- Create a secure SECURITY DEFINER function for audit logging
-- This prevents direct client-side inserts while still allowing proper audit logging

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_audit_id uuid;
BEGIN
  -- Get the current user ID (will be NULL for anonymous/system actions)
  v_user_id := auth.uid();
  
  -- Insert the audit log entry
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address
  ) VALUES (
    v_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    NULL -- IP address should be captured at edge function level if needed
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- Now update RLS policies on audit_logs to be more restrictive
-- First drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a restrictive INSERT policy - only service role can insert directly
-- Regular users must use the log_audit_event function
CREATE POLICY "Only service role can insert audit logs directly" 
ON public.audit_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Ensure the SELECT policy for admins still exists
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Ensure no UPDATE or DELETE is allowed
DROP POLICY IF EXISTS "No updates to audit logs" ON public.audit_logs;
CREATE POLICY "No updates to audit logs" 
ON public.audit_logs 
FOR UPDATE 
USING (false);

DROP POLICY IF EXISTS "No deletes from audit logs" ON public.audit_logs;
CREATE POLICY "No deletes from audit logs" 
ON public.audit_logs 
FOR DELETE 
USING (false);