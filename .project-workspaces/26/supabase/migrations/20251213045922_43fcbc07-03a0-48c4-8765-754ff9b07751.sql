-- Create event_reminders table for LiveLearnCard remind functionality
CREATE TABLE public.event_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_set_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reminders
CREATE POLICY "Users can view their own reminders"
ON public.event_reminders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own reminders
CREATE POLICY "Users can create their own reminders"
ON public.event_reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
ON public.event_reminders FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_event_reminders_user_id ON public.event_reminders(user_id);
CREATE INDEX idx_event_reminders_event_id ON public.event_reminders(event_id);