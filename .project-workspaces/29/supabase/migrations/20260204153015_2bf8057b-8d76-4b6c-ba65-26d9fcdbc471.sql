-- Create function to create default plans and sections for new users
CREATE OR REPLACE FUNCTION public.create_default_plans_and_sections()
RETURNS TRIGGER AS $$
DECLARE
    overall_plan_id UUID;
    trading_plan_id UUID;
BEGIN
    -- Create "Overall Plan" (default)
    INSERT INTO public.plans (user_id, name, description, icon, color, is_default, sort_order)
    VALUES (NEW.user_id, 'Overall Plan', 'Your big-picture financial roadmap', 'target', 'primary', true, 0)
    RETURNING id INTO overall_plan_id;
    
    -- Create "Trading Plan"
    INSERT INTO public.plans (user_id, name, description, icon, color, is_default, sort_order)
    VALUES (NEW.user_id, 'Trading Plan', 'Rules, strategies, and setups for active trading', 'trending-up', 'chart-3', false, 1)
    RETURNING id INTO trading_plan_id;
    
    -- Create sections for Overall Plan
    INSERT INTO public.plan_sections (user_id, plan_id, name, icon, color, sort_order, is_default)
    VALUES 
        (NEW.user_id, overall_plan_id, 'Foundations', 'shield', 'emerald', 0, true),
        (NEW.user_id, overall_plan_id, 'Wealth Building', 'trending-up', 'blue', 1, true),
        (NEW.user_id, overall_plan_id, 'Protection', 'shield-check', 'amber', 2, true);
    
    -- Create sections for Trading Plan
    INSERT INTO public.plan_sections (user_id, plan_id, name, icon, color, sort_order, is_default)
    VALUES 
        (NEW.user_id, trading_plan_id, 'Entry Rules', 'log-in', 'gain', 0, true),
        (NEW.user_id, trading_plan_id, 'Exit Rules', 'log-out', 'loss', 1, true),
        (NEW.user_id, trading_plan_id, 'Risk Management', 'alert-triangle', 'amber', 2, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new trigger for default plans and sections
CREATE TRIGGER on_profile_created_create_plans
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_plans_and_sections();