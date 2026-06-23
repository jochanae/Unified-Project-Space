
-- Enable RLS on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to use Realtime
-- The actual data filtering is enforced by the SELECT RLS on the source table (stream_blocks)
-- This policy controls who can subscribe to channels at all
CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
