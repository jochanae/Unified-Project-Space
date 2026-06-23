
-- Allow admins to read all profiles for the admin dashboard
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any subscription (for premium toggle)
CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert subscriptions for any user
CREATE POLICY "Admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));
