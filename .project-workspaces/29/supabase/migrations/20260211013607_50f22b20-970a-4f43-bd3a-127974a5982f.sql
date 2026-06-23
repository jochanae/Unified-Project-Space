
-- Add new columns to the trades table
ALTER TABLE public.trades 
  ADD COLUMN trade_mode text NOT NULL DEFAULT 'real',
  ADD COLUMN asset_class text NOT NULL DEFAULT 'equity',
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN emotion text DEFAULT NULL,
  ADD COLUMN screenshot_url text DEFAULT NULL;

-- Create storage bucket for trade screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can upload their own screenshots
CREATE POLICY "Users can upload trade screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy: anyone can view trade screenshots (public bucket)
CREATE POLICY "Trade screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-screenshots');

-- Storage policy: users can delete their own screenshots
CREATE POLICY "Users can delete their own trade screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
