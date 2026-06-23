
DROP VIEW IF EXISTS public.profiles_decrypted;

CREATE VIEW public.profiles_decrypted
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.user_id,
  p.user_name,
  p.username,
  p.bio,
  p.companion_name,
  p.companion_gender,
  p.companion_avatar_url,
  p.companion_appearance_desc,
  p.companion_reference_image_url,
  p.connection_mode,
  p.image_style,
  p.date_of_birth,
  p.mature_mode,
  p.personality_traits,
  p.sms_opt_in,
  p.parental_consent_granted,
  p.parental_consent_email,
  p.user_appearance_desc,
  p.user_reference_image_url,
  p.vibe,
  p.created_at,
  p.updated_at,
  public.pii_decrypt(p.phone_number_encrypted) AS phone_number_decrypted
FROM public.profiles p;
