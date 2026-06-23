DROP POLICY IF EXISTS "Users can subscribe to postgres_changes only on own topic"
  ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to postgres_changes (rows still RLS-filtered)"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (extension = 'postgres_changes');