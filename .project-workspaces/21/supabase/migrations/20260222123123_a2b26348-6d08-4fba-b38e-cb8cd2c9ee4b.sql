-- Add companion avatar fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN companion_avatar_url text,
ADD COLUMN companion_appearance_desc text;

-- Create storage bucket for companion avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('companion-avatars', 'companion-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload companion avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'companion-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to companion avatars
CREATE POLICY "Companion avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'companion-avatars');

-- Allow users to update/delete their own avatars
CREATE POLICY "Users can update their own companion avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'companion-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own companion avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'companion-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);