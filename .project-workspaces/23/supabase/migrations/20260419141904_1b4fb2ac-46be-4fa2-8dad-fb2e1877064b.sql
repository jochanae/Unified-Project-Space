-- Add step sequence + routing fields to pages
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS step_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pages_funnel_step ON public.pages(funnel_id, step_index);
CREATE INDEX IF NOT EXISTS idx_pages_next_page ON public.pages(next_page_id);

-- Backfill step_index per funnel based on created_at
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY funnel_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.pages
  WHERE funnel_id IS NOT NULL
)
UPDATE public.pages p
   SET step_index = r.rn
  FROM ranked r
 WHERE p.id = r.id
   AND p.step_index = 0;