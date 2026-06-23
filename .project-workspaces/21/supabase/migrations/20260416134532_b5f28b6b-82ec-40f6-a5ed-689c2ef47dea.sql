
-- ============================================================================
-- ENHANCED MEMORY SYSTEM — CORRECTED SCHEMA MIGRATION
-- ============================================================================

-- Enable pgvector extension for future embedding support
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- STEP 0: Handle existing NULL member_id values
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  UPDATE public.memories 
  SET member_id = (
    SELECT c.member_id 
    FROM public.connections c
    WHERE c.user_id = memories.user_id 
    ORDER BY c.connected_at ASC
    LIMIT 1
  )
  WHERE member_id IS NULL;
END $$;

-- Delete orphan memories that still have no member_id (no connections exist)
DELETE FROM public.memories WHERE member_id IS NULL;

-- Now make member_id NOT NULL
ALTER TABLE public.memories 
ALTER COLUMN member_id SET NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 1: Add new columns to memories table
-- ----------------------------------------------------------------------------
ALTER TABLE public.memories 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'contextual',
ADD COLUMN IF NOT EXISTS emotional_weight INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vulnerability_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retrieval_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS related_memory_ids UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS themes TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consolidated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_narrative_id UUID;

-- Add embedding column (requires pgvector)
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

-- Add base_score as GENERATED column (immutable parts only — no NOW())
-- We need to check if it already exists first since GENERATED columns can't use IF NOT EXISTS cleanly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'memories' AND column_name = 'base_score'
  ) THEN
    ALTER TABLE public.memories
    ADD COLUMN base_score NUMERIC GENERATED ALWAYS AS (
      CASE tier
        WHEN 'foundational' THEN 100
        WHEN 'identity' THEN 50
        WHEN 'episodic' THEN 30
        WHEN 'contextual' THEN 20
        WHEN 'transient' THEN 10
        ELSE 15
      END
      + COALESCE(emotional_weight, 0)
      + COALESCE(vulnerability_score, 0)
      + (COALESCE(retrieval_count, 0) * 2)
    ) STORED;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Validation trigger (replaces CHECK constraints)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_memory_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tier IS NOT NULL AND NEW.tier NOT IN ('foundational', 'identity', 'episodic', 'contextual', 'transient') THEN
    RAISE EXCEPTION 'Invalid tier: %. Must be foundational, identity, episodic, contextual, or transient', NEW.tier;
  END IF;
  
  IF NEW.emotional_weight IS NOT NULL AND (NEW.emotional_weight < 0 OR NEW.emotional_weight > 30) THEN
    RAISE EXCEPTION 'emotional_weight must be between 0 and 30, got %', NEW.emotional_weight;
  END IF;
  
  IF NEW.vulnerability_score IS NOT NULL AND (NEW.vulnerability_score < 0 OR NEW.vulnerability_score > 30) THEN
    RAISE EXCEPTION 'vulnerability_score must be between 0 and 30, got %', NEW.vulnerability_score;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_memory_before_insert_update ON public.memories;
CREATE TRIGGER validate_memory_before_insert_update
BEFORE INSERT OR UPDATE ON public.memories
FOR EACH ROW
EXECUTE FUNCTION public.validate_memory_fields();

-- ----------------------------------------------------------------------------
-- STEP 3: compute_memory_score function (STABLE — uses NOW())
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_memory_score(
  memory_tier TEXT,
  memory_base_score NUMERIC,
  memory_extracted_at TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  decay_days INTEGER;
  recency_boost NUMERIC;
  days_old NUMERIC;
BEGIN
  decay_days := CASE memory_tier
    WHEN 'foundational' THEN 999999
    WHEN 'identity' THEN 180
    WHEN 'episodic' THEN 90
    WHEN 'contextual' THEN 30
    WHEN 'transient' THEN 7
    ELSE 30
  END;
  
  days_old := EXTRACT(EPOCH FROM (NOW() - memory_extracted_at)) / 86400;
  
  IF memory_tier = 'foundational' THEN
    recency_boost := 0;
  ELSE
    recency_boost := 20.0 / (1 + (days_old / decay_days));
  END IF;
  
  RETURN memory_base_score + recency_boost;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 4: Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memories_tier 
ON public.memories(user_id, member_id, tier, base_score DESC)
WHERE consolidated = false;

CREATE INDEX IF NOT EXISTS idx_memories_foundational
ON public.memories(user_id, member_id, base_score DESC)
WHERE tier = 'foundational' AND consolidated = false;

CREATE INDEX IF NOT EXISTS idx_memories_needs_verification
ON public.memories(user_id, member_id, needs_verification, extracted_at)
WHERE tier IN ('identity', 'episodic') AND needs_verification = true;

CREATE INDEX IF NOT EXISTS idx_memories_themes
ON public.memories USING gin(themes)
WHERE consolidated = false;

-- ----------------------------------------------------------------------------
-- STEP 5: memory_narratives table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  narrative_type TEXT NOT NULL DEFAULT 'portrait',
  title TEXT NOT NULL,
  narrative_text TEXT NOT NULL,
  source_memory_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  regenerate_after TIMESTAMP WITH TIME ZONE,
  word_count INTEGER,
  themes TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.memory_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own narratives"
  ON public.memory_narratives FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage narratives"
  ON public.memory_narratives FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_narratives_user_member 
ON public.memory_narratives(user_id, member_id, generated_at DESC);

-- ----------------------------------------------------------------------------
-- STEP 6: memory_relationships table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id_a UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  memory_id_b UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related',
  strength NUMERIC DEFAULT 1.0,
  relationship_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(memory_id_a, memory_id_b, relationship_type)
);

