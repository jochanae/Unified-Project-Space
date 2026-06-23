
-- Drop the existing permissive policy on realtime.messages
DROP POLICY IF EXISTS "Allow authenticated users to listen to realtime" ON realtime.messages;

-- Create a scoped policy: users can only subscribe to topics that contain their org_id
CREATE POLICY "Users can only subscribe to own org channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    position(get_user_org_id()::text in topic) > 0
  );
