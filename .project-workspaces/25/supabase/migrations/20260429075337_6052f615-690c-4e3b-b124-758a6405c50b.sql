ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_theme_check;
ALTER TABLE public.boards ADD CONSTRAINT boards_theme_check
  CHECK (theme = ANY (ARRAY[
    'obsidian-gold'::text,
    'midnight-ivory'::text,
    'emerald-gold'::text,
    'parchment-ink'::text,
    'slate-pearl'::text,
    'burgundy-rose'::text
  ]));