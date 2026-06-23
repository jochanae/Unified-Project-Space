
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  overall_rating integer NOT NULL DEFAULT 3,
  signup_experience text,
  cami_matched boolean,
  conversation_quality integer,
  bugs_encountered text,
  liked_most text,
  frustrated_by text,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.beta_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON public.beta_feedback
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
