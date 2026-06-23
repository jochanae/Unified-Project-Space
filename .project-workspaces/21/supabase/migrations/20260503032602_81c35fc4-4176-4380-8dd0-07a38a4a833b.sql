
-- 1. Update compute_memory_score: decay retrieval_count contribution with 30-day half-life
--    Exempt: tier='foundational' and category='milestone' (no decay on retrieval boost)
CREATE OR REPLACE FUNCTION public.compute_memory_score(
  memory_tier text,
  memory_base_score numeric,
  memory_extracted_at timestamp with time zone
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. New overload: decay retrieval_count using last_retrieved_at with 30-day half-life,
--    exempting foundational tier and milestone category.
CREATE OR REPLACE FUNCTION public.compute_memory_score(
  memory_tier text,
  memory_category text,
  memory_emotional_weight integer,
  memory_vulnerability_score integer,
  memory_retrieval_count integer,
  memory_last_retrieved_at timestamp with time zone,
  memory_extracted_at timestamp with time zone
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  decay_days INTEGER;
  recency_boost NUMERIC;
  days_old NUMERIC;
  tier_weight NUMERIC;
  retrieval_bonus NUMERIC;
  half_life_days CONSTANT NUMERIC := 30;
  days_since_retrieval NUMERIC;
  decay_factor NUMERIC;
  base NUMERIC;
BEGIN
  tier_weight := CASE memory_tier
    WHEN 'foundational' THEN 100
    WHEN 'identity' THEN 50
    WHEN 'episodic' THEN 30
    WHEN 'contextual' THEN 20
    WHEN 'transient' THEN 10
    ELSE 15
  END;

  decay_days := CASE memory_tier
    WHEN 'foundational' THEN 999999
    WHEN 'identity' THEN 180
    WHEN 'episodic' THEN 90
    WHEN 'contextual' THEN 30
    WHEN 'transient' THEN 7
    ELSE 30
  END;

  days_old := EXTRACT(EPOCH FROM (NOW() - memory_extracted_at)) / 86400;

  -- Retrieval bonus with optional decay
  -- Foundational tier and milestone category: no decay (protect core history)
  IF memory_tier = 'foundational' OR memory_category = 'milestone' THEN
    retrieval_bonus := COALESCE(memory_retrieval_count, 0) * 2;
  ELSE
    -- Decay retrieval bonus by 30-day half-life since last retrieval
    IF memory_last_retrieved_at IS NULL THEN
      decay_factor := 1.0;
    ELSE
      days_since_retrieval := EXTRACT(EPOCH FROM (NOW() - memory_last_retrieved_at)) / 86400;
      decay_factor := POWER(0.5, days_since_retrieval / half_life_days);
    END IF;
    retrieval_bonus := COALESCE(memory_retrieval_count, 0) * 2 * decay_factor;
  END IF;

  base := tier_weight
        + COALESCE(memory_emotional_weight, 0)
        + COALESCE(memory_vulnerability_score, 0)
        + retrieval_bonus;

  IF memory_tier = 'foundational' THEN
    recency_boost := 0;
  ELSE
    recency_boost := 20.0 / (1 + (days_old / decay_days));
  END IF;

  RETURN base + recency_boost;
END;
$function$;

-- 3. Update get_contextual_memories to use the new decayed scoring
CREATE OR REPLACE FUNCTION public.get_contextual_memories(
  p_user_id uuid,
  p_member_id text,
  p_topics text[],
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  text text,
  tier text,
  category text,
  base_score numeric,
  extracted_at timestamp with time zone,
  computed_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.text, m.tier, m.category, m.base_score, m.extracted_at,
    compute_memory_score(
      m.tier, m.category, m.emotional_weight, m.vulnerability_score,
      m.retrieval_count, m.last_retrieved_at, m.extracted_at
    ) AS computed_score
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.member_id = p_member_id
    AND m.consolidated = false
    AND (
      m.themes && p_topics
      OR EXISTS (
        SELECT 1 FROM unnest(p_topics) AS topic
        WHERE m.text ILIKE '%' || topic || '%'
      )
    )
  ORDER BY compute_memory_score(
      m.tier, m.category, m.emotional_weight, m.vulnerability_score,
      m.retrieval_count, m.last_retrieved_at, m.extracted_at
    ) DESC
  LIMIT p_limit;
END;
$function$;

-- 4. Push decision log for auditing why pushes fire (or don't)
CREATE TABLE IF NOT EXISTS public.push_decision_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  member_id text,
  decision text NOT NULL,           -- 'sent' | 'skipped'
  push_type text,                   -- proactive | checkin | warmth | etc | skip
  reason text NOT NULL,             -- short machine-readable code
  detail jsonb,                     -- optional extra context
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_decision_log_user_created
  ON public.push_decision_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_decision_log_reason
  ON public.push_decision_log (reason, created_at DESC);

ALTER TABLE public.push_decision_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own decision log
CREATE POLICY "Users view own push decisions"
  ON public.push_decision_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all decisions
CREATE POLICY "Admins view all push decisions"
  ON public.push_decision_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
