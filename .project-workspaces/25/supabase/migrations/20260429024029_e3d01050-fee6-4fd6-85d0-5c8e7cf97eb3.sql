ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS show_bible_link boolean NOT NULL DEFAULT false;