
-- Revert to security invoker
ALTER VIEW public.professionals_public SET (security_invoker = on);

-- Add anon SELECT so the public view works for unauthenticated users
-- The view itself excludes claim_token, stripe_connect_account_id, contact_email
CREATE POLICY "Anon can view active professionals for public pages" ON public.professionals
FOR SELECT
TO anon
USING (is_active = true);
