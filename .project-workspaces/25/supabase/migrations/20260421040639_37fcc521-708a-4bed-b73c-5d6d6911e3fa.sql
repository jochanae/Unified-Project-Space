CREATE TABLE public.verse_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_start INTEGER NOT NULL,
  verse_end INTEGER NOT NULL,
  version TEXT NOT NULL DEFAULT 'KJV',
  tone TEXT NOT NULL DEFAULT 'gold',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT verse_highlights_verse_range_valid CHECK (verse_start > 0 AND verse_end >= verse_start),
  CONSTRAINT verse_highlights_version_valid CHECK (version IN ('KJV', 'ASV')),
  CONSTRAINT verse_highlights_tone_valid CHECK (tone IN ('gold')),
  CONSTRAINT verse_highlights_user_passage_unique UNIQUE (user_id, book, chapter, verse_start, verse_end, version)
);

ALTER TABLE public.verse_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verse highlights"
ON public.verse_highlights
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verse highlights"
ON public.verse_highlights
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verse highlights"
ON public.verse_highlights
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verse highlights"
ON public.verse_highlights
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_verse_highlights_user_chapter
ON public.verse_highlights (user_id, book, chapter, version);

CREATE INDEX idx_verse_highlights_user_range
ON public.verse_highlights (user_id, book, chapter, verse_start, verse_end);

CREATE TRIGGER set_verse_highlights_updated_at
BEFORE UPDATE ON public.verse_highlights
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();