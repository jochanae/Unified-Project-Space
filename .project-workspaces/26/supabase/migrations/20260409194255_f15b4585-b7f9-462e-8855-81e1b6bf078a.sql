
DROP POLICY "Authenticated users can submit card interest" ON public.card_interest;
CREATE POLICY "Authenticated users can submit card interest"
  ON public.card_interest
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Authenticated users can submit quote requests" ON public.custom_quote_requests;
CREATE POLICY "Authenticated users can submit quote requests"
  ON public.custom_quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Authenticated users can create conversion records" ON public.referral_conversions;
CREATE POLICY "Authenticated users can create conversion records"
  ON public.referral_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
