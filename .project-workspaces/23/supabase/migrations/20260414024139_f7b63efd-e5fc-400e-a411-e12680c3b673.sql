-- Add custom domain columns
ALTER TABLE public.organizations
  ADD COLUMN custom_domain text DEFAULT NULL,
  ADD COLUMN domain_verified boolean DEFAULT false;

-- Allow org owners to update their own org (for domain settings)
CREATE POLICY "Users can update their own org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (id = get_user_org_id())
  WITH CHECK (id = get_user_org_id());