
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS snooze_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

DELETE FROM public.reminders WHERE id = '6676aa88-b83a-4137-9b00-5e9f64426012';
