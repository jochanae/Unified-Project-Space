
-- Add invite_code to custom_circles
ALTER TABLE public.custom_circles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex');

-- Circle members table
CREATE TABLE public.circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.custom_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their circle's members"
  ON public.circle_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join circles"
  ON public.circle_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave circles"
  ON public.circle_members FOR DELETE
  USING (auth.uid() = user_id);

-- Circle messages table
CREATE TABLE public.circle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.custom_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_type text NOT NULL DEFAULT 'human',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view circle messages"
  ON public.circle_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_messages.circle_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send circle messages"
  ON public.circle_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_messages.circle_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own circle messages"
  ON public.circle_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for circle messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages;

-- Auto-add creator as owner when circle is created (update existing circles too)
INSERT INTO public.circle_members (circle_id, user_id, role)
SELECT id, creator_id, 'owner' FROM public.custom_circles
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- Update existing RLS on custom_circles: let members see circles they belong to
DROP POLICY IF EXISTS "Anyone can view custom circles" ON public.custom_circles;

CREATE POLICY "Members can view their circles"
  ON public.custom_circles FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = custom_circles.id
        AND cm.user_id = auth.uid()
    )
  );
