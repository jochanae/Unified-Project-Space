ALTER TABLE beta_feedback
  ADD COLUMN IF NOT EXISTS onboarding_clarity text,
  ADD COLUMN IF NOT EXISTS think_freely_found text,
  ADD COLUMN IF NOT EXISTS selfie_worked text,
  ADD COLUMN IF NOT EXISTS gift_image_worked text,
  ADD COLUMN IF NOT EXISTS studio_avatar_worked text,
  ADD COLUMN IF NOT EXISTS image_gen_bugs text,
  ADD COLUMN IF NOT EXISTS studio_experience text,
  ADD COLUMN IF NOT EXISTS threads_experience text;

ALTER TABLE beta_feedback
  ALTER COLUMN cami_matched TYPE text USING cami_matched::text;