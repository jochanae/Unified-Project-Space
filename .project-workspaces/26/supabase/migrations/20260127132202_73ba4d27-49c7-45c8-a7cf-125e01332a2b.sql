-- Create table for user payment methods (Stripe cards and Plaid bank accounts for autopay)
CREATE TABLE public.user_autopay_methods (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method_type TEXT NOT NULL CHECK (method_type IN ('stripe_card', 'plaid_ach')),
    stripe_payment_method_id TEXT,
    stripe_customer_id TEXT,
    plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE SET NULL,
    plaid_processor_token TEXT,
    plaid_account_id TEXT,
    display_name TEXT NOT NULL,
    last_four TEXT,
    brand TEXT,
    bank_name TEXT,
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scheduled autopay entries
CREATE TABLE public.scheduled_autopay (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES public.user_autopay_methods(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    stripe_payment_intent_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for autopay execution history
CREATE TABLE public.autopay_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES public.user_autopay_methods(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_autopay_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_autopay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopay_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_autopay_methods
CREATE POLICY "Users can view their own autopay methods"
    ON public.user_autopay_methods FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own autopay methods"
    ON public.user_autopay_methods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own autopay methods"
    ON public.user_autopay_methods FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own autopay methods"
    ON public.user_autopay_methods FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for scheduled_autopay
CREATE POLICY "Users can view their own scheduled autopay"
    ON public.scheduled_autopay FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled autopay"
    ON public.scheduled_autopay FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled autopay"
    ON public.scheduled_autopay FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled autopay"
    ON public.scheduled_autopay FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for autopay_history
CREATE POLICY "Users can view their own autopay history"
    ON public.autopay_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own autopay history"
    ON public.autopay_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_autopay_methods_user_id ON public.user_autopay_methods(user_id);
CREATE INDEX idx_scheduled_autopay_user_id ON public.scheduled_autopay(user_id);
CREATE INDEX idx_scheduled_autopay_bill_id ON public.scheduled_autopay(bill_id);
CREATE INDEX idx_scheduled_autopay_scheduled_date ON public.scheduled_autopay(scheduled_date);
CREATE INDEX idx_scheduled_autopay_status ON public.scheduled_autopay(status);
CREATE INDEX idx_autopay_history_user_id ON public.autopay_history(user_id);
CREATE INDEX idx_autopay_history_bill_id ON public.autopay_history(bill_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_autopay_methods_updated_at
    BEFORE UPDATE ON public.user_autopay_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_autopay_updated_at
    BEFORE UPDATE ON public.scheduled_autopay
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();