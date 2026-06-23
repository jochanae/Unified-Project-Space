-- Add reaction_type column to quote_likes table
ALTER TABLE public.quote_likes 
ADD COLUMN reaction_type text NOT NULL DEFAULT 'like';

-- Add unique constraint on quote_id and user_id for upsert
ALTER TABLE public.quote_likes 
DROP CONSTRAINT IF EXISTS quote_likes_quote_id_user_id_key;

ALTER TABLE public.quote_likes 
ADD CONSTRAINT quote_likes_quote_id_user_id_key UNIQUE (quote_id, user_id);