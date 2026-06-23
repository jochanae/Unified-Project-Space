
-- Bloom Coach Conversations
CREATE TABLE public.bloom_coach_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  category TEXT NOT NULL DEFAULT 'coach',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bloom_coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.bloom_coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.bloom_coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.bloom_coach_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.bloom_coach_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_bloom_coach_conversations_updated_at
  BEFORE UPDATE ON public.bloom_coach_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bloom Coach Messages
CREATE TABLE public.bloom_coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.bloom_coach_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bloom_coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.bloom_coach_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON public.bloom_coach_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.bloom_coach_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_bloom_coach_messages_conversation ON public.bloom_coach_messages(conversation_id);

-- Bloom Coach Feedback
CREATE TABLE public.bloom_coach_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.bloom_coach_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.bloom_coach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON public.bloom_coach_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback"
  ON public.bloom_coach_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON public.bloom_coach_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
  ON public.bloom_coach_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Bloom Coach Saved Notes
CREATE TABLE public.bloom_coach_saved_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.bloom_coach_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.bloom_coach_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bloom_coach_saved_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved notes"
  ON public.bloom_coach_saved_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved notes"
  ON public.bloom_coach_saved_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved notes"
  ON public.bloom_coach_saved_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved notes"
  ON public.bloom_coach_saved_notes FOR DELETE
  USING (auth.uid() = user_id);
