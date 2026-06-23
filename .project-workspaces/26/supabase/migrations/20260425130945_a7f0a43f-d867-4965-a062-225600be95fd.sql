-- 5-Tier Memory enum
DO $$ BEGIN
  CREATE TYPE public.quinn_memory_tier AS ENUM (
    'foundational',
    'identity',
    'episodic',
    'contextual',
    'transient'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quinn_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier public.quinn_memory_tier NOT NULL,
  topic text NOT NULL,
  content text NOT NULL,
  -- Scoring (0-100). Higher = more salient
  base_score integer NOT NULL DEFAULT 50,
  current_score numeric NOT NULL DEFAULT 50,
  -- How fast this memory decays (in days). NULL = never decays
  decay_days integer,
  -- Emotional weight bumps salience (-2 to +2)
  emotional_weight integer NOT NULL DEFAULT 0,
  -- Lifecycle
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_referenced_at timestamptz NOT NULL DEFAULT now(),
  -- Provenance
  source_conversation_id uuid,
  source_message_id uuid,
  project_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quinn_memories_score_range CHECK (base_score BETWEEN 0 AND 100),
  CONSTRAINT quinn_memories_emotional_range CHECK (emotional_weight BETWEEN -2 AND 2)
);

CREATE INDEX IF NOT EXISTS idx_quinn_memories_user_active
  ON public.quinn_memories (user_id, is_active, current_score DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quinn_memories_user_tier
  ON public.quinn_memories (user_id, tier, current_score DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quinn_memories_decay
  ON public.quinn_memories (last_referenced_at, decay_days)
  WHERE is_active = true AND is_pinned = false AND decay_days IS NOT NULL;

ALTER TABLE public.quinn_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own memories"
  ON public.quinn_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own memories"
  ON public.quinn_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own memories"
  ON public.quinn_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own memories"
  ON public.quinn_memories FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_quinn_memories_updated_at
  BEFORE UPDATE ON public.quinn_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Decay engine: runs daily. Lowers current_score for non-pinned memories
-- based on how long since they were last referenced relative to their decay_days.
CREATE OR REPLACE FUNCTION public.decay_quinn_memories()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decayed integer := 0;
  v_deactivated integer := 0;
BEGIN
  -- Apply decay: drop current_score proportional to days since last reference
  WITH decayed AS (
    UPDATE public.quinn_memories
    SET current_score = GREATEST(
      0,
      base_score - (
        EXTRACT(EPOCH FROM (now() - last_referenced_at)) / 86400.0
        / NULLIF(decay_days, 0)::numeric
        * 100
      )
    ) + (emotional_weight * 5),
    updated_at = now()
    WHERE is_active = true
      AND is_pinned = false
      AND decay_days IS NOT NULL
    RETURNING id
  )
  SELECT count(*) INTO v_decayed FROM decayed;

  -- Deactivate transient/contextual memories that have decayed below threshold
  WITH deactivated AS (
    UPDATE public.quinn_memories
    SET is_active = false, updated_at = now()
    WHERE is_active = true
      AND is_pinned = false
      AND tier IN ('transient', 'contextual')
      AND current_score < 10
    RETURNING id
  )
  SELECT count(*) INTO v_deactivated FROM deactivated;

  RETURN jsonb_build_object(
    'decayed', v_decayed,
    'deactivated', v_deactivated,
    'ran_at', now()
  );
END;
$$;