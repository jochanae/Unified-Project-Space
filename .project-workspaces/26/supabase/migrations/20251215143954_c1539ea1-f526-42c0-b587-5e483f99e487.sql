-- Track which domain (RP ID) a passkey was registered for
ALTER TABLE public.webauthn_credentials
ADD COLUMN IF NOT EXISTS rp_id TEXT;

-- Helpful index for lookups during auth
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_rp
ON public.webauthn_credentials (user_id, rp_id);
