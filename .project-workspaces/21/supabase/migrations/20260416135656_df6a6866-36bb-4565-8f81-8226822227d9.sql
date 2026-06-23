
DROP FUNCTION IF EXISTS public.get_verification_candidates(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_verification_candidates(
  p_user_id UUID,
  p_member_id TEXT,
  p_limit INTEGER DEFAULT 1
)
RETURNS TABLE(
  id UUID,
  text TEXT,
  tier TEXT,
  category TEXT,
  days_old INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.text,
    m.tier,
    m.category,
    EXTRACT(DAY FROM (NOW() - m.extracted_at))::INTEGER AS days_old
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.member_id = p_member_id
    AND m.tier = 'identity'
    AND m.needs_verification = false
    AND m.extracted_at < NOW() - INTERVAL '90 days'
    AND (m.verified_at IS NULL OR m.verified_at < NOW() - INTERVAL '90 days')
  ORDER BY m.extracted_at ASC
  LIMIT p_limit;
END;
$$;
