-- Create storage bucket for circle handout files
INSERT INTO storage.buckets (id, name, public) VALUES ('circle-handouts', 'circle-handouts', true);

-- Allow authenticated users to upload handouts
CREATE POLICY "Authenticated users can upload handouts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'circle-handouts');

-- Allow public reads
CREATE POLICY "Handouts are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'circle-handouts');

-- Allow owners to delete their handouts
CREATE POLICY "Users can delete their own handouts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'circle-handouts' AND auth.uid()::text = (storage.foldername(name))[1]);