-- Validation trigger instead of CHECK for no_self_relationships
CREATE OR REPLACE FUNCTION public.validate_memory_relationship()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.memory_id_a = NEW.memory_id_b THEN
    RAISE EXCEPTION 'Cannot create self-referencing memory relationship';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_memory_relationship_trigger
BEFORE INSERT OR UPDATE ON public.memory_relationships
FOR EACH ROW
EXECUTE FUNCTION public.validate_memory_relationship();

ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relationships for their memories"
  ON public.memory_relationships FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m 
      WHERE m.id = memory_id_a 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage relationships"
  ON public.memory_relationships FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_relationships_memory_a 
ON public.memory_relationships(memory_id_a, strength DESC);

CREATE INDEX IF NOT EXISTS idx_relationships_memory_b 
ON public.memory_relationships(memory_id_b, strength DESC);

-- ----------------------------------------------------------------------------
-- STEP 7: Helper functions
-- ----------------------------------------------------------------------------

-- Increment retrieval count when memory is used in conversation
CREATE OR REPLACE FUNCTION public.increment_memory_retrieval(memory_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE memories
  SET 
    retrieval_count = COALESCE(retrieval_count, 0) + 1,
    last_retrieved_at = NOW()
  WHERE id = ANY(memory_ids);
END;
$$;

-- Mark stale memories for verification
CREATE OR REPLACE FUNCTION public.mark_stale_memories_for_verification()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
  identity_count INTEGER;
  episodic_count INTEGER;
BEGIN
  UPDATE memories
  SET needs_verification = true
  WHERE tier = 'identity'
    AND needs_verification = false
    AND verified_at IS NULL
    AND EXTRACT(EPOCH FROM (NOW() - extracted_at)) > (90 * 86400)
    AND consolidated = false;
  GET DIAGNOSTICS identity_count = ROW_COUNT;

  UPDATE memories
  SET needs_verification = true
  WHERE tier = 'episodic'
    AND needs_verification = false
    AND verified_at IS NULL
    AND EXTRACT(EPOCH FROM (NOW() - extracted_at)) > (180 * 86400)
    AND consolidated = false;
  GET DIAGNOSTICS episodic_count = ROW_COUNT;

  RETURN identity_count + episodic_count;
END;
$$;

-- Get memories needing verification
CREATE OR REPLACE FUNCTION public.get_verification_candidates(
  p_user_id UUID,
  p_member_id TEXT,
  p_limit INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  tier TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE,
  days_old NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.text,
    m.tier,
    m.extracted_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - m.extracted_at)) / 86400) as days_old
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.member_id = p_member_id
    AND m.needs_verification = true
    AND m.consolidated = false
  ORDER BY m.extracted_at ASC
  LIMIT p_limit;
END;
$$;

-- Contextual memory search (by themes/text matching)
CREATE OR REPLACE FUNCTION public.get_contextual_memories(
  p_user_id UUID,
  p_member_id TEXT,
  p_topics TEXT[],
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  tier TEXT,
  category TEXT,
  base_score NUMERIC,
  extracted_at TIMESTAMPTZ,
  computed_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.text, m.tier, m.category, m.base_score, m.extracted_at,
    compute_memory_score(m.tier, m.base_score, m.extracted_at) as computed_score
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.member_id = p_member_id
    AND m.consolidated = false
    AND (
      m.themes && p_topics
      OR EXISTS (
        SELECT 1 FROM unnest(p_topics) as topic
        WHERE m.text ILIKE '%' || topic || '%'
      )
    )
  ORDER BY compute_memory_score(m.tier, m.base_score, m.extracted_at) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.compute_memory_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_memory_score TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_memory_retrieval TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_stale_memories_for_verification TO service_role;
GRANT EXECUTE ON FUNCTION public.get_verification_candidates TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verification_candidates TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contextual_memories TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contextual_memories TO service_role;
