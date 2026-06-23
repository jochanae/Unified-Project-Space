-- Fix security definer view by setting security_invoker = true
ALTER VIEW public.referrals_safe SET (security_invoker = true);