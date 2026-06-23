-- Create table for user API tokens (for IFTTT/smart speaker integration)
CREATE TABLE public.user_api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Smart Speaker Token',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster token lookups
CREATE INDEX idx_user_api_tokens_token ON public.user_api_tokens (token) WHERE is_active = true;
CREATE INDEX idx_user_api_tokens_user_id ON public.user_api_tokens (user_id);

-- Enable Row Level Security
ALTER TABLE public.user_api_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own tokens
CREATE POLICY "Users can view their own tokens" 
ON public.user_api_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own tokens
CREATE POLICY "Users can create their own tokens" 
ON public.user_api_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own tokens" 
ON public.user_api_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own tokens" 
ON public.user_api_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_api_tokens_updated_at
BEFORE UPDATE ON public.user_api_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();