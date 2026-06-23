DROP POLICY "Anyone can read public settings" ON public.admin_settings;
CREATE POLICY "Anyone can read public settings"
  ON public.admin_settings
  FOR SELECT
  TO public
  USING (key = ANY (ARRAY['circles_beta_label'::text, 'circles_disabled'::text, 'support_contact_url'::text]));