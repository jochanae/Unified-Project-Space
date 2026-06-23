-- Create bloom_bursts table for temporary spending limits
CREATE TABLE public.bloom_bursts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  limit_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bloom_bursts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bloom bursts"
ON public.bloom_bursts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bloom bursts"
ON public.bloom_bursts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bloom bursts"
ON public.bloom_bursts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bloom bursts"
ON public.bloom_bursts FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_bloom_bursts_updated_at
BEFORE UPDATE ON public.bloom_bursts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for credit_scores
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_scores;