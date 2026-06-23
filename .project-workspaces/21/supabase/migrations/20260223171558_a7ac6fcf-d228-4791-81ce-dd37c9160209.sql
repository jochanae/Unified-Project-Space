
-- Tighten INSERT policy to only allow authenticated users
DROP POLICY "Users can insert notifications for others" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
