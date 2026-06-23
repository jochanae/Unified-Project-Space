-- Add messages JSON column to store full conversation for loadable history
ALTER TABLE public.cami_session_history 
ADD COLUMN IF NOT EXISTS messages jsonb DEFAULT '[]'::jsonb;

-- Add title column for session preview (first user message snippet)
ALTER TABLE public.cami_session_history 
ADD COLUMN IF NOT EXISTS title text;