
-- Add messages_used column to track total messages per month
ALTER TABLE public.user_usage ADD COLUMN IF NOT EXISTS messages_used integer NOT NULL DEFAULT 0;
