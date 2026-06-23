UPDATE connections c
SET avatar_url = sub.member_avatar_url
FROM (
  SELECT DISTINCT ON (user_id, member_id) user_id, member_id, member_avatar_url
  FROM companion_feed_posts
  WHERE member_avatar_url IS NOT NULL
  ORDER BY user_id, member_id, created_at DESC
) sub
WHERE c.user_id = sub.user_id
  AND c.member_id = sub.member_id
  AND c.avatar_url IS NULL;