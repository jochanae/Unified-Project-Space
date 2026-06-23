
-- Create companion_collectibles table for letters and smart cards
CREATE TABLE public.companion_collectibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id text NOT NULL,
  type text NOT NULL, -- 'letter' | 'recipe' | 'reflection' | 'decision' | 'knowledge' | 'habit' | 'language' | 'practice' | 'memory'
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  companion_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companion_collectibles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own collectibles"
  ON public.companion_collectibles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collectibles"
  ON public.companion_collectibles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collectibles"
  ON public.companion_collectibles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_collectibles_user_member ON public.companion_collectibles (user_id, member_id, type);
