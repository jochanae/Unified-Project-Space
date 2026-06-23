-- Ensure companion-avatars bucket is public for chat backdrop and avatar display
INSERT INTO storage.buckets (id, name, public)
VALUES ('companion-avatars', 'companion-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;
