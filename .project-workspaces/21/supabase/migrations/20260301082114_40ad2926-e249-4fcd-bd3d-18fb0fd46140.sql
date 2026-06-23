-- circle_lobby_config: one row per circle for host-configured lobby settings
CREATE TABLE public.circle_lobby_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.custom_circles(id) ON DELETE CASCADE,
  welcome_message text,
  video_url text,
  music_url text,
  handouts jsonb DEFAULT '[]'::jsonb,
  guestbook_enabled boolean NOT NULL DEFAULT true,
  arrival_suggestions jsonb DEFAULT '["Excited to be here!","Ready to connect ✨","Just vibing 🎶","First time here 👋"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(circle_id)
);

ALTER TABLE public.circle_lobby_config ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Circle owner can manage lobby config"
  ON public.circle_lobby_config FOR ALL
  USING (is_circle_owner(circle_id, auth.uid()))
  WITH CHECK (is_circle_owner(circle_id, auth.uid()));

-- Members can read
CREATE POLICY "Circle members can view lobby config"
  ON public.circle_lobby_config FOR SELECT
  USING (is_circle_member(circle_id, auth.uid()));

-- circle_guestbook: one row per guest arrival
CREATE TABLE public.circle_guestbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.custom_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  arrival_note text,
  companion_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_guestbook ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert their own entry
CREATE POLICY "Users can insert guestbook entries"
  ON public.circle_guestbook FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Circle members can view entries
CREATE POLICY "Circle members can view guestbook"
  ON public.circle_guestbook FOR SELECT
  USING (is_circle_member(circle_id, auth.uid()) OR is_circle_owner(circle_id, auth.uid()));

-- Enable realtime for guestbook (host sees arrivals live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_guestbook;