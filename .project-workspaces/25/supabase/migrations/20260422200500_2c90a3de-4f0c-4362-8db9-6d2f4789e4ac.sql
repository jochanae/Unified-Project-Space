INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('reader_voice_engine', jsonb_build_object('engine', 'google'))
ON CONFLICT (setting_key) DO NOTHING;
