ALTER TABLE public.board_items
  ADD COLUMN IF NOT EXISTS subkind text;

UPDATE public.board_items
  SET subkind = 'poem'
  WHERE kind = 'poem' AND subkind IS NULL;

CREATE INDEX IF NOT EXISTS board_items_user_kind_subkind_idx
  ON public.board_items (user_id, kind, subkind);