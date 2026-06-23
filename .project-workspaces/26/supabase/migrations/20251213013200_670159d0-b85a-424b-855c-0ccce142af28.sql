-- Add hide_details column to vision_board_items table
ALTER TABLE public.vision_board_items 
ADD COLUMN IF NOT EXISTS hide_details BOOLEAN NOT NULL DEFAULT false;