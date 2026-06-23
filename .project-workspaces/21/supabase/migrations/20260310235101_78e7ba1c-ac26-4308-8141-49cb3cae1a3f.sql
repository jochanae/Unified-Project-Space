
-- Add new columns to beta_feedback
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS timeline_sharing text;
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS testimonial_quote text;
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS testimonial_approved boolean NOT NULL DEFAULT false;

-- Create landing_testimonials table
CREATE TABLE public.landing_testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote text NOT NULL,
  name text NOT NULL,
  role text,
  stars integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read active testimonials (landing page, no auth needed)
CREATE POLICY "Anyone can view active testimonials"
  ON public.landing_testimonials
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage testimonials"
  ON public.landing_testimonials
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
