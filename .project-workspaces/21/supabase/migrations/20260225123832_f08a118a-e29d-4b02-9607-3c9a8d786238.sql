
-- pgcrypto functions live in extensions schema — need to schema-qualify
CREATE OR REPLACE FUNCTION public.pii_encrypt(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN plaintext;
  END IF;
  enc_key := current_setting('app.settings.pii_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN
    enc_key := 'compani-pii-encryption-key-v1';
  END IF;
  RETURN encode(extensions.pgp_sym_encrypt(plaintext, enc_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.pii_decrypt(ciphertext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc_key text;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  enc_key := current_setting('app.settings.pii_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN
    enc_key := 'compani-pii-encryption-key-v1';
  END IF;
  RETURN extensions.pgp_sym_decrypt(decode(ciphertext, 'base64'), enc_key);
EXCEPTION WHEN OTHERS THEN
  RETURN ciphertext;
END;
$$;

-- Add encrypted columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number_encrypted text;
ALTER TABLE public.sms_profiles ADD COLUMN IF NOT EXISTS phone_number_encrypted text;

-- Encrypt existing data
UPDATE public.profiles 
SET phone_number_encrypted = public.pii_encrypt(phone_number)
WHERE phone_number IS NOT NULL AND phone_number != '' AND phone_number_encrypted IS NULL;

UPDATE public.sms_profiles
SET phone_number_encrypted = public.pii_encrypt(phone_number)
WHERE phone_number IS NOT NULL AND phone_number != '' AND phone_number_encrypted IS NULL;

-- Auto-encrypt trigger for profiles
CREATE OR REPLACE FUNCTION public.encrypt_profile_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number_encrypted := public.pii_encrypt(NEW.phone_number);
  ELSE
    NEW.phone_number_encrypted := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_profiles_pii_trigger ON public.profiles;
CREATE TRIGGER encrypt_profiles_pii_trigger
  BEFORE INSERT OR UPDATE OF phone_number ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_profile_pii();

-- Auto-encrypt trigger for sms_profiles
CREATE OR REPLACE FUNCTION public.encrypt_sms_profile_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number_encrypted := public.pii_encrypt(NEW.phone_number);
  ELSE
    NEW.phone_number_encrypted := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_sms_profiles_pii_trigger ON public.sms_profiles;
CREATE TRIGGER encrypt_sms_profiles_pii_trigger
  BEFORE INSERT OR UPDATE OF phone_number ON public.sms_profiles
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_sms_profile_pii();

-- Decrypted views for server-side access
CREATE OR REPLACE VIEW public.profiles_decrypted AS
SELECT 
  id, user_id, user_name, username, bio, companion_name, companion_gender,
  companion_avatar_url, companion_appearance_desc, companion_reference_image_url,
  connection_mode, image_style, date_of_birth, mature_mode, vibe,
  personality_traits, sms_opt_in, parental_consent_granted, parental_consent_email,
  user_appearance_desc, user_reference_image_url,
  public.pii_decrypt(phone_number_encrypted) as phone_number_decrypted,
  created_at, updated_at
FROM public.profiles;

CREATE OR REPLACE VIEW public.sms_profiles_decrypted AS
SELECT
  id, user_id, user_name, companion_name, vibe, sms_enabled,
  memories, last_app_active, last_sms_sent,
  public.pii_decrypt(phone_number_encrypted) as phone_number_decrypted,
  created_at
FROM public.sms_profiles;
