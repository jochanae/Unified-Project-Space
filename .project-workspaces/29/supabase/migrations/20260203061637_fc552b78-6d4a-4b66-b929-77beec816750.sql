-- ============================================
-- COMMUNITY ECOSYSTEM DATABASE SCHEMA
-- ============================================

-- 1. TRADE IDEAS FEED
-- Posts where users share trade setups with charts
CREATE TABLE public.trade_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    trade_direction TEXT NOT NULL CHECK (trade_direction IN ('long', 'short', 'neutral')),
    asset_class TEXT NOT NULL DEFAULT 'stocks' CHECK (asset_class IN ('stocks', 'options', 'crypto', 'forex', 'futures', 'etfs')),
    entry_price NUMERIC,
    target_price NUMERIC,
    stop_loss NUMERIC,
    chart_image_url TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'flagged')),
    outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven', NULL)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trade idea likes
CREATE TABLE public.trade_idea_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_idea_id UUID NOT NULL REFERENCES public.trade_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trade_idea_id, user_id)
);

-- Trade idea comments
CREATE TABLE public.trade_idea_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_idea_id UUID NOT NULL REFERENCES public.trade_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.trade_idea_comments(id) ON DELETE CASCADE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. STRATEGY DISCUSSIONS (Forum-style)
CREATE TABLE public.discussion_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'strategies', 'analysis', 'education', 'beginners')),
    tags TEXT[] DEFAULT '{}',
    views_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discussion replies
CREATE TABLE public.discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_solution BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. LIVE CHAT ROOMS
CREATE TABLE public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    asset_class TEXT CHECK (asset_class IN ('stocks', 'options', 'crypto', 'forex', 'futures', 'general')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SOCIAL TRADING (Follow system)
CREATE TABLE public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notify_on_trade BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- User trading stats (for leaderboard/reputation)
CREATE TABLE public.user_trading_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_ideas_shared INTEGER NOT NULL DEFAULT 0,
    successful_ideas INTEGER NOT NULL DEFAULT 0,
    win_rate NUMERIC DEFAULT 0,
    followers_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    reputation_score INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MODERATION & REPORTING
CREATE TABLE public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('trade_idea', 'comment', 'thread', 'reply', 'chat_message')),
    content_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'other')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.trade_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_idea_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trading_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Trade Ideas: Everyone can view, authenticated can create/edit own
CREATE POLICY "Anyone can view active trade ideas" ON public.trade_ideas
    FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create trade ideas" ON public.trade_ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade ideas" ON public.trade_ideas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade ideas" ON public.trade_ideas
    FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Trade Idea Likes
CREATE POLICY "Anyone can view likes" ON public.trade_idea_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.trade_idea_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes" ON public.trade_idea_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Trade Idea Comments
CREATE POLICY "Anyone can view comments" ON public.trade_idea_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.trade_idea_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.trade_idea_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.trade_idea_comments
    FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Discussion Threads
CREATE POLICY "Anyone can view threads" ON public.discussion_threads
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON public.discussion_threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads" ON public.discussion_threads
    FOR UPDATE USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own threads" ON public.discussion_threads
    FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Discussion Replies
CREATE POLICY "Anyone can view replies" ON public.discussion_replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can reply" ON public.discussion_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" ON public.discussion_replies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON public.discussion_replies
    FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Chat Rooms: Everyone can view
CREATE POLICY "Anyone can view chat rooms" ON public.chat_rooms
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage chat rooms" ON public.chat_rooms
    FOR ALL USING (is_admin(auth.uid()));

-- Chat Messages
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their messages" ON public.chat_messages
    FOR UPDATE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- User Follows
CREATE POLICY "Anyone can view follows" ON public.user_follows
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- User Trading Stats
CREATE POLICY "Anyone can view trading stats" ON public.user_trading_stats
    FOR SELECT USING (true);

CREATE POLICY "System can manage trading stats" ON public.user_trading_stats
    FOR ALL USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Content Reports
CREATE POLICY "Authenticated users can report" ON public.content_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.content_reports
    FOR SELECT USING (auth.uid() = reporter_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage reports" ON public.content_reports
    FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- TRIGGERS FOR COUNTS
-- ============================================

-- Update likes count on trade ideas
CREATE OR REPLACE FUNCTION public.update_trade_idea_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.trade_ideas SET likes_count = likes_count + 1 WHERE id = NEW.trade_idea_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.trade_ideas SET likes_count = likes_count - 1 WHERE id = OLD.trade_idea_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trade_idea_likes_trigger
AFTER INSERT OR DELETE ON public.trade_idea_likes
FOR EACH ROW EXECUTE FUNCTION public.update_trade_idea_likes_count();

-- Update comments count on trade ideas
CREATE OR REPLACE FUNCTION public.update_trade_idea_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.trade_ideas SET comments_count = comments_count + 1 WHERE id = NEW.trade_idea_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.trade_ideas SET comments_count = comments_count - 1 WHERE id = OLD.trade_idea_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trade_idea_comments_trigger
AFTER INSERT OR DELETE ON public.trade_idea_comments
FOR EACH ROW EXECUTE FUNCTION public.update_trade_idea_comments_count();

-- Update follower/following counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.user_trading_stats (user_id, following_count) VALUES (NEW.follower_id, 1)
            ON CONFLICT (user_id) DO UPDATE SET following_count = user_trading_stats.following_count + 1;
        INSERT INTO public.user_trading_stats (user_id, followers_count) VALUES (NEW.following_id, 1)
            ON CONFLICT (user_id) DO UPDATE SET followers_count = user_trading_stats.followers_count + 1;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.user_trading_stats SET following_count = following_count - 1 WHERE user_id = OLD.follower_id;
        UPDATE public.user_trading_stats SET followers_count = followers_count - 1 WHERE user_id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER follow_counts_trigger
AFTER INSERT OR DELETE ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- ============================================
-- SEED DEFAULT CHAT ROOMS
-- ============================================
INSERT INTO public.chat_rooms (name, description, asset_class) VALUES
    ('General Trading', 'General trading discussion and market talk', 'general'),
    ('Stocks & ETFs', 'Discuss stocks and ETF trading strategies', 'stocks'),
    ('Options Trading', 'Options strategies, Greeks, and setups', 'options'),
    ('Crypto Corner', 'Cryptocurrency trading and analysis', 'crypto'),
    ('Forex Lounge', 'Currency pairs and forex strategies', 'forex'),
    ('Futures & Commodities', 'Futures contracts and commodity trading', 'futures');

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;