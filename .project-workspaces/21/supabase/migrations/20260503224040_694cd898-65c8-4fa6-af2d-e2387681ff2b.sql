-- Atlas: entries table (Ledger + Parking Lot single source of truth)
CREATE TABLE public.entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT,                -- companion (Quinn) — Atlas "project_id" analogue
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | parked | committed | archived
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  severity TEXT,                  -- neutral | warning | blocker | committed
  verb TEXT,
  build_id TEXT,
  touched JSONB,                  -- array of touched files / surfaces
  mode TEXT,                      -- think | plan | build | explore | decide | audit
  source_message_id UUID,         -- references chat_messages.id (nullable, no FK to keep flexible)
  card_schema_version INTEGER DEFAULT 1,
  is_violation BOOLEAN NOT NULL DEFAULT false,
  supersedes_id UUID REFERENCES public.entries(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entries_status_check CHECK (status IN ('draft','parked','committed','archived'))
);

CREATE INDEX idx_entries_user ON public.entries(user_id);
CREATE INDEX idx_entries_user_status ON public.entries(user_id, status);
CREATE INDEX idx_entries_user_member ON public.entries(user_id, member_id);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own entries"
  ON public.entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own entries"
  ON public.entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own non-locked entries"
  ON public.entries FOR UPDATE
  USING (auth.uid() = user_id AND locked_at IS NULL);

CREATE POLICY "Users delete their own non-locked entries"
  ON public.entries FOR DELETE
  USING (auth.uid() = user_id AND locked_at IS NULL);

-- Auto-stamp locked_at when status becomes 'committed', and bump updated_at
CREATE OR REPLACE FUNCTION public.entries_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'committed' AND OLD.locked_at IS NULL THEN
    NEW.locked_at = now();
  END IF;
  -- Once locked, prevent edits to immutable fields
  IF OLD.locked_at IS NOT NULL THEN
    NEW.title := OLD.title;
    NEW.summary := OLD.summary;
    NEW.details := OLD.details;
    NEW.severity := OLD.severity;
    NEW.verb := OLD.verb;
    NEW.touched := OLD.touched;
    NEW.locked_at := OLD.locked_at;
    -- Allow only status flip to 'archived'
    IF NEW.status NOT IN ('committed','archived') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entries_lifecycle_trigger
BEFORE UPDATE ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.entries_lifecycle();

-- Insert path: stamp locked_at if created already committed
CREATE OR REPLACE FUNCTION public.entries_insert_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'committed' AND NEW.locked_at IS NULL THEN
    NEW.locked_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entries_insert_lock_trigger
BEFORE INSERT ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.entries_insert_lock();