
CREATE TABLE public.discovery_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  result_key TEXT NOT NULL,
  result_label TEXT NOT NULL,
  result_emoji TEXT NOT NULL DEFAULT '✨',
  result_description TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  member_id TEXT,
  UNIQUE (user_id, topic)
);

ALTER TABLE public.discovery_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discovery results"
  ON public.discovery_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discovery results"
  ON public.discovery_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovery results"
  ON public.discovery_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discovery results"
  ON public.discovery_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
