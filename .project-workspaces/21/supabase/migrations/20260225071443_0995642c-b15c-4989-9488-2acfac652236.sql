-- 1. Fix notifications INSERT policy: restrict to own user_id only
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Strengthen circle invite codes: increase from 4 bytes (8 hex) to 16 bytes (32 hex)
ALTER TABLE public.custom_circles
ALTER COLUMN invite_code SET DEFAULT encode(extensions.gen_random_bytes(16), 'hex');