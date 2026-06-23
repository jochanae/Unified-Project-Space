
-- 1. Fix circle_guests: remove overly permissive public SELECT
DROP POLICY IF EXISTS "Anyone can lookup by invite token" ON public.circle_guests;

-- 2. Fix bug_reports: enforce user_id = auth.uid() on insert
DROP POLICY IF EXISTS "Authenticated users can insert bug reports" ON public.bug_reports;
CREATE POLICY "Authenticated users can insert own bug reports"
  ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can insert bug reports without user_id"
  ON public.bug_reports FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- 3. Fix admin policies: restrict to 'authenticated' role only
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can update all subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view bug reports" ON public.bug_reports;
CREATE POLICY "Admins can view bug reports"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update bug reports" ON public.bug_reports;
CREATE POLICY "Admins can update bug reports"
  ON public.bug_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete bug reports" ON public.bug_reports;
CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten sms_profiles to authenticated only
DROP POLICY IF EXISTS "Users can view their own sms profile" ON public.sms_profiles;
CREATE POLICY "Users can view their own sms profile"
  ON public.sms_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sms profile" ON public.sms_profiles;
CREATE POLICY "Users can insert their own sms profile"
  ON public.sms_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sms profile" ON public.sms_profiles;
CREATE POLICY "Users can update their own sms profile"
  ON public.sms_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
