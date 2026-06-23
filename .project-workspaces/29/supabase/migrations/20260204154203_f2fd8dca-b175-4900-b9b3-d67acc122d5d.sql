-- Create plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'target',
    color TEXT DEFAULT 'primary',
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on plans table
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for plans
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Users can manage their own plans'
    ) THEN
        CREATE POLICY "Users can manage their own plans"
        ON public.plans
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Add plan_id column to plan_sections if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'plan_sections' 
        AND column_name = 'plan_id'
    ) THEN
        ALTER TABLE public.plan_sections ADD COLUMN plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_sections_plan_id ON public.plan_sections(plan_id);

-- Update timestamp trigger for plans
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: Create default plans for existing users who don't have any plans
DO $$
DECLARE
    user_record RECORD;
    overall_plan_id UUID;
    trading_plan_id UUID;
BEGIN
    -- Loop through all users who have a profile but no plans
    FOR user_record IN 
        SELECT DISTINCT p.user_id 
        FROM public.profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.plans pl WHERE pl.user_id = p.user_id
        )
    LOOP
        -- Create "Overall Plan" (default)
        INSERT INTO public.plans (user_id, name, description, icon, color, is_default, sort_order)
        VALUES (user_record.user_id, 'Overall Plan', 'Your big-picture financial roadmap', 'target', 'primary', true, 0)
        RETURNING id INTO overall_plan_id;
        
        -- Create "Trading Plan"
        INSERT INTO public.plans (user_id, name, description, icon, color, is_default, sort_order)
        VALUES (user_record.user_id, 'Trading Plan', 'Rules, strategies, and setups for active trading', 'trending-up', 'chart-3', false, 1)
        RETURNING id INTO trading_plan_id;
        
        -- Create sections for Overall Plan
        INSERT INTO public.plan_sections (user_id, plan_id, name, icon, color, sort_order, is_default)
        VALUES 
            (user_record.user_id, overall_plan_id, 'Foundations', 'shield', 'emerald', 0, true),
            (user_record.user_id, overall_plan_id, 'Wealth Building', 'trending-up', 'blue', 1, true),
            (user_record.user_id, overall_plan_id, 'Protection', 'shield-check', 'amber', 2, true);
        
        -- Create sections for Trading Plan
        INSERT INTO public.plan_sections (user_id, plan_id, name, icon, color, sort_order, is_default)
        VALUES 
            (user_record.user_id, trading_plan_id, 'Entry Rules', 'log-in', 'gain', 0, true),
            (user_record.user_id, trading_plan_id, 'Exit Rules', 'log-out', 'loss', 1, true),
            (user_record.user_id, trading_plan_id, 'Risk Management', 'alert-triangle', 'amber', 2, true);
    END LOOP;
END $$;

-- Update any orphaned sections (sections without a plan_id) to belong to the user's default plan
UPDATE public.plan_sections ps
SET plan_id = (
    SELECT id FROM public.plans p 
    WHERE p.user_id = ps.user_id AND p.is_default = true 
    LIMIT 1
)
WHERE ps.plan_id IS NULL;