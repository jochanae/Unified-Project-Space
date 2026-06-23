CREATE TYPE public.reading_plan_status AS ENUM ('active', 'complete');

CREATE TABLE public.reading_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  start_chapter INTEGER NOT NULL,
  target_chapters_per_day INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status public.reading_plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT reading_plans_start_chapter_positive CHECK (start_chapter > 0),
  CONSTRAINT reading_plans_target_chapters_positive CHECK (target_chapters_per_day > 0),
  CONSTRAINT reading_plans_id_user_unique UNIQUE (id, user_id)
);

CREATE TABLE public.reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  chapter INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT reading_progress_chapter_positive CHECK (chapter > 0),
  CONSTRAINT reading_progress_user_plan_fk
    FOREIGN KEY (plan_id, user_id)
    REFERENCES public.reading_plans (id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT reading_progress_unique_chapter_per_plan UNIQUE (plan_id, chapter)
);

CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_verse_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_verse_time TIME NOT NULL DEFAULT '07:00:00',
  plan_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_reading_plans_user_status_started_at
  ON public.reading_plans (user_id, status, started_at DESC);

CREATE INDEX idx_reading_progress_user_plan_completed_at
  ON public.reading_progress (user_id, plan_id, completed_at DESC);

CREATE INDEX idx_notification_preferences_user_id
  ON public.notification_preferences (user_id);

ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own reading plans"
ON public.reading_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users add their own reading plans"
ON public.reading_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own reading plans"
ON public.reading_plans
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own reading plans"
ON public.reading_plans
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users view their own reading progress"
ON public.reading_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users add their own reading progress"
ON public.reading_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own reading progress"
ON public.reading_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own reading progress"
ON public.reading_progress
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users add their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own notification preferences"
ON public.notification_preferences
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_reading_plans_updated_at
BEFORE UPDATE ON public.reading_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();