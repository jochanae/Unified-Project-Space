-- Add structured contact fields and design customization to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS office_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact_logo_url TEXT,
ADD COLUMN IF NOT EXISTS design_theme TEXT DEFAULT 'gradient' CHECK (design_theme IN ('gradient', 'glass_morphism', 'professional')),
ADD COLUMN IF NOT EXISTS branding_level TEXT DEFAULT 'full' CHECK (branding_level IN ('full', 'minimal'));

-- Add comments for documentation
COMMENT ON COLUMN public.partners.office_name IS 'Name of the specific office/branch';
COMMENT ON COLUMN public.partners.phone IS 'Contact phone number';
COMMENT ON COLUMN public.partners.address IS 'Physical address of the office';
COMMENT ON COLUMN public.partners.contact_logo_url IS 'Logo URL for the contact section';
COMMENT ON COLUMN public.partners.design_theme IS 'Visual theme: gradient, glass_morphism, or professional';
COMMENT ON COLUMN public.partners.branding_level IS 'How much partner branding in dashboard: full or minimal';