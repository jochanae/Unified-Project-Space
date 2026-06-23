-- 1) Lock down subscriptions table — block all client writes (only service role / webhook can mutate)
CREATE POLICY "Block authenticated inserts on subscriptions"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block authenticated updates on subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block authenticated deletes on subscriptions"
ON public.subscriptions FOR DELETE TO authenticated
USING (false);

-- 2) app_error_logs — block client inserts (service role / triggers only)
CREATE POLICY "Block authenticated inserts on app_error_logs"
ON public.app_error_logs FOR INSERT TO authenticated
WITH CHECK (false);

-- 3) push_events — block client inserts (service role only)
CREATE POLICY "Block authenticated inserts on push_events"
ON public.push_events FOR INSERT TO authenticated
WITH CHECK (false);

-- 4) webhook_events — block client inserts (service role only)
CREATE POLICY "Block authenticated inserts on webhook_events"
ON public.webhook_events FOR INSERT TO authenticated
WITH CHECK (false);

-- 5) user_roles — explicitly block anon role too
CREATE POLICY "Block anon all on user_roles"
ON public.user_roles FOR ALL TO anon
USING (false) WITH CHECK (false);