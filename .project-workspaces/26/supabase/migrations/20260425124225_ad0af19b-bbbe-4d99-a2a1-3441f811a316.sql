-- Quinn Blueprint Cards: visual strategic artifacts emitted by Quinn during conversation
CREATE TABLE public.quinn_blueprint_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  conversation_id UUID REFERENCES public.bloom_coach_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.bloom_coach_messages(id) ON DELETE SET NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('blueprint_proposal', 'strategy_comparison', 'tax_alert', 'risk_assessment', 'insight')),
  title TEXT NOT NULL,
  callout TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  mode_lens TEXT CHECK (mode_lens IN ('focus', 'brainstorm', 'planner', 'audit', 'strategic')),
  promoted_to_plan_id UUID REFERENCES public.bloom_financial_plans(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quinn_blueprint_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blueprint cards"
  ON public.quinn_blueprint_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blueprint cards"
  ON public.quinn_blueprint_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blueprint cards"
  ON public.quinn_blueprint_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blueprint cards"
  ON public.quinn_blueprint_cards FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_quinn_blueprint_cards_user_pinned
  ON public.quinn_blueprint_cards (user_id, pinned, created_at DESC)
  WHERE archived = false;

CREATE INDEX idx_quinn_blueprint_cards_user_project
  ON public.quinn_blueprint_cards (user_id, project_id, created_at DESC)
  WHERE archived = false;

CREATE TRIGGER update_quinn_blueprint_cards_updated_at
  BEFORE UPDATE ON public.quinn_blueprint_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();