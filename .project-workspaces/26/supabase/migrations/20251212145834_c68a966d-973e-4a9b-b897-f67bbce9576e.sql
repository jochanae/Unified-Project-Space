-- Create inspirational quotes table
CREATE TABLE public.inspirational_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote likes table for tracking user favorites
CREATE TABLE public.quote_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.inspirational_quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quote_id, user_id)
);

-- Enable RLS
ALTER TABLE public.inspirational_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for inspirational_quotes
CREATE POLICY "Anyone can view active quotes"
ON public.inspirational_quotes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage quotes"
ON public.inspirational_quotes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for quote_likes
CREATE POLICY "Users can view their own likes"
ON public.quote_likes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can like quotes"
ON public.quote_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike quotes"
ON public.quote_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Insert default quotes
INSERT INTO public.inspirational_quotes (content) VALUES
  ('Start your day with smart financial choices!'),
  ('Every dollar saved is a step toward freedom!'),
  ('Your financial future is in your hands!'),
  ('Small steps lead to big financial wins!'),
  ('Stay focused on your goals!'),
  ('Tomorrow brings new opportunities to prosper!'),
  ('Build wealth one decision at a time!'),
  ('Financial peace is worth every effort!'),
  ('Invest in yourself, it pays the best interest!'),
  ('A budget is telling your money where to go!');