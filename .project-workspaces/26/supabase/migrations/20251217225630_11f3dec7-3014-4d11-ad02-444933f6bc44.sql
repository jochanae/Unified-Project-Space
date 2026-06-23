-- Create partners table for B2B white-label tenants
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  secondary_color TEXT DEFAULT '#EC4899',
  custom_domain TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  seats_purchased INTEGER DEFAULT 0,
  seats_used INTEGER DEFAULT 0,
  owner_user_id UUID NOT NULL,
  contact_email TEXT,
  hero_title TEXT DEFAULT 'Welcome to Financial Wellness',
  hero_description TEXT DEFAULT 'Empowering your team with smart financial tools',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner_members table (links users to partners)
CREATE TABLE public.partner_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(partner_id, user_id)
);

-- Add partner_id to professionals table
ALTER TABLE public.professionals 
ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- Add QR code URL column to professionals
ALTER TABLE public.professionals 
ADD COLUMN qr_code_url TEXT;

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partner owner can manage their partner
CREATE POLICY "Partner owners can manage their partner"
ON public.partners
FOR ALL
USING (auth.uid() = owner_user_id);

-- Admins can view all partners
CREATE POLICY "Admins can view all partners"
ON public.partners
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can manage all partners
CREATE POLICY "Admins can manage all partners"
ON public.partners
FOR ALL
USING (is_admin(auth.uid()));

-- Enable RLS on partner_members
ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

-- Partner owners can manage members
CREATE POLICY "Partner owners can manage members"
ON public.partner_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_members.partner_id 
    AND partners.owner_user_id = auth.uid()
  )
);

-- Members can view their own membership
CREATE POLICY "Members can view own membership"
ON public.partner_members
FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage all partner members
CREATE POLICY "Admins can manage all partner members"
ON public.partner_members
FOR ALL
USING (is_admin(auth.uid()));

-- Update professionals RLS to allow partner owners to manage their professionals
CREATE POLICY "Partner owners can manage their professionals"
ON public.professionals
FOR ALL
USING (
  partner_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = professionals.partner_id 
    AND partners.owner_user_id = auth.uid()
  )
);

-- Anyone can view active professionals (update existing or add)
CREATE POLICY "Anyone can view partner professionals"
ON public.professionals
FOR SELECT
USING (is_active = true AND partner_id IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_professionals_partner_id ON public.professionals(partner_id);
CREATE INDEX idx_partners_slug ON public.partners(slug);
CREATE INDEX idx_partners_owner ON public.partners(owner_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();