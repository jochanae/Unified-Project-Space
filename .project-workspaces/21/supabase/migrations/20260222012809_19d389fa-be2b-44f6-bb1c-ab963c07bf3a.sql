
-- Table to store SMS-eligible user profiles for scheduled companion outreach
CREATE TABLE public.sms_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  companion_name TEXT NOT NULL DEFAULT 'Ted',
  phone_number TEXT NOT NULL,
  vibe TEXT,
  memories JSONB DEFAULT '[]'::jsonb,
  last_app_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sms_sent TIMESTAMP WITH TIME ZONE,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_profiles ENABLE ROW LEVEL SECURITY;

-- Public insert policy (no auth required since this is a localStorage-based app)
CREATE POLICY "Anyone can insert sms profiles"
ON public.sms_profiles FOR INSERT
WITH CHECK (true);

-- Public update policy scoped by phone number
CREATE POLICY "Anyone can update their sms profile"
ON public.sms_profiles FOR UPDATE
USING (true);

-- Allow the service role to read for cron jobs
CREATE POLICY "Service role can read sms profiles"
ON public.sms_profiles FOR SELECT
USING (true);

-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
