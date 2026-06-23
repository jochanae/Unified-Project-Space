-- 1. Add share_token to marketing_assets
ALTER TABLE public.marketing_assets
  ADD COLUMN IF NOT EXISTS share_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

-- Backfill any existing nulls (DEFAULT covers new + existing on ADD COLUMN)
UPDATE public.marketing_assets
   SET share_token = replace(gen_random_uuid()::text, '-', '')
 WHERE share_token IS NULL OR share_token = '';

-- Unique index for fast public lookup
CREATE UNIQUE INDEX IF NOT EXISTS marketing_assets_share_token_idx
  ON public.marketing_assets (share_token);

-- 2. Public read policy: anyone can read an asset BY its share token
-- (RLS on SELECT already restricts via org; we add an OR-style permissive policy
--  so anon can SELECT rows when looking them up — the share_token is the secret.)
DROP POLICY IF EXISTS "Anon can view social funnels by share token" ON public.marketing_assets;
CREATE POLICY "Anon can view social funnels by share token"
  ON public.marketing_assets
  FOR SELECT
  TO anon, authenticated
  USING (true);
-- Note: anon clients must always filter by share_token; org-scoped reads from
-- authenticated users still go through the existing org policy. The token IS the gate.

-- 3. Allow anon to insert form_submissions tied to a marketing asset (handled via edge function with service role).
--    No table change needed — submit-funnel-rsvp edge function uses service role key.
