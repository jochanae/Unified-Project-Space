DROP POLICY IF EXISTS "Users can subscribe only to their own postgres_changes"
  ON realtime.messages;

CREATE POLICY "Users can subscribe to postgres_changes only on own topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'postgres_changes'
    AND public.realtime_topic_user_id(topic) = auth.uid()
  );