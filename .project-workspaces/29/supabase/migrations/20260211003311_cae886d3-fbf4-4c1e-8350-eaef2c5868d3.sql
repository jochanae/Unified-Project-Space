
-- 1. Add new columns to paper_trades for multi-asset support and order management
ALTER TABLE public.paper_trades
  ADD COLUMN IF NOT EXISTS asset_class text NOT NULL DEFAULT 'equity',
  ADD COLUMN IF NOT EXISTS stop_loss numeric NULL,
  ADD COLUMN IF NOT EXISTS take_profit numeric NULL,
  ADD COLUMN IF NOT EXISTS strike_price numeric NULL,
  ADD COLUMN IF NOT EXISTS expiration_date date NULL,
  ADD COLUMN IF NOT EXISTS option_type text NULL,
  ADD COLUMN IF NOT EXISTS contract_size integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_currency text NULL,
  ADD COLUMN IF NOT EXISTS quote_currency text NULL;

-- 2. Create paper_portfolio_snapshots for equity curve tracking
CREATE TABLE public.paper_portfolio_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  portfolio_id uuid NOT NULL REFERENCES public.paper_portfolios(id) ON DELETE CASCADE,
  balance numeric NOT NULL,
  open_position_value numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, snapshot_date)
);

ALTER TABLE public.paper_portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own portfolio snapshots"
  ON public.paper_portfolio_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Create paper_orders for pending stop-loss/take-profit orders
CREATE TABLE public.paper_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  portfolio_id uuid NOT NULL REFERENCES public.paper_portfolios(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES public.paper_trades(id) ON DELETE CASCADE,
  order_type text NOT NULL, -- 'stop_loss', 'take_profit'
  trigger_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'triggered', 'cancelled'
  triggered_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own paper orders"
  ON public.paper_orders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Add index for faster trade history queries
CREATE INDEX IF NOT EXISTS idx_paper_trades_user_status ON public.paper_trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_asset_class ON public.paper_trades(asset_class);
CREATE INDEX IF NOT EXISTS idx_paper_orders_status ON public.paper_orders(status);
CREATE INDEX IF NOT EXISTS idx_paper_portfolio_snapshots_date ON public.paper_portfolio_snapshots(portfolio_id, snapshot_date);

-- 5. Add updated_at trigger for paper_orders
CREATE TRIGGER update_paper_orders_updated_at
  BEFORE UPDATE ON public.paper_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
