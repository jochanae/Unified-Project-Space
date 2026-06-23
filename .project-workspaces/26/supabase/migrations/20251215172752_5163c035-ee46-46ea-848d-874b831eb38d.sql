-- Enable realtime for family_chat_messages table
ALTER TABLE public.family_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_chat_messages;