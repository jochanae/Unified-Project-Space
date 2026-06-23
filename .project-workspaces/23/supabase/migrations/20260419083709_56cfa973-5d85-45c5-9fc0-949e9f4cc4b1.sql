-- Enforce that every studio video must belong to a project.
-- No floating drafts allowed (zero existed at migration time).
ALTER TABLE public.studio_videos
  ALTER COLUMN project_id SET NOT NULL;

-- Defensive FK so a deleted project cascades cleanly instead of leaving orphans.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'studio_videos_project_id_fkey'
  ) THEN
    ALTER TABLE public.studio_videos
      ADD CONSTRAINT studio_videos_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;
END $$;