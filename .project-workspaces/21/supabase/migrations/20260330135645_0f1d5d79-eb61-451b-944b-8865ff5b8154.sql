CREATE TABLE IF NOT EXISTS conversation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id text NOT NULL,
  communication_register text NOT NULL DEFAULT 'balanced',
  engagement_triggers text[] DEFAULT '{}',
  pushback_tolerance text NOT NULL DEFAULT 'moderate',
  tone_preferences text[] DEFAULT '{}',
  confidence text NOT NULL DEFAULT 'low',
  last_analyzed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, member_id)
);

ALTER TABLE conversation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation profiles"
  ON conversation_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage conversation profiles"
  ON conversation_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_conversation_profiles_user_member 
  ON conversation_profiles(user_id, member_id);

CREATE INDEX idx_conversation_profiles_last_analyzed 
  ON conversation_profiles(last_analyzed);