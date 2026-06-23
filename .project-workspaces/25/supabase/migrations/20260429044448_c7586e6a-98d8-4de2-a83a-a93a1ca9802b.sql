ALTER TABLE public.board_items DROP CONSTRAINT IF EXISTS board_items_kind_check;
ALTER TABLE public.board_items ADD CONSTRAINT board_items_kind_check
  CHECK (kind = ANY (ARRAY['poem'::text, 'note'::text, 'video'::text, 'audio'::text, 'scripture'::text, 'link'::text]));