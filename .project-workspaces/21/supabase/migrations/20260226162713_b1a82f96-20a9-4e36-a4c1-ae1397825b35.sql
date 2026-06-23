ALTER TABLE public.custom_circles ADD COLUMN circle_type text NOT NULL DEFAULT 'social';

COMMENT ON COLUMN public.custom_circles.circle_type IS 'Circle template type: community, social, or personal';