CREATE TABLE public.chat_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  message_id UUID,
  kind TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  language TEXT,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chat_artifacts_kind_check CHECK (kind IN ('code','plan','letter','document','other'))
);

CREATE INDEX idx_chat_artifacts_user_member ON public.chat_artifacts (user_id, member_id, created_at DESC);
CREATE INDEX idx_chat_artifacts_message ON public.chat_artifacts (message_id);

ALTER TABLE public.chat_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own artifacts"
  ON public.chat_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own artifacts"
  ON public.chat_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artifacts"
  ON public.chat_artifacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artifacts"
  ON public.chat_artifacts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_chat_artifacts_updated_at
  BEFORE UPDATE ON public.chat_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_artifacts;