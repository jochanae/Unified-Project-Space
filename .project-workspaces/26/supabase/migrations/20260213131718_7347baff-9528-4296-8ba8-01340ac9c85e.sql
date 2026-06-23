
-- Add autopay_source to distinguish internal vs external autopay
ALTER TABLE public.bills 
ADD COLUMN autopay_source text DEFAULT NULL 
CHECK (autopay_source IN ('internal', 'external', NULL));

-- Update existing autopay bills to 'external' as default (user was tracking them manually)
UPDATE public.bills SET autopay_source = 'external' WHERE is_autopay = true;
