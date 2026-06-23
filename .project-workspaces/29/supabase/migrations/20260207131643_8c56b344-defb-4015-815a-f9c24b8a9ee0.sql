
-- Create net worth items table for manual asset/liability tracking
CREATE TABLE public.net_worth_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'asset', -- 'asset' or 'liability'
  category TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_auto_synced BOOLEAN NOT NULL DEFAULT false,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_frequency TEXT DEFAULT 'quarterly', -- 'monthly', 'quarterly', 'semi_annual', 'annual'
  next_review_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.net_worth_items ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own entries
CREATE POLICY "Users can manage their own net worth items"
  ON public.net_worth_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX idx_net_worth_items_user_id ON public.net_worth_items(user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_net_worth_items_updated_at
  BEFORE UPDATE ON public.net_worth_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
