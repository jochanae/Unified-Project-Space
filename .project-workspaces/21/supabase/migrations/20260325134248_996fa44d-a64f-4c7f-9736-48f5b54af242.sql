
-- Clean up duplicate collectibles (keep oldest)
WITH dupes AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, member_id, type, title ORDER BY created_at ASC) rn
  FROM companion_collectibles
)
DELETE FROM companion_collectibles WHERE id IN (SELECT id FROM dupes WHERE rn > 1);
