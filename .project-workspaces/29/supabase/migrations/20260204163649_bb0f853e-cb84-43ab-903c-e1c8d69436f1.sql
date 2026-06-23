-- Create table for live streams (YouTube/Twitch links shared by users)
CREATE TABLE public.live_streams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    stream_url TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'youtube', -- 'youtube', 'twitch', 'other'
    thumbnail_url TEXT,
    is_live BOOLEAN NOT NULL DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    viewers_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Anyone can view live streams
CREATE POLICY "Anyone can view live streams"
ON public.live_streams FOR SELECT
USING (true);

-- Authenticated users can create streams
CREATE POLICY "Authenticated users can create streams"
ON public.live_streams FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own streams
CREATE POLICY "Users can update their own streams"
ON public.live_streams FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own streams
CREATE POLICY "Users can delete their own streams"
ON public.live_streams FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_live_streams_updated_at
    BEFORE UPDATE ON public.live_streams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for community settings (Discord link, etc.)
CREATE TABLE public.community_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read community settings
CREATE POLICY "Anyone can read community settings"
ON public.community_settings FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage community settings"
ON public.community_settings FOR ALL
USING (is_admin(auth.uid()));

-- Insert default Discord invite placeholder
INSERT INTO public.community_settings (key, value, description)
VALUES ('discord_invite_url', '', 'Discord server invite URL for the trading community');

-- Enable realtime for live_streams
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;