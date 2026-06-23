-- Remove pre-existing duplicate avatar storage policies (keep the new ones from previous migration)
DROP POLICY IF EXISTS "Users can upload their own avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar images" ON storage.objects;

-- Tighten realtime: only allow subscribing to topics that include the user's own id.
-- Convention: channels should be named like 'user:<uuid>:<purpose>' or 'public:*'.
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime" ON realtime.messages;

CREATE POLICY "Users can subscribe to their own realtime topics"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    -- Allow public:* topics (e.g. landing preview broadcast) and user-scoped topics
    realtime.topic() LIKE 'public:%'
    OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
    OR realtime.topic() LIKE ('user:' || auth.uid()::text)
  );