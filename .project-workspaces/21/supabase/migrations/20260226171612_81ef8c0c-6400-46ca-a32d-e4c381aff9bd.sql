
-- Create circle_guests table for the Guest Ledger system
CREATE TABLE public.circle_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.custom_circles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role_preset text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'invited',
  invite_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.circle_guests ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check circle ownership
CREATE OR REPLACE FUNCTION public.is_circle_owner(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_circles
    WHERE id = _circle_id AND creator_id = _user_id
  )
$$;

-- Owner can do everything with their circle's guests
CREATE POLICY "Circle owner can manage guests"
ON public.circle_guests FOR ALL
TO authenticated
USING (public.is_circle_owner(circle_id, auth.uid()))
WITH CHECK (public.is_circle_owner(circle_id, auth.uid()));

-- Guests can view their own row by invite_token match or user_id match
CREATE POLICY "Guests can view own row"
ON public.circle_guests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow unauthenticated guest token lookups via anon for the join page
CREATE POLICY "Anyone can lookup by invite token"
ON public.circle_guests FOR SELECT
TO anon, authenticated
USING (true);

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_guests;
