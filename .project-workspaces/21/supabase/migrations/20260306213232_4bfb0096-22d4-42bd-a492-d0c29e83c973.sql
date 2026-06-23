
-- Make phone_number nullable so we can clear plaintext values
ALTER TABLE public.sms_profiles ALTER COLUMN phone_number DROP NOT NULL;

-- Null out all existing plaintext phone numbers (encrypted versions already exist via trigger)
UPDATE public.sms_profiles SET phone_number = NULL WHERE phone_number IS NOT NULL;
