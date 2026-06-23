-- Add partner_id to profiles table to associate users with partners
ALTER TABLE public.profiles 
ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Create index for efficient partner-based queries
CREATE INDEX idx_profiles_partner_id ON public.profiles(partner_id);

-- Add RLS policy so partners can view profiles of their associated users
CREATE POLICY "Partners can view their associated user profiles"
ON public.profiles
FOR SELECT
USING (
  partner_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = profiles.partner_id 
    AND partners.owner_user_id = auth.uid()
  )
);