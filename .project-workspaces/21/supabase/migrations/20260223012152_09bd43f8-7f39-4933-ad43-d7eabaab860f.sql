-- Fix: Add unique constraint on user_id for matchmaking_sessions upsert to work
-- First, remove any duplicate rows (keep the most recent one)
DELETE FROM matchmaking_sessions a
USING matchmaking_sessions b
WHERE a.user_id = b.user_id 
  AND a.updated_at < b.updated_at;

-- Now add the unique constraint
ALTER TABLE matchmaking_sessions ADD CONSTRAINT matchmaking_sessions_user_id_unique UNIQUE (user_id);