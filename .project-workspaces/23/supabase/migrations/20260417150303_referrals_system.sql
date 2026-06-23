-- Add referral reward column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referral_reward_expires_at TIMESTAMPTZ NULL;

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON users(referral_code);

-- RLS: users can only see their own referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (referrer_user_id = auth.uid());

-- Auto-generate referral code for new users via trigger
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Backfill referral codes for existing users who don't have one
UPDATE users
SET referral_code = lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8))
WHERE referral_code IS NULL;
