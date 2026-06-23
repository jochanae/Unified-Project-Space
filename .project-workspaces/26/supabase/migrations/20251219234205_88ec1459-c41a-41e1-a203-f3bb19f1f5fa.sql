-- Add option to show partner name alongside logo
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS show_name_with_logo boolean NOT NULL DEFAULT false;