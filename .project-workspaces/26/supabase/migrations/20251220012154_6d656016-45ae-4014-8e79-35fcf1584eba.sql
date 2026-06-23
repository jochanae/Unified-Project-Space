-- Add user_id column to professionals table for account linking
ALTER TABLE public.professionals 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_professionals_user_id ON public.professionals(user_id);

-- Add unique constraint to prevent multiple professionals linking to same user
ALTER TABLE public.professionals 
ADD CONSTRAINT professionals_user_id_unique UNIQUE (user_id);

-- Update RLS policies to allow professionals to view/update their own linked profile
CREATE POLICY "Professionals can view their linked profile"
ON public.professionals
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Professionals can update their linked profile"
ON public.professionals
FOR UPDATE
USING (user_id = auth.uid());

-- Add claim_token for secure profile claiming
ALTER TABLE public.professionals 
ADD COLUMN claim_token text,
ADD COLUMN claimed_at timestamp with time zone;