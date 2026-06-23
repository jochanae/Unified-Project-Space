-- Add is_featured flag to learning_content for multi-featured videos
ALTER TABLE public.learning_content ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Add featured_order for carousel ordering
ALTER TABLE public.learning_content ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;

-- Create index for efficient featured video queries
CREATE INDEX IF NOT EXISTS idx_learning_content_featured ON public.learning_content(is_featured, featured_order) WHERE is_featured = true;

-- Create dashboard_highlights table for dashboard feature messaging
CREATE TABLE public.dashboard_highlights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  icon text DEFAULT 'info',
  color_variant text DEFAULT 'default',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_highlights ENABLE ROW LEVEL SECURITY;

-- Anyone can view active highlights (for their partner or global)
CREATE POLICY "Anyone can view active dashboard highlights" 
ON public.dashboard_highlights 
FOR SELECT 
USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));

-- Admins can manage all highlights
CREATE POLICY "Admins can manage dashboard highlights" 
ON public.dashboard_highlights 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Partner owners can manage their own highlights
CREATE POLICY "Partner owners can manage their highlights" 
ON public.dashboard_highlights 
FOR ALL 
USING (partner_id IN (SELECT id FROM public.partners WHERE owner_user_id = auth.uid()))
WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE owner_user_id = auth.uid()));