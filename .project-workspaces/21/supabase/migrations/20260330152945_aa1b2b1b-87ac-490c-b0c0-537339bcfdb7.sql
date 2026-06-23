
-- Create a public-safe view excluding Stripe internals
CREATE VIEW public.virtual_gifts_public
WITH (security_invoker = on) AS
SELECT id, name, description, category, image_url, price_cents, prompt_modifier, is_active, created_at, mature_only
FROM public.virtual_gifts;

-- Drop the overly permissive anon policy
DROP POLICY "Anyone can view active gifts" ON public.virtual_gifts;

-- Replace with authenticated-only policy (edge functions use service role)
CREATE POLICY "Authenticated users can view active gifts"
ON public.virtual_gifts
FOR SELECT
TO authenticated
USING (is_active = true);
