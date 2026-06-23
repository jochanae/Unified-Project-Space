CREATE POLICY "Public can view landing Bible preview setting"
ON public.app_settings
FOR SELECT
TO public
USING (setting_key = 'landing_bible_preview');