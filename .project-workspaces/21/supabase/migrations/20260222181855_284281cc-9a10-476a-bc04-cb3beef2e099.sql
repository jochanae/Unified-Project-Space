-- Table for blocked users
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blocked_member_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own blocks" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own blocks" ON public.blocked_users FOR DELETE USING (auth.uid() = user_id);

-- Unique constraint to prevent duplicate blocks
CREATE UNIQUE INDEX idx_blocked_users_unique ON public.blocked_users (user_id, blocked_member_id);

-- Table for reported content
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_member_id TEXT NOT NULL,
  reported_post_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can insert their own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Table for notification preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  community_replies BOOLEAN NOT NULL DEFAULT true,
  companion_reminders BOOLEAN NOT NULL DEFAULT true,
  sms_checkins BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();