-- Create kid_goals table for child-friendly goal tracking
CREATE TABLE public.kid_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    portfolio_id UUID REFERENCES public.kid_portfolios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC(10,2),
    current_amount NUMERIC(10,2) DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'savings',
    emoji TEXT DEFAULT '🎯',
    status TEXT NOT NULL DEFAULT 'active',
    stars_reward INTEGER DEFAULT 1,
    is_template BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint for valid statuses
ALTER TABLE public.kid_goals 
ADD CONSTRAINT kid_goals_status_check 
CHECK (status IN ('active', 'completed', 'archived'));

-- Add constraint for valid categories
ALTER TABLE public.kid_goals 
ADD CONSTRAINT kid_goals_category_check 
CHECK (category IN ('savings', 'learning', 'trading', 'challenge'));

-- Enable RLS
ALTER TABLE public.kid_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own kid goals"
ON public.kid_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_kid_goals_user_id ON public.kid_goals(user_id);
CREATE INDEX idx_kid_goals_portfolio_id ON public.kid_goals(portfolio_id);
CREATE INDEX idx_kid_goals_status ON public.kid_goals(status);

-- Trigger for updated_at
CREATE TRIGGER update_kid_goals_updated_at
    BEFORE UPDATE ON public.kid_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();