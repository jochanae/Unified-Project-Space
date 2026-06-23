
-- Add unique constraint on phone_number for upsert support
ALTER TABLE public.sms_profiles ADD CONSTRAINT sms_profiles_phone_number_key UNIQUE (phone_number);
