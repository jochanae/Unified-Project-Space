
-- Add token_hash column
ALTER TABLE public.user_api_tokens ADD COLUMN IF NOT EXISTS token_hash text;

-- Migrate existing plaintext tokens to hashed values
UPDATE public.user_api_tokens
SET token_hash = encode(extensions.digest(token::bytea, 'sha256'), 'hex')
WHERE token IS NOT NULL AND token != '' AND token != 'HASHED' AND token_hash IS NULL;

-- Clear plaintext tokens
UPDATE public.user_api_tokens
SET token = 'HASHED'
WHERE token IS NOT NULL AND token != 'HASHED';

-- Add index on token_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_hash ON public.user_api_tokens (token_hash) WHERE is_active = true;

-- Drop old plaintext token index
DROP INDEX IF EXISTS idx_user_api_tokens_token;
