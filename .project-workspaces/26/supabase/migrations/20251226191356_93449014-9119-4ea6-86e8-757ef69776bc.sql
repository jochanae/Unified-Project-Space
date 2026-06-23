-- Create table to track investment contributions (cost basis) for gain/loss calculation
CREATE TABLE public.account_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  contribution_type TEXT NOT NULL DEFAULT 'contribution', -- 'contribution', 'withdrawal', 'dividend', 'transfer_in', 'transfer_out'
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_account_contributions_user ON public.account_contributions(user_id);
CREATE INDEX idx_account_contributions_account ON public.account_contributions(account_id);
CREATE INDEX idx_account_contributions_date ON public.account_contributions(contribution_date);

-- Enable RLS
ALTER TABLE public.account_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own contributions"
  ON public.account_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contributions"
  ON public.account_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contributions"
  ON public.account_contributions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contributions"
  ON public.account_contributions FOR DELETE
  USING (auth.uid() = user_id);

-- Add total_contributions column to accounts table to cache the sum
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS total_contributions NUMERIC DEFAULT 0;

-- Function to update account's total_contributions when contributions change
CREATE OR REPLACE FUNCTION public.update_account_total_contributions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.accounts 
    SET total_contributions = COALESCE((
      SELECT SUM(CASE 
        WHEN contribution_type IN ('contribution', 'dividend', 'transfer_in') THEN amount 
        WHEN contribution_type IN ('withdrawal', 'transfer_out') THEN -amount 
        ELSE 0 
      END)
      FROM public.account_contributions 
      WHERE account_id = OLD.account_id
    ), 0)
    WHERE id = OLD.account_id;
    RETURN OLD;
  ELSE
    UPDATE public.accounts 
    SET total_contributions = COALESCE((
      SELECT SUM(CASE 
        WHEN contribution_type IN ('contribution', 'dividend', 'transfer_in') THEN amount 
        WHEN contribution_type IN ('withdrawal', 'transfer_out') THEN -amount 
        ELSE 0 
      END)
      FROM public.account_contributions 
      WHERE account_id = NEW.account_id
    ), 0)
    WHERE id = NEW.account_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to keep total_contributions in sync
CREATE TRIGGER update_contributions_total
  AFTER INSERT OR UPDATE OR DELETE ON public.account_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_total_contributions();