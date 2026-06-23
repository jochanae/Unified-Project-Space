
-- Create the work-artifacts bucket (private, user-scoped)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-artifacts', 'work-artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users manage only their own folder ({user_id}/...)
CREATE POLICY "Users can read their own work artifacts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-artifacts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own work artifacts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-artifacts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own work artifacts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-artifacts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own work artifacts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-artifacts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
