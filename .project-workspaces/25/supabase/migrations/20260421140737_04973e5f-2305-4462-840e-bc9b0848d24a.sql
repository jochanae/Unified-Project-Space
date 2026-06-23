-- Remove app_settings from the realtime publication.
-- It contained admin-only rows that were being broadcast to all authenticated users.
-- The only consumer (landing preview) doesn't need realtime — it can fetch on mount.
ALTER PUBLICATION supabase_realtime DROP TABLE public.app_settings;