
-- Batch 2: Move user_badges and user_gift_purchases writes to SECURITY DEFINER RPCs

-- RPC to award a badge (prevents users from inventing arbitrary badges)
CREATE OR REPLACE FUNCTION public.award_badge(
  p_badge_id text,
  p_badge_name text,
  p_badge_emoji text,
  p_source text DEFAULT 'learn'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id, badge_name, badge_emoji, source)
  VALUES (auth.uid(), p_badge_id, p_badge_name, p_badge_emoji, p_source);
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- RPC to record a gift purchase (prevents spoofing purchases)
CREATE OR REPLACE FUNCTION public.record_gift_purchase(
  p_gift_id text,
  p_member_id text,
  p_stripe_session_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the gift actually exists
  IF NOT EXISTS (SELECT 1 FROM public.virtual_gifts WHERE id::text = p_gift_id AND is_active = true) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_gift_purchases (user_id, gift_id, member_id, stripe_session_id)
  VALUES (auth.uid(), p_gift_id, p_member_id, p_stripe_session_id);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Drop the client-side INSERT policies
DROP POLICY "Users can insert their own badges" ON public.user_badges;
DROP POLICY "Users can insert their own purchases" ON public.user_gift_purchases;
