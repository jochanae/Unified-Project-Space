
-- Add cached_traits JSONB column to connections for AI-extracted structured traits
ALTER TABLE public.connections
ADD COLUMN cached_traits jsonb DEFAULT NULL;

COMMENT ON COLUMN public.connections.cached_traits IS 'AI-extracted structured traits from appearance_desc (hair, accessories, skin, marks, facial_hair). Lazy-populated on first image generation.';
