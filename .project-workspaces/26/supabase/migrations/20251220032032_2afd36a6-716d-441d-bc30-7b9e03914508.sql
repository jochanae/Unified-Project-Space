-- Create livestream settings table
CREATE TABLE public.livestream_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  stream_url TEXT,
  stream_title TEXT DEFAULT 'Live Stream',
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

-- Add a row for global (CoinsBloom) settings with partner_id = NULL
-- Partners can have their own row with their partner_id

-- Enable RLS
ALTER TABLE public.livestream_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read livestream settings (needed for dashboard)
CREATE POLICY "Anyone can view livestream settings"
ON public.livestream_settings
FOR SELECT
USING (true);

-- Only admins can manage livestream settings
CREATE POLICY "Admins can manage livestream settings"
ON public.livestream_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_livestream_settings_updated_at
BEFORE UPDATE ON public.livestream_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();