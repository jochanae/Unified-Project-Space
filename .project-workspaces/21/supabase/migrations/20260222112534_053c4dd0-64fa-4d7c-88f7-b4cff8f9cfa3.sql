
-- Create custom circles table
CREATE TABLE public.custom_circles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL,
  description text NOT NULL,
  slug text NOT NULL UNIQUE,
  creator_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_circles ENABLE ROW LEVEL SECURITY;

-- Anyone can view custom circles
CREATE POLICY "Anyone can view custom circles"
ON public.custom_circles
FOR SELECT
USING (true);

-- Users can create their own circles (max 3 enforced in app)
CREATE POLICY "Users can create their own circles"
ON public.custom_circles
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Users can delete their own circles
CREATE POLICY "Users can delete their own circles"
ON public.custom_circles
FOR DELETE
USING (auth.uid() = creator_id);

-- Users can update their own circles
CREATE POLICY "Users can update their own circles"
ON public.custom_circles
FOR UPDATE
USING (auth.uid() = creator_id);

-- Enable realtime for custom_circles
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_circles;
