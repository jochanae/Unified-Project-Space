
-- Create user_usage table to track monthly AI conversation counts
CREATE TABLE public.user_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM (e.g., '2026-02')
  conversations_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
  ON public.user_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage (edge function uses service role, but just in case)
CREATE POLICY "Users can insert their own usage"
  ON public.user_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update their own usage"
  ON public.user_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all usage"
  ON public.user_usage
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Create index for fast lookups
CREATE INDEX idx_user_usage_user_month ON public.user_usage (user_id, month);

-- Add updated_at trigger
CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
