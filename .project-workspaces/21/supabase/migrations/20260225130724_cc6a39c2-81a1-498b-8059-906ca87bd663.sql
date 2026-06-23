
-- Create audio-messages storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', true);

-- RLS: users can upload their own audio
CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can read audio (public bucket)
CREATE POLICY "Public audio read" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'audio-messages');

-- RLS: users can delete their own audio
CREATE POLICY "Users can delete own audio" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audio-messages' AND (storage.foldername(name))[1] = auth.uid()::text);
