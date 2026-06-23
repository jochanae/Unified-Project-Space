-- Create enum for age tiers
CREATE TYPE public.kid_age_tier AS ENUM ('under_10', 'teen');

-- Create enum for chore status
CREATE TYPE public.chore_status AS ENUM ('pending', 'in_progress', 'completed', 'approved', 'rejected');

-- Create enum for transaction types
CREATE TYPE public.kid_transaction_type AS ENUM ('allowance', 'chore_reward', 'deposit', 'withdrawal', 'spending', 'gift');

-- Create enum for family link status
CREATE TYPE public.family_link_status AS ENUM ('pending', 'active', 'declined');

-- Card themes table (the 8 themes kids can choose)
CREATE TABLE public.card_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  gradient_start TEXT NOT NULL,
  gradient_end TEXT NOT NULL,
  icon TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  unlock_requirement TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kids profiles (standalone accounts)
CREATE TABLE public.kids_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_emoji TEXT DEFAULT '😊',
  birth_date DATE NOT NULL,
  age_tier kid_age_tier NOT NULL,
  pin_hash TEXT NOT NULL,
  card_theme_id UUID REFERENCES public.card_themes(id),
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  total_saved NUMERIC NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  dark_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kid transactions (all money movements)
CREATE TABLE public.kid_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE NOT NULL,
  type kid_transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  related_chore_id UUID,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chores (tasks kids can complete for rewards)
CREATE TABLE public.kid_chores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  status chore_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  icon TEXT DEFAULT '⭐',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allowances (recurring money setup)
CREATE TABLE public.kid_allowances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE NOT NULL,
  set_by UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  next_payout_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family links (parent-child relationships)
CREATE TABLE public.family_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kid_profile_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'parent',
  status family_link_status NOT NULL DEFAULT 'pending',
  can_view_transactions BOOLEAN NOT NULL DEFAULT true,
  can_set_allowance BOOLEAN NOT NULL DEFAULT true,
  can_assign_chores BOOLEAN NOT NULL DEFAULT true,
  can_approve_spending BOOLEAN NOT NULL DEFAULT false,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, kid_profile_id)
);

-- Chat messages (parent-child communication)
CREATE TABLE public.family_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_link_id UUID REFERENCES public.family_links(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('parent', 'kid')),
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sticker_url TEXT,
  emoji_reaction TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kid savings goals (treasure chest / goals)
CREATE TABLE public.kid_savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  icon TEXT DEFAULT '🎯',
  target_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.card_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kid_chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kid_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kid_savings_goals ENABLE ROW LEVEL SECURITY;

-- Card themes are publicly readable (for signup selection)
CREATE POLICY "Anyone can view card themes"
ON public.card_themes FOR SELECT
USING (true);

-- Kids can view and update their own profile
CREATE POLICY "Kids can view their own profile"
ON public.kids_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Kids can update their own profile"
ON public.kids_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Kids can create their own profile"
ON public.kids_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Parents can view linked kids' profiles
CREATE POLICY "Parents can view linked kids profiles"
ON public.kids_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kids_profiles.id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);

-- Kid transactions policies
CREATE POLICY "Kids can view their own transactions"
ON public.kid_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_transactions.kid_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Kids can create their own transactions"
ON public.kid_transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_transactions.kid_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view linked kids transactions"
ON public.kid_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_transactions.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_view_transactions = true
  )
);

-- Chores policies
CREATE POLICY "Kids can view their own chores"
ON public.kid_chores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_chores.kid_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Kids can update their own chores"
ON public.kid_chores FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_chores.kid_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can manage linked kids chores"
ON public.kid_chores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_chores.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_assign_chores = true
  )
);

-- Allowances policies
CREATE POLICY "Kids can view their own allowances"
ON public.kid_allowances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_allowances.kid_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can manage linked kids allowances"
ON public.kid_allowances FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_allowances.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_set_allowance = true
  )
);

-- Family links policies
CREATE POLICY "Parents can view their family links"
ON public.family_links FOR SELECT
USING (parent_user_id = auth.uid());

CREATE POLICY "Kids can view their family links"
ON public.family_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = family_links.kid_profile_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Kids can update their family link status"
ON public.family_links FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = family_links.kid_profile_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can create family links"
ON public.family_links FOR INSERT
WITH CHECK (parent_user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Family members can view their chat messages"
ON public.family_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.id = family_chat_messages.family_link_id
    AND (
      family_links.parent_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.kids_profiles
        WHERE kids_profiles.id = family_links.kid_profile_id
        AND kids_profiles.user_id = auth.uid()
      )
    )
    AND family_links.status = 'active'
  )
);

CREATE POLICY "Family members can send chat messages"
ON public.family_chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.id = family_chat_messages.family_link_id
    AND (
      family_links.parent_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.kids_profiles
        WHERE kids_profiles.id = family_links.kid_profile_id
        AND kids_profiles.user_id = auth.uid()
      )
    )
    AND family_links.status = 'active'
  )
);

-- Savings goals policies
CREATE POLICY "Kids can manage their own savings goals"
ON public.kid_savings_goals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_savings_goals.kid_id
    AND kids_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view linked kids savings goals"
ON public.kid_savings_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_savings_goals.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_kids_profiles_updated_at
BEFORE UPDATE ON public.kids_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kid_chores_updated_at
BEFORE UPDATE ON public.kid_chores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kid_allowances_updated_at
BEFORE UPDATE ON public.kid_allowances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kid_savings_goals_updated_at
BEFORE UPDATE ON public.kid_savings_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 8 default card themes
INSERT INTO public.card_themes (name, description, gradient_start, gradient_end, icon, display_order) VALUES
('Ocean Wave', 'Cool blue ocean vibes', '#0077B6', '#00B4D8', '🌊', 1),
('Sunset Glow', 'Warm orange sunset colors', '#F97316', '#FBBF24', '🌅', 2),
('Forest Magic', 'Deep green nature theme', '#059669', '#34D399', '🌲', 3),
('Galaxy Explorer', 'Purple space adventure', '#7C3AED', '#A78BFA', '🚀', 4),
('Candy Pop', 'Sweet pink and purple', '#EC4899', '#F472B6', '🍬', 5),
('Lightning Bolt', 'Electric yellow energy', '#EAB308', '#FDE047', '⚡', 6),
('Arctic Frost', 'Icy cool blue white', '#06B6D4', '#67E8F9', '❄️', 7),
('Lava Flow', 'Hot red orange fire', '#DC2626', '#F87171', '🔥', 8);