ALTER TABLE beta_feedback
  ADD COLUMN IF NOT EXISTS avatar_flow_check text,
  ADD COLUMN IF NOT EXISTS avatar_preview_experience text;