-- Enable RLS on realtime.messages for Broadcast/Presence channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to use circle-scoped channels (broadcast + presence)
-- Circle channels follow pattern: circle-*-{circleId}
CREATE POLICY "Circle members can use circle channels"
  ON realtime.messages FOR ALL TO authenticated
  USING (
    realtime.topic() ~ '^circle-' 
    AND public.is_circle_member(
      (regexp_match(realtime.topic(), '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid,
      auth.uid()
    )
  )
  WITH CHECK (
    realtime.topic() ~ '^circle-' 
    AND public.is_circle_member(
      (regexp_match(realtime.topic(), '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid,
      auth.uid()
    )
  );

-- Allow all authenticated users to use non-circle channels (postgres_changes, user-scoped, etc.)
-- This covers: reactions-feed, profile-connections-sync, messages-list-chat-updates, 
-- companion-posts-feed, user-posts-feed, badge-notifications, founder-milestone, etc.
CREATE POLICY "Authenticated users can use non-circle channels"
  ON realtime.messages FOR ALL TO authenticated
  USING (
    realtime.topic() NOT LIKE 'circle-%'
  )
  WITH CHECK (
    realtime.topic() NOT LIKE 'circle-%'
  );