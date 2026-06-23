-- Add is_private flag to journal entries (default false = shared with companions)
ALTER TABLE public.journal_entries
ADD COLUMN is_private boolean NOT NULL DEFAULT false;