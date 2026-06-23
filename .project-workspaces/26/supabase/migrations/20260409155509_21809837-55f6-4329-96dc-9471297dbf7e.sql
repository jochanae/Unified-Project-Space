-- Create bloom_advice_history table for advice continuity
CREATE TABLE public.bloom_advice_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  conclusion TEXT NOT NULL,
  conditions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX idx_bloom_advice_history_user_id ON public.bloom_advice_history(user_id);
CREATE INDEX idx_bloom_advice_history_topic ON public.bloom_advice_history(user_id, topic);

-- Enable RLS
ALTER TABLE public.bloom_advice_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own advice history"
ON public.bloom_advice_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own advice history"
ON public.bloom_advice_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own advice history"
ON public.bloom_advice_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advice history"
ON public.bloom_advice_history FOR DELETE
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_bloom_advice_history_updated_at
BEFORE UPDATE ON public.bloom_advice_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();