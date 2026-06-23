
-- =============================================
-- BLOOM FINANCIAL PLANS (main plan header)
-- =============================================
CREATE TABLE public.bloom_financial_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  target_amount NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  target_date DATE,
  linked_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.bloom_coach_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bloom_financial_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON public.bloom_financial_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own plans" ON public.bloom_financial_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.bloom_financial_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.bloom_financial_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bloom_financial_plans_updated_at
  BEFORE UPDATE ON public.bloom_financial_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BLOOM PLAN MILESTONES (phases within a plan)
-- =============================================
CREATE TABLE public.bloom_plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.bloom_financial_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  target_date DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bloom_plan_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones" ON public.bloom_plan_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own milestones" ON public.bloom_plan_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones" ON public.bloom_plan_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own milestones" ON public.bloom_plan_milestones FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bloom_plan_milestones_updated_at
  BEFORE UPDATE ON public.bloom_plan_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BLOOM PLAN ACTIONS (individual tasks)
-- =============================================
CREATE TABLE public.bloom_plan_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.bloom_plan_milestones(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.bloom_financial_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  frequency TEXT DEFAULT 'one-time',
  due_date DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  linked_debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL,
  linked_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bloom_plan_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions" ON public.bloom_plan_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own actions" ON public.bloom_plan_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actions" ON public.bloom_plan_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actions" ON public.bloom_plan_actions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bloom_plan_actions_updated_at
  BEFORE UPDATE ON public.bloom_plan_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_bloom_financial_plans_user ON public.bloom_financial_plans(user_id);
CREATE INDEX idx_bloom_plan_milestones_plan ON public.bloom_plan_milestones(plan_id);
CREATE INDEX idx_bloom_plan_actions_milestone ON public.bloom_plan_actions(milestone_id);
CREATE INDEX idx_bloom_plan_actions_plan ON public.bloom_plan_actions(plan_id);
