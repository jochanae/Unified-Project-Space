
-- Fix security definer views by setting them to SECURITY INVOKER
ALTER VIEW public.profiles_decrypted SET (security_invoker = on);
ALTER VIEW public.sms_profiles_decrypted SET (security_invoker = on);
