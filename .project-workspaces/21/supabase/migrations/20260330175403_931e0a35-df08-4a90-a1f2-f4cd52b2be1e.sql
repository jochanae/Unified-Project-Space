
-- Essence Influences table: stores "who shaped you" entries per companion
CREATE TABLE public.essence_influences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  relationship TEXT,
  influence_type TEXT NOT NULL DEFAULT 'phrase',
  content TEXT NOT NULL,
  trigger_context TEXT[] NOT NULL DEFAULT '{}',
  weight NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.essence_influences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own essence influences"
  ON public.essence_influences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essence influences"
  ON public.essence_influences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essence influences"
  ON public.essence_influences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essence influences"
  ON public.essence_influences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin Dev Notes table: simple scratchpad for the founder
CREATE TABLE public.admin_dev_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_dev_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dev notes"
  ON public.admin_dev_notes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
