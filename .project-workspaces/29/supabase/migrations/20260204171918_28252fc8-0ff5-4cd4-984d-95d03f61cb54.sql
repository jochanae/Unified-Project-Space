-- Add display preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_real_name boolean DEFAULT true;

-- Update family testers to show username only
UPDATE public.profiles 
SET show_real_name = false
WHERE email IN ('jochanae@gmail.com', 'javonsutton@gmail.com', 'mauricelcalhoun@gmail.com', 'demo@intoiq.com');

-- Create scheduled posts table for admins
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('trade_idea', 'discussion', 'chat_message')),
  title text,
  content text NOT NULL,
  -- Trade idea specific fields
  symbol text,
  trade_direction text,
  asset_class text,
  entry_price numeric,
  target_price numeric,
  stop_loss numeric,
  -- Discussion specific fields
  category text,
  tags text[],
  -- Chat specific
  room_id uuid,
  -- Scheduling
  scheduled_for timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  published_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create discussion prompts table for automated topics
CREATE TABLE public.discussion_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week integer, -- 0-6 for weekly (0=Sunday)
  day_of_month integer, -- 1-31 for monthly
  time_of_day time DEFAULT '09:00:00',
  last_posted_at timestamp with time zone,
  next_post_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create bot replies configuration
CREATE TABLE public.bot_reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('quiet_thread', 'new_user_post', 'keywords', 'scheduled')),
  trigger_keywords text[],
  reply_templates text[] NOT NULL, -- Array of possible replies, picks randomly
  min_hours_quiet integer DEFAULT 24, -- For quiet_thread trigger
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_reply_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage scheduled posts" 
ON public.scheduled_posts FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage discussion prompts" 
ON public.discussion_prompts FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage bot templates" 
ON public.bot_reply_templates FOR ALL USING (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status, scheduled_for);
CREATE INDEX idx_discussion_prompts_next ON public.discussion_prompts(is_active, next_post_at);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_prompts_updated_at
  BEFORE UPDATE ON public.discussion_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();