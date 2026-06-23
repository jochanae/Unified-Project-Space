-- Add account blocking fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason text,
ADD COLUMN IF NOT EXISTS blocked_at timestamptz;

-- Index for fast lookup on login
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles (is_blocked) WHERE is_blocked = true;