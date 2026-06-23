
-- Store user footer shortcut preferences
CREATE TABLE public.user_footer_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  left_shortcuts TEXT[] NOT NULL DEFAULT ARRAY['home', 'feed', 'wellness'],
  right_shortcuts TEXT[] NOT NULL DEFAULT ARRAY['favorites', 'cami', 'settings'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_footer UNIQUE (user_id)
);

ALTER TABLE public.user_footer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own footer preferences"
ON public.user_footer_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own footer preferences"
ON public.user_footer_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own footer preferences"
ON public.user_footer_preferences FOR UPDATE USING (auth.uid() = user_id);
