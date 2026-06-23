
-- Table to track which companions are linked to which circles, with behavior mode
CREATE TABLE public.circle_companions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.custom_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  companion_name TEXT NOT NULL,
  avatar_url TEXT,
  mode TEXT NOT NULL DEFAULT 'quiet',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(circle_id, user_id, member_id)
);

-- Enable RLS
ALTER TABLE public.circle_companions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own companion links
CREATE POLICY "Users can insert their own companion links"
ON public.circle_companions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companion links"
ON public.circle_companions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companion links"
ON public.circle_companions FOR DELETE
USING (auth.uid() = user_id);

-- Circle members can see all companions in their circles
CREATE POLICY "Circle members can view companion links"
ON public.circle_companions FOR SELECT
USING (is_circle_member(circle_id, auth.uid()));
