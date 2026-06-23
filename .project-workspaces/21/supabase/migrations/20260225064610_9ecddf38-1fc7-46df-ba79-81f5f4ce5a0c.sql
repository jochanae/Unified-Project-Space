-- Add background_url to connections for per-companion backdrops
ALTER TABLE public.connections ADD COLUMN background_url text;

-- Create storage bucket for backdrop images
INSERT INTO storage.buckets (id, name, public) VALUES ('companion-backdrops', 'companion-backdrops', true);

-- Allow authenticated users to upload their own backdrops
CREATE POLICY "Users can upload their own backdrops"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'companion-backdrops' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Backdrops are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'companion-backdrops');

-- Allow users to delete their own backdrops
CREATE POLICY "Users can delete their own backdrops"
ON storage.objects FOR DELETE
USING (bucket_id = 'companion-backdrops' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own backdrops
CREATE POLICY "Users can update their own backdrops"
ON storage.objects FOR UPDATE
USING (bucket_id = 'companion-backdrops' AND auth.uid()::text = (storage.foldername(name))[1]);
