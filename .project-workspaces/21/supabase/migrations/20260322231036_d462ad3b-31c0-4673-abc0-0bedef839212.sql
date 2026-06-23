ALTER TABLE beta_feedback
  ADD COLUMN IF NOT EXISTS companion_appeared text,
  ADD COLUMN IF NOT EXISTS backdrop_experience text,
  ADD COLUMN IF NOT EXISTS own_image_used text,
  ADD COLUMN IF NOT EXISTS dashboard_experience text,
  ADD COLUMN IF NOT EXISTS browse_experience text,
  ADD COLUMN IF NOT EXISTS wellness_experience text,
  ADD COLUMN IF NOT EXISTS timeline_experience text,
  ADD COLUMN IF NOT EXISTS store_experience text;