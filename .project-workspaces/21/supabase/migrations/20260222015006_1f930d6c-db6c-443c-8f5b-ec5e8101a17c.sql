
-- Profiles table (source of truth for user data)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  username TEXT,
  vibe TEXT,
  companion_name TEXT NOT NULL DEFAULT 'Ted',
  companion_gender TEXT NOT NULL DEFAULT 'neutral',
  phone_number TEXT,
  sms_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Connections table
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  name TEXT NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message TEXT,
  UNIQUE(user_id, member_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
  ON public.connections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON public.connections FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE USING (auth.uid() = user_id);

-- Memories table
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'emotional', 'wellness')),
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories"
  ON public.memories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON public.memories FOR DELETE USING (auth.uid() = user_id);

-- Add user_id to sms_profiles for linking
ALTER TABLE public.sms_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
