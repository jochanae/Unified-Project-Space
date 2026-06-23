-- Family Expectations table - parent creates expectations for their kids
CREATE TABLE public.family_expectations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID NOT NULL,
  kid_profile_id UUID NOT NULL REFERENCES public.kids_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kid acknowledgments - tracks when kid acknowledged expectations
CREATE TABLE public.expectation_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_profile_id UUID NOT NULL REFERENCES public.kids_profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expectations_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expectation_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS for family_expectations
CREATE POLICY "Parents can manage their kids expectations"
ON public.family_expectations
FOR ALL
TO authenticated
USING (parent_user_id = auth.uid() OR is_parent_of_kid(kid_profile_id, auth.uid()))
WITH CHECK (parent_user_id = auth.uid() OR is_parent_of_kid(kid_profile_id, auth.uid()));

CREATE POLICY "Kids can view their expectations"
ON public.family_expectations
FOR SELECT
TO authenticated
USING (kid_profile_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid()));

-- RLS for expectation_acknowledgments
CREATE POLICY "Parents can view their kids acknowledgments"
ON public.expectation_acknowledgments
FOR SELECT
TO authenticated
USING (is_parent_of_kid(kid_profile_id, auth.uid()));

CREATE POLICY "Kids can create their own acknowledgments"
ON public.expectation_acknowledgments
FOR INSERT
TO authenticated
WITH CHECK (kid_profile_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Kids can view their own acknowledgments"
ON public.expectation_acknowledgments
FOR SELECT
TO authenticated
USING (kid_profile_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_family_expectations_updated_at
  BEFORE UPDATE ON public.family_expectations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_family_expectations_kid ON public.family_expectations(kid_profile_id);
CREATE INDEX idx_family_expectations_parent ON public.family_expectations(parent_user_id);
CREATE INDEX idx_expectation_acknowledgments_kid ON public.expectation_acknowledgments(kid_profile_id);