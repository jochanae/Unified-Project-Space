ALTER TABLE public.quinn_blueprint_cards
DROP CONSTRAINT IF EXISTS quinn_blueprint_cards_mode_lens_check;

ALTER TABLE public.quinn_blueprint_cards
ADD CONSTRAINT quinn_blueprint_cards_mode_lens_check
CHECK (mode_lens = ANY (ARRAY['focus'::text, 'brainstorm'::text, 'planner'::text, 'audit'::text, 'strategic'::text, 'shredder'::text]));