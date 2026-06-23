-- Phase 2: Core Features Migration

-- 1. Add recurrence pattern to transactions for recurring transaction automation
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS recurrence_pattern text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_recurrence_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid DEFAULT NULL REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Create index for recurring transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence ON public.transactions(user_id, is_recurring, next_recurrence_date) WHERE is_recurring = true;

-- 2. Create budget_alert_settings table to persist user alert preferences
CREATE TABLE IF NOT EXISTS public.budget_alert_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  threshold_75 boolean NOT NULL DEFAULT true,
  threshold_90 boolean NOT NULL DEFAULT true,
  threshold_100 boolean NOT NULL DEFAULT true,
  custom_threshold integer DEFAULT 50,
  custom_enabled boolean NOT NULL DEFAULT false,
  email_notifications boolean NOT NULL DEFAULT false,
  push_notifications boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_alert_settings UNIQUE (user_id)
);

-- Enable RLS on budget_alert_settings
ALTER TABLE public.budget_alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_alert_settings
CREATE POLICY "Users can view their own alert settings" 
ON public.budget_alert_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert settings" 
ON public.budget_alert_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings" 
ON public.budget_alert_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. Create budget_alerts table to store triggered alerts
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'warning', 'critical', 'over', 'custom'
  threshold_percent integer NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on budget_alerts
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_alerts
CREATE POLICY "Users can view their own alerts" 
ON public.budget_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
ON public.budget_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert alerts for users"
ON public.budget_alerts
FOR INSERT
WITH CHECK (true);

-- Index for fetching unread alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_unread ON public.budget_alerts(user_id, is_read, is_dismissed) WHERE is_read = false AND is_dismissed = false;

-- Trigger for updated_at on budget_alert_settings
CREATE TRIGGER update_budget_alert_settings_updated_at
BEFORE UPDATE ON public.budget_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check and create budget alerts
CREATE OR REPLACE FUNCTION public.check_budget_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_percent numeric;
  v_alert_type text;
  v_threshold integer;
  v_message text;
  v_budget record;
BEGIN
  -- Get the budget
  SELECT * INTO v_budget FROM public.budgets WHERE id = NEW.budget_id;
  IF v_budget IS NULL THEN RETURN NEW; END IF;
  
  -- Calculate current percentage
  v_percent := CASE WHEN v_budget.amount > 0 THEN ((v_budget.spent + NEW.amount) / v_budget.amount) * 100 ELSE 0 END;
  
  -- Get user's alert settings
  SELECT * INTO v_settings FROM public.budget_alert_settings WHERE user_id = v_budget.user_id;
  IF v_settings IS NULL OR NOT v_settings.enabled THEN RETURN NEW; END IF;
  
  -- Check thresholds and create alerts
  IF v_settings.threshold_100 AND v_percent >= 100 THEN
    v_alert_type := 'over';
    v_threshold := 100;
    v_message := 'You have exceeded your ' || v_budget.name || ' budget!';
  ELSIF v_settings.threshold_90 AND v_percent >= 90 AND v_percent < 100 THEN
    v_alert_type := 'critical';
    v_threshold := 90;
    v_message := 'Warning: ' || v_budget.name || ' budget is at ' || round(v_percent) || '%';
  ELSIF v_settings.threshold_75 AND v_percent >= 75 AND v_percent < 90 THEN
    v_alert_type := 'warning';
    v_threshold := 75;
    v_message := v_budget.name || ' budget is at ' || round(v_percent) || '%. Consider slowing down.';
  ELSIF v_settings.custom_enabled AND v_percent >= v_settings.custom_threshold THEN
    v_alert_type := 'custom';
    v_threshold := v_settings.custom_threshold;
    v_message := v_budget.name || ' budget has reached ' || round(v_percent) || '%';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Insert alert if it doesn't already exist for this threshold today
  INSERT INTO public.budget_alerts (user_id, budget_id, alert_type, threshold_percent, message)
  SELECT v_budget.user_id, v_budget.id, v_alert_type, v_threshold, v_message
  WHERE NOT EXISTS (
    SELECT 1 FROM public.budget_alerts 
    WHERE budget_id = v_budget.id 
      AND alert_type = v_alert_type 
      AND created_at > now() - interval '1 day'
  );
  
  RETURN NEW;
END;
$$;