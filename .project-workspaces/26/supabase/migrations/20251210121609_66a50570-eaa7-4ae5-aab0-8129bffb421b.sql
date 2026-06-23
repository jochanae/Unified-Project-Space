-- Create table for balance history/snapshots
CREATE TABLE public.account_balance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate snapshots per day
CREATE UNIQUE INDEX idx_balance_history_unique ON public.account_balance_history(account_id, snapshot_date);

-- Create index for faster queries
CREATE INDEX idx_balance_history_user_date ON public.account_balance_history(user_id, snapshot_date);

-- Enable RLS
ALTER TABLE public.account_balance_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own balance history"
  ON public.account_balance_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance history"
  ON public.account_balance_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create table for Plaid items (linked institutions)
CREATE TABLE public.plaid_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plaid_item_id TEXT NOT NULL UNIQUE,
  plaid_access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for plaid_items
CREATE POLICY "Users can view their own plaid items"
  ON public.plaid_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plaid items"
  ON public.plaid_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plaid items"
  ON public.plaid_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plaid items"
  ON public.plaid_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on plaid_items
CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON public.plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to record daily balance snapshot for an account
CREATE OR REPLACE FUNCTION public.record_balance_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.account_balance_history (user_id, account_id, balance, snapshot_date)
  VALUES (NEW.user_id, NEW.id, NEW.balance, CURRENT_DATE)
  ON CONFLICT (account_id, snapshot_date) 
  DO UPDATE SET balance = EXCLUDED.balance;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to record snapshot on account balance change
CREATE TRIGGER record_account_balance_snapshot
  AFTER INSERT OR UPDATE OF balance ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.record_balance_snapshot();