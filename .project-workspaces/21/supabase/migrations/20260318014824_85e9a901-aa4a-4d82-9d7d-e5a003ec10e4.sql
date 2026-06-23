
-- Function 1: App-wide platform integrity stats (admin only)
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(DISTINCT user_id) FROM profiles),
    'total_connections', (SELECT count(*) FROM connections WHERE is_archived IS NOT TRUE),
    'total_messages', (SELECT count(*) FROM chat_messages),
    'total_milestones', (SELECT count(*) FROM companion_milestones),
    'connections_missing_avatar', (SELECT count(*) FROM connections WHERE avatar_url IS NULL AND is_archived IS NOT TRUE),
    'total_with_avatar', (SELECT count(*) FROM connections WHERE avatar_url IS NOT NULL AND is_archived IS NOT TRUE),
    'orphaned_chat_members', (
      SELECT count(DISTINCT cm.member_id)
      FROM chat_messages cm
      WHERE NOT EXISTS (
        SELECT 1 FROM connections c WHERE c.user_id = cm.user_id AND c.member_id = cm.member_id
      )
    ),
    'orphaned_milestone_members', (
      SELECT count(DISTINCT m.member_id)
      FROM companion_milestones m
      WHERE NOT EXISTS (
        SELECT 1 FROM connections c WHERE c.user_id = m.user_id AND c.member_id = m.member_id
      )
    ),
    'users_with_issues', (
      SELECT count(DISTINCT sub.uid) FROM (
        SELECT cm.user_id as uid FROM chat_messages cm
        WHERE NOT EXISTS (SELECT 1 FROM connections c WHERE c.user_id = cm.user_id AND c.member_id = cm.member_id)
        UNION
        SELECT co.user_id as uid FROM connections co WHERE co.avatar_url IS NULL AND co.is_archived IS NOT TRUE
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function 2: List users with companion counts (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, user_name text, companion_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.user_name, COALESCE(c.cnt, 0::bigint) as companion_count
  FROM profiles p
  LEFT JOIN (
    SELECT conn.user_id as uid, count(*) as cnt
    FROM connections conn
    WHERE conn.is_archived IS NOT TRUE
    GROUP BY conn.user_id
  ) c ON c.uid = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Function 3: Per-user integrity stats (admin can view any user)
CREATE OR REPLACE FUNCTION public.admin_user_integrity(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_connections', (SELECT count(*) FROM connections WHERE user_id = p_target_user_id AND is_archived IS NOT TRUE),
    'missing_avatars', (SELECT count(*) FROM connections WHERE user_id = p_target_user_id AND avatar_url IS NULL AND is_archived IS NOT TRUE),
    'with_avatar', (SELECT count(*) FROM connections WHERE user_id = p_target_user_id AND avatar_url IS NOT NULL AND is_archived IS NOT TRUE),
    'total_messages', (SELECT count(*) FROM chat_messages WHERE user_id = p_target_user_id),
    'total_milestones', (SELECT count(*) FROM companion_milestones WHERE user_id = p_target_user_id),
    'orphaned_chat', (
      SELECT count(DISTINCT cm.member_id) FROM chat_messages cm
      WHERE cm.user_id = p_target_user_id
      AND NOT EXISTS (SELECT 1 FROM connections c WHERE c.user_id = cm.user_id AND c.member_id = cm.member_id)
    ),
    'orphaned_milestones', (
      SELECT count(DISTINCT m.member_id) FROM companion_milestones m
      WHERE m.user_id = p_target_user_id
      AND NOT EXISTS (SELECT 1 FROM connections c WHERE c.user_id = m.user_id AND c.member_id = m.member_id)
    )
  ) INTO result;

  RETURN result;
END;
$$;
