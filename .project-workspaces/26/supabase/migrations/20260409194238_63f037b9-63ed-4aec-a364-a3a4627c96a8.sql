
-- Drop dead-code service_role policies
DROP POLICY "Service role manages rate limits" ON public.rate_limits;
DROP POLICY "Service role can manage gmail connections" ON public.gmail_connections;
DROP POLICY "Service role can insert pending email bills" ON public.pending_email_bills;

-- Tighten public insert policies to require authentication
DROP POLICY "Anyone can submit card interest" ON public.card_interest;
CREATE POLICY "Authenticated users can submit card interest"
  ON public.card_interest
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY "Anyone can submit quote requests" ON public.custom_quote_requests;
CREATE POLICY "Authenticated users can submit quote requests"
  ON public.custom_quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY "Anyone can create a conversion record on signup" ON public.referral_conversions;
CREATE POLICY "Authenticated users can create conversion records"
  ON public.referral_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
