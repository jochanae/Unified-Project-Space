-- 1. citext for case-insensitive handles
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Add handle to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle citext UNIQUE;

-- 3. Format check: 3–30 chars, lowercase letters/numbers/underscore, must start with letter
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_format
  CHECK (handle IS NULL OR handle ~ '^[a-z][a-z0-9_]{2,29}$');

-- 4. Reserved handles table (admin-managed, easy to extend)
CREATE TABLE public.reserved_handles (
  handle citext PRIMARY KEY,
  reason text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reserved_handles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reserved handles"
  ON public.reserved_handles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage reserved handles"
  ON public.reserved_handles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.reserved_handles (handle, reason) VALUES
  ('about','route'),('account','route'),('admin','route'),('api','route'),
  ('app','route'),('auth','route'),('blog','route'),('board','route'),
  ('boards','route'),('contact','route'),('dashboard','route'),('dev','route'),
  ('faq','route'),('finances','route'),('god','reserved'),('help','reserved'),
  ('home','route'),('jesus','reserved'),('journey','route'),('login','route'),
  ('logout','route'),('me','reserved'),('notes','route'),('notifications','route'),
  ('pricing','route'),('privacy','route'),('profile','route'),('reader','route'),
  ('root','reserved'),('sanctum','brand'),('sanctumiq','brand'),('saved','route'),
  ('search','route'),('settings','route'),('signup','route'),('support','reserved'),
  ('terms','route'),('user','reserved'),('users','reserved'),('vault','route'),
  ('workspace','route'),('you','reserved'),('hooks','route'),('public','reserved');

-- 5. Trigger to block reserved handles on profiles
CREATE OR REPLACE FUNCTION public.enforce_reserved_handle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.handle IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reserved_handles WHERE handle = NEW.handle
  ) THEN
    RAISE EXCEPTION 'Handle "%" is reserved', NEW.handle USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_enforce_reserved_handle
  BEFORE INSERT OR UPDATE OF handle ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reserved_handle();

-- 6. Boards (one per user, opt-in public)
CREATE TABLE public.boards (
  user_id uuid PRIMARY KEY,
  bio text,
  featured_scripture_ref text,
  theme text NOT NULL DEFAULT 'quiet',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER boards_set_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Owners view own board"
  ON public.boards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own board"
  ON public.boards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own board"
  ON public.boards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own board"
  ON public.boards FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view published boards"
  ON public.boards FOR SELECT TO anon, authenticated
  USING (published = true);

-- 7. Board items (polymorphic display items)
CREATE TABLE public.board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('poem','video','audio','scripture','link')),
  ref_id uuid,
  title text,
  caption text,
  thumbnail_url text,
  external_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX board_items_user_position_idx
  ON public.board_items (user_id, position);

ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER board_items_set_updated_at
  BEFORE UPDATE ON public.board_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Owners view own board items"
  ON public.board_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own board items"
  ON public.board_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own board items"
  ON public.board_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own board items"
  ON public.board_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public view items on published boards"
  ON public.board_items FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.user_id = board_items.user_id AND b.published = true
  ));

-- 8. Allow public to read minimal profile fields for published boards
CREATE POLICY "Public view profiles of published boards"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.user_id = profiles.id AND b.published = true
  ));