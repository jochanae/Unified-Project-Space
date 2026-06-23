-- Add security_answer_hash column for bcrypt hashed security answers
ALTER TABLE public.kids_profiles 
ADD COLUMN IF NOT EXISTS security_answer_hash text;

-- Add a comment explaining the migration
COMMENT ON COLUMN public.kids_profiles.security_answer_hash IS 'Bcrypt hashed security answer for password reset verification. Replaces plaintext security_answer column.';