
-- Add active_speaker_id for "Pass the Mic" feature
ALTER TABLE public.custom_circles
ADD COLUMN active_speaker_id uuid DEFAULT NULL;

-- Add community_flavor to distinguish Meeting vs Gathering within community type
ALTER TABLE public.custom_circles
ADD COLUMN community_flavor text NOT NULL DEFAULT 'meeting';

-- Migrate existing church circles to community with gathering flavor
UPDATE public.custom_circles
SET circle_type = 'community', community_flavor = 'gathering'
WHERE circle_type = 'church';
