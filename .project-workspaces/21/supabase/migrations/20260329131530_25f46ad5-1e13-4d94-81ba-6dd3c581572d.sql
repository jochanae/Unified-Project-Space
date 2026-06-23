
-- Travel photos linked to travel_log entries
CREATE TABLE public.travel_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  travel_entry_id UUID NOT NULL REFERENCES public.travel_log(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.travel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own travel photos"
  ON public.travel_photos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own travel photos"
  ON public.travel_photos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own travel photos"
  ON public.travel_photos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for quick lookup by entry
CREATE INDEX idx_travel_photos_entry ON public.travel_photos(travel_entry_id);
