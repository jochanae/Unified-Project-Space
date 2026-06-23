-- Create kid portfolios table (separate from adult paper trading)
CREATE TABLE public.kid_portfolios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 1000,
    initial_balance NUMERIC NOT NULL DEFAULT 1000,
    total_stars_earned INTEGER NOT NULL DEFAULT 0,
    trades_completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kid trades table
CREATE TABLE public.kid_trades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    portfolio_id UUID NOT NULL REFERENCES public.kid_portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    company_name TEXT,
    trade_type TEXT NOT NULL DEFAULT 'buy',
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL,
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    exit_date TIMESTAMP WITH TIME ZONE,
    profit_loss NUMERIC,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    emoji TEXT DEFAULT '🎯',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kid_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kid_trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for kid_portfolios
CREATE POLICY "Users can manage their own kid portfolios"
ON public.kid_portfolios
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for kid_trades
CREATE POLICY "Users can manage their own kid trades"
ON public.kid_trades
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_kid_portfolios_updated_at
BEFORE UPDATE ON public.kid_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kid_trades_updated_at
BEFORE UPDATE ON public.kid_trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();