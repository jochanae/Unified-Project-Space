
-- Create a simple admin settings key-value table
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'false'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can read settings"
ON public.admin_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.admin_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.admin_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can read specific public settings (for the beta badge / disabled check)
CREATE POLICY "Anyone can read public settings"
ON public.admin_settings FOR SELECT
USING (key IN ('circles_beta_label', 'circles_disabled'));

-- Seed default values
INSERT INTO public.admin_settings (key, value) VALUES
  ('circles_beta_label', 'true'::jsonb),
  ('circles_disabled', 'false'::jsonb);
