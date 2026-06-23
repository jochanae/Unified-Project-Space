
-- Recreate the view with security_invoker so it inherits ice_contacts RLS
CREATE OR REPLACE VIEW public.ice_contacts_decrypted
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  name,
  pii_decrypt(phone_number_encrypted) AS phone_number_decrypted,
  relationship,
  notify_on_crisis,
  created_at
FROM ice_contacts;
