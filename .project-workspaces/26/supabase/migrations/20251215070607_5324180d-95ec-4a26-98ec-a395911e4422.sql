-- Generate invite codes for family groups that don't have one
UPDATE public.family_groups
SET invite_code = encode(gen_random_bytes(8), 'hex')
WHERE invite_code IS NULL;

-- Ensure future family groups always get an invite code
ALTER TABLE public.family_groups
ALTER COLUMN invite_code SET DEFAULT encode(gen_random_bytes(8), 'hex');

-- Make invite_code NOT NULL going forward (now that all have values)
ALTER TABLE public.family_groups
ALTER COLUMN invite_code SET NOT NULL;