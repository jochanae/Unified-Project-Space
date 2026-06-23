-- Create price_alerts table for tracking user price targets
CREATE TABLE public.price_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    target_price NUMERIC NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
    is_triggered BOOLEAN NOT NULL DEFAULT false,
    triggered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own alerts
CREATE POLICY "Users can manage their own price alerts"
ON public.price_alerts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_price_alerts_updated_at
BEFORE UPDATE ON public.price_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_price_alerts_user_symbol ON public.price_alerts(user_id, symbol);
CREATE INDEX idx_price_alerts_active ON public.price_alerts(user_id, is_triggered) WHERE is_triggered = false;