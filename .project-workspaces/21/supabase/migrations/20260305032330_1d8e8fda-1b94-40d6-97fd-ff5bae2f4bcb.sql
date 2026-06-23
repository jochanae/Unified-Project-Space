
-- Reminders/accountability table
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id text NOT NULL,
  companion_name text NOT NULL,
  reminder_text text NOT NULL,
  remind_at time NOT NULL,
  days_of_week text[] NOT NULL DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}',
  active boolean NOT NULL DEFAULT true,
  last_fired_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);
