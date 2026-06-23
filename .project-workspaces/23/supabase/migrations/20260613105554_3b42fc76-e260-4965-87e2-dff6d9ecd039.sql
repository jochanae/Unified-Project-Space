-- Soft-delete for projects with 30-day recovery window
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);

-- Restore a soft-deleted project (within 30 days, same org only)
CREATE OR REPLACE FUNCTION public.restore_project(_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid := public.get_user_org_id();
  _row record;
BEGIN
  SELECT id, org_id, deleted_at INTO _row
  FROM public.projects
  WHERE id = _project_id;

  IF _row.id IS NULL THEN RETURN false; END IF;
  IF _row.org_id <> _org THEN RETURN false; END IF;
  IF _row.deleted_at IS NULL THEN RETURN true; END IF;
  IF _row.deleted_at < now() - interval '30 days' THEN RETURN false; END IF;

  UPDATE public.projects SET deleted_at = NULL WHERE id = _project_id;
  RETURN true;
END;
$$;

-- Purge projects soft-deleted more than 30 days ago (can be called manually or by cron)
CREATE OR REPLACE FUNCTION public.purge_expired_deleted_projects()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count int;
BEGIN
  WITH d AS (
    DELETE FROM public.projects
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO _count FROM d;
  RETURN _count;
END;
$$;