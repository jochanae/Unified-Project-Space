
-- Batch 1: Remove dangerous client-side write policies
-- All writes to these tables go through SECURITY DEFINER functions that bypass RLS

-- subscriptions: remove user INSERT + UPDATE (keep admin + SELECT)
DROP POLICY "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY "Users can update their own subscription" ON public.subscriptions;

-- vibe_points: remove user INSERT + UPDATE (keep SELECT; writes via add_vibe_points/spend_vibe_points/claim_daily_login_bonus RPCs)
DROP POLICY "Users can insert their own vibe points" ON public.vibe_points;
DROP POLICY "Users can update their own vibe points" ON public.vibe_points;

-- usage_tracking: remove user INSERT + UPDATE (keep SELECT; writes via increment_message_count/increment_image_count RPCs)
DROP POLICY "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY "Users can update their own usage" ON public.usage_tracking;

-- rate_limits: remove user DELETE + INSERT + UPDATE (keep SELECT; writes via check_rate_limit/cleanup_rate_limits RPCs)
DROP POLICY "Users can delete their own rate limits" ON public.rate_limits;
DROP POLICY "Users can insert their own rate limits" ON public.rate_limits;
DROP POLICY "Users can update their own rate limits" ON public.rate_limits;
