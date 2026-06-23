ALTER TABLE public.vault_collections
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Backfill existing rows per user, ordered by current updated_at
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC) - 1 AS rn
  FROM public.vault_collections
)
UPDATE public.vault_collections vc
SET position = ordered.rn
FROM ordered
WHERE vc.id = ordered.id;

CREATE INDEX IF NOT EXISTS idx_vault_collections_user_position
  ON public.vault_collections(user_id, position);