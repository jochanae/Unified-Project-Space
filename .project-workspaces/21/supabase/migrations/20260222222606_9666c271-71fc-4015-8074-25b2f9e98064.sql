
-- Add personality_traits jsonb column to profiles
ALTER TABLE public.profiles
ADD COLUMN personality_traits jsonb DEFAULT '{}'::jsonb;

-- Example stored shape:
-- { "communication": "Warm & Easy", "humor": "Playful", "depth": "Balanced", "interests": ["Music", "Nature"] }
