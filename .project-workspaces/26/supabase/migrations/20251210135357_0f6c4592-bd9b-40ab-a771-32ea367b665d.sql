-- Create vision_boards table
CREATE TABLE public.vision_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Vision Board',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vision_board_items table
CREATE TABLE public.vision_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.vision_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  image_alt TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 0,
  target_amount NUMERIC,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  size TEXT NOT NULL DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  affirmation TEXT,
  audio_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vision_board_snapshots table
CREATE TABLE public.vision_board_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.vision_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_board_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for vision_boards
CREATE POLICY "Users can view their own vision boards" ON public.vision_boards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vision boards" ON public.vision_boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vision boards" ON public.vision_boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vision boards" ON public.vision_boards FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for vision_board_items
CREATE POLICY "Users can view their own vision board items" ON public.vision_board_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vision board items" ON public.vision_board_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vision board items" ON public.vision_board_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vision board items" ON public.vision_board_items FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for vision_board_snapshots
CREATE POLICY "Users can view their own snapshots" ON public.vision_board_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own snapshots" ON public.vision_board_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snapshots" ON public.vision_board_snapshots FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_vision_boards_updated_at BEFORE UPDATE ON public.vision_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vision_board_items_updated_at BEFORE UPDATE ON public.vision_board_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();