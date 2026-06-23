-- Brand Voices: cloned voice profiles via ElevenLabs Instant Voice Cloning
CREATE TABLE public.brand_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  created_by UUID,
  name TEXT NOT NULL DEFAULT 'My Voice',
  description TEXT,
  elevenlabs_voice_id TEXT NOT NULL,
  sample_storage_path TEXT,
  preview_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_voices_org ON public.brand_voices(org_id);

ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their brand voices"
  ON public.brand_voices
  FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Service role full access brand voices"
  ON public.brand_voices
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_brand_voices_updated_at
  BEFORE UPDATE ON public.brand_voices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();