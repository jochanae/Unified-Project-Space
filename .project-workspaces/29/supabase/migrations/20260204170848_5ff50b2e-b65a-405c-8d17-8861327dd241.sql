-- Add username column to profiles for community identity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update existing users with fun trading usernames
UPDATE public.profiles 
SET username = CASE 
  WHEN full_name ILIKE '%maurice%' THEN 'BullishMaurice'
  WHEN full_name ILIKE '%javon%' THEN 'DiamondJavon'
  WHEN full_name ILIKE '%jochanae%' THEN 'TraderJoch'
  WHEN email ILIKE '%demo%' THEN 'DemoTrader'
  ELSE 'Trader' || SUBSTRING(id::text, 1, 6)
END
WHERE username IS NULL;