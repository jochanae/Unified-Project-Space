-- Migrate any existing rows with old theme values to the new canonical name
UPDATE public.boards SET theme = 'obsidian-gold' WHERE theme NOT IN ('obsidian-gold','midnight-ivory','emerald-gold');

-- Update default
ALTER TABLE public.boards ALTER COLUMN theme SET DEFAULT 'obsidian-gold';

-- Constrain to known values
ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_theme_check;
ALTER TABLE public.boards ADD CONSTRAINT boards_theme_check
  CHECK (theme IN ('obsidian-gold','midnight-ivory','emerald-gold'));