-- Real-time collaboration: ephemeral field locks (presence handled by Realtime channels)
CREATE TABLE public.field_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  project_id UUID NOT NULL,
  surface TEXT NOT NULL DEFAULT 'build_stream', -- 'build_stream' | 'page_builder' | 'funnel'
  field_key TEXT NOT NULL, -- e.g. 'landing.headline', 'block:abc123.title'
  locked_by UUID NOT NULL,
  locked_by_name TEXT,
  locked_by_color TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 seconds'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, surface, field_key)
);

CREATE INDEX idx_field_locks_project ON public.field_locks(project_id, surface);
CREATE INDEX idx_field_locks_expires ON public.field_locks(expires_at);

ALTER TABLE public.field_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their field locks"
  ON public.field_locks
  FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id() AND locked_by = auth.uid());

-- Auto-expire stale locks (called from client/edge before acquiring)
CREATE OR REPLACE FUNCTION public.acquire_field_lock(
  _project_id UUID,
  _surface TEXT,
  _field_key TEXT,
  _user_name TEXT,
  _user_color TEXT
) RETURNS TABLE(success BOOLEAN, locked_by UUID, locked_by_name TEXT, locked_by_color TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org UUID := get_user_org_id();
  _uid UUID := auth.uid();
  _existing RECORD;
BEGIN
  -- Clean expired
  DELETE FROM public.field_locks
   WHERE project_id = _project_id AND surface = _surface AND expires_at < now();

  -- Try insert, refresh if owned by caller
  SELECT * INTO _existing FROM public.field_locks
   WHERE project_id = _project_id AND surface = _surface AND field_key = _field_key;

  IF _existing.id IS NULL THEN
    INSERT INTO public.field_locks (org_id, project_id, surface, field_key, locked_by, locked_by_name, locked_by_color)
    VALUES (_org, _project_id, _surface, _field_key, _uid, _user_name, _user_color);
    RETURN QUERY SELECT TRUE, _uid, _user_name, _user_color;
  ELSIF _existing.locked_by = _uid THEN
    UPDATE public.field_locks SET expires_at = now() + interval '30 seconds'
     WHERE id = _existing.id;
    RETURN QUERY SELECT TRUE, _uid, _user_name, _user_color;
  ELSE
    RETURN QUERY SELECT FALSE, _existing.locked_by, _existing.locked_by_name, _existing.locked_by_color;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_field_lock(
  _project_id UUID,
  _surface TEXT,
  _field_key TEXT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.field_locks
   WHERE project_id = _project_id
     AND surface = _surface
     AND field_key = _field_key
     AND locked_by = auth.uid();
$$;

-- Enable realtime for live lock updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_locks;