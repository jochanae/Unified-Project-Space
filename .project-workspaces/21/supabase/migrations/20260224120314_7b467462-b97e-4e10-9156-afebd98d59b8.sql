-- Add date_of_birth column to profiles
ALTER TABLE public.profiles
ADD COLUMN date_of_birth date NULL;

-- Add parental_consent columns
ALTER TABLE public.profiles
ADD COLUMN parental_consent_email text NULL,
ADD COLUMN parental_consent_granted boolean NOT NULL DEFAULT false;