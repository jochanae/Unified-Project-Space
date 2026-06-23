
-- Remove the overly permissive ALL policy
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;

-- The existing org-scoped SELECT policy remains in place.
-- Add org-scoped INSERT and UPDATE policies so users can only
-- publish to channels that contain their own org_id.

CREATE POLICY "Users can insert realtime messages for own org"
ON realtime.messages
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%' || (SELECT get_user_org_id()::text) || '%'
);

CREATE POLICY "Users can update realtime messages for own org"
ON realtime.messages
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  realtime.topic() LIKE '%' || (SELECT get_user_org_id()::text) || '%'
)
WITH CHECK (
  realtime.topic() LIKE '%' || (SELECT get_user_org_id()::text) || '%'
);
