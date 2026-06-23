-- Create table for WebAuthn credentials
CREATE TABLE public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  device_type TEXT DEFAULT 'singleDevice',
  transports TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Users can view their own credentials
CREATE POLICY "Users can view their own webauthn credentials"
ON public.webauthn_credentials
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own credentials
CREATE POLICY "Users can insert their own webauthn credentials"
ON public.webauthn_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own webauthn credentials"
ON public.webauthn_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

-- Add biometric_enabled flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;