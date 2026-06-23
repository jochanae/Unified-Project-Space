-- Delete duplicate memories, keeping only the oldest entry for each (user_id, text) pair
DELETE FROM memories
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, text) id
  FROM memories
  ORDER BY user_id, text, extracted_at ASC
);

-- Add unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_user_text_unique ON memories (user_id, text);