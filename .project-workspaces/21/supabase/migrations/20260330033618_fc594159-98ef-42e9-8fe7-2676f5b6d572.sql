CREATE OR REPLACE VIEW public.sms_profiles_decrypted
WITH (security_invoker = true)
AS
SELECT id,
  user_id,
  user_name,
  companion_name,
  vibe,
  sms_enabled,
  memories,
  last_app_active,
  last_sms_sent,
  pii_decrypt(phone_number_encrypted) AS phone_number_decrypted,
  created_at
FROM sms_profiles;