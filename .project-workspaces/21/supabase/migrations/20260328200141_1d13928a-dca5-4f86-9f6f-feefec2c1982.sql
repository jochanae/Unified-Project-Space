
CREATE TABLE public.travel_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT,
  city_name TEXT NOT NULL,
  region TEXT,
  country TEXT DEFAULT 'US',
  airport_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  companion_name TEXT,
  mode_used TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own travel log"
  ON public.travel_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own travel log"
  ON public.travel_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own travel log"
  ON public.travel_log FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all travel logs"
  ON public.travel_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
