
CREATE TABLE public.daily_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  intent_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, intent_date)
);

ALTER TABLE public.daily_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own intents"
  ON public.daily_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intents"
  ON public.daily_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intents"
  ON public.daily_intents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
