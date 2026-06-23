ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'note';

CREATE INDEX IF NOT EXISTS notes_note_type_idx
  ON public.notes (user_id, note_type, updated_at DESC);