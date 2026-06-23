-- Selah Companion chat persistence
CREATE TABLE IF NOT EXISTS public.selah_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_selah_chat_messages_user_created
  ON public.selah_chat_messages (user_id, created_at);

ALTER TABLE public.selah_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own selah chat messages"
  ON public.selah_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own selah chat messages"
  ON public.selah_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own selah chat messages"
  ON public.selah_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);