-- Remove the public:% wildcard. All realtime subscriptions must be user-scoped.
DROP POLICY IF EXISTS "Users can subscribe to their own realtime topics" ON realtime.messages;

CREATE POLICY "Users can subscribe to their own realtime topics"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
    OR realtime.topic() = ('user:' || auth.uid()::text)
  );