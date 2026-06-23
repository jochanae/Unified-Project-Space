
-- Feature flags table for admin-controlled feature toggles
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags (needed for UI filtering)
CREATE POLICY "Feature flags are readable by everyone"
ON public.feature_flags FOR SELECT USING (true);

-- Only admins can modify feature flags
CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial feature flags
INSERT INTO public.feature_flags (feature_key, feature_name, description, is_enabled, category) VALUES
  ('kids', 'My Kids', 'Kids management page', false, 'family'),
  ('kids_chat', 'Family Chat', 'Family chat messaging', false, 'family'),
  ('vision_board', 'Vision Board', 'Visual goal/dream board', true, 'planning'),
  ('credit', 'Credit & Resources', 'Credit score tracking and resources', true, 'money'),
  ('professionals', 'Experts & Resources', 'Professional directory and expert access', true, 'learning'),
  ('refer_business', 'Refer a Business', 'B2B business referral program', true, 'business'),
  ('coach', 'Bloom Coach', 'AI financial coaching assistant', true, 'core');

-- User footer preferences table
CREATE TABLE public.user_footer_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  left_shortcuts JSONB NOT NULL DEFAULT '["budgets", "transactions"]'::jsonb,
  right_shortcuts JSONB NOT NULL DEFAULT '["money-academy", "settings"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_footer_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own preferences
CREATE POLICY "Users can manage their own footer preferences"
ON public.user_footer_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_footer_preferences_updated_at
BEFORE UPDATE ON public.user_footer_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
