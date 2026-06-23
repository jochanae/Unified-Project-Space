
-- Delete duplicate favorites keeping only the oldest per (user_id, source, member_id, post_content)
DELETE FROM favorites
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, source, member_id, post_content) id
  FROM favorites
  ORDER BY user_id, source, member_id, post_content, created_at ASC
);

-- Prevent future duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_dedup
ON favorites (user_id, source, member_id, post_content);
