-- Replace recovery_email with security question for kids
ALTER TABLE public.kids_profiles 
DROP COLUMN IF EXISTS recovery_email;

ALTER TABLE public.kids_profiles 
ADD COLUMN security_question text,
ADD COLUMN security_answer text;