-- Change biggest_challenge from text to text[] for multi-select support
ALTER TABLE public.bloom_coach_profiles 
ALTER COLUMN biggest_challenge TYPE text[] 
USING CASE WHEN biggest_challenge IS NOT NULL THEN ARRAY[biggest_challenge] ELSE NULL END;