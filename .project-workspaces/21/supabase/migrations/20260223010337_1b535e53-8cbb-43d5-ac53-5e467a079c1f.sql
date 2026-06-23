
-- Create Cami-specific memories table (separate from companion memories)
CREATE TABLE public.cami_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'matchmaking',
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cami_memories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own Cami memories"
  ON public.cami_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Cami memories"
  ON public.cami_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Cami memories"
  ON public.cami_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX idx_cami_memories_user_id ON public.cami_memories (user_id);
