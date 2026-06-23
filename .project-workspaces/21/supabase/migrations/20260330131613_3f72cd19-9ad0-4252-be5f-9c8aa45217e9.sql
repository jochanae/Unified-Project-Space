
-- Make audio-messages bucket private
UPDATE storage.buckets SET public = false WHERE id = 'audio-messages';

-- Make chat-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';
