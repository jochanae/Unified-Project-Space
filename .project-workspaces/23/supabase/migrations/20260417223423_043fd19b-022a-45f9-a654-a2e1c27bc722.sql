-- Closed Loop v1: wire real-world outcomes into saved_campaigns

-- 1) Add telemetry columns to saved_campaigns
ALTER TABLE public.saved_campaigns
  ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{"views":0,"leads":0,"cvr":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_page_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS linked_asset_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS deployed_at timestamptz,
  ADD COLUMN IF NOT EXISTS metrics_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS performance_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS auto_winner boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_saved_campaigns_linked_pages
  ON public.saved_campaigns USING GIN (linked_page_ids);

CREATE INDEX IF NOT EXISTS idx_saved_campaigns_org_perf
  ON public.saved_campaigns (org_id, performance_tier, created_at DESC);

-- 2) Recalc function — rolls page_views + form_submissions into a campaign row
CREATE OR REPLACE FUNCTION public.recalc_campaign_metrics(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pages uuid[];
  _views int := 0;
  _leads int := 0;
  _cvr numeric := 0;
  _tier text := 'standard';
  _auto boolean := false;
BEGIN
  SELECT linked_page_ids INTO _pages FROM public.saved_campaigns WHERE id = _campaign_id;
  IF _pages IS NULL OR array_length(_pages, 1) IS NULL THEN
    UPDATE public.saved_campaigns
       SET metrics = jsonb_build_object('views',0,'leads',0,'cvr',0),
           metrics_updated_at = now(),
           performance_tier = 'standard',
           auto_winner = false
     WHERE id = _campaign_id;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO _views FROM public.page_views WHERE page_id = ANY(_pages);
  SELECT COUNT(*) INTO _leads FROM public.form_submissions WHERE page_id = ANY(_pages);

  IF _views > 0 THEN
    _cvr := ROUND((_leads::numeric / _views::numeric) * 100, 2);
  END IF;

  -- Tiering: needs at least 50 views to qualify, then graded by CVR
  IF _views >= 50 AND _cvr >= 8 THEN
    _tier := 'elite';
    _auto := true;
  ELSIF _views >= 30 AND _cvr >= 4 THEN
    _tier := 'high';
  ELSE
    _tier := 'standard';
  END IF;

  UPDATE public.saved_campaigns
     SET metrics = jsonb_build_object('views', _views, 'leads', _leads, 'cvr', _cvr),
         metrics_updated_at = now(),
         performance_tier = _tier,
         auto_winner = _auto,
         is_winner = CASE WHEN _auto THEN true ELSE is_winner END
   WHERE id = _campaign_id;
END;
$$;

-- 3) Bulk recalc — handy for cron or manual refresh from the UI
CREATE OR REPLACE FUNCTION public.recalc_org_campaign_metrics(_org_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _count int := 0;
BEGIN
  FOR _row IN
    SELECT id FROM public.saved_campaigns
     WHERE org_id = _org_id
       AND array_length(linked_page_ids, 1) IS NOT NULL
  LOOP
    PERFORM public.recalc_campaign_metrics(_row.id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

-- 4) Trigger: auto-recalc when a new lead lands on a tracked page
CREATE OR REPLACE FUNCTION public.bump_campaign_metrics_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  FOR _row IN
    SELECT id FROM public.saved_campaigns
     WHERE NEW.page_id = ANY(linked_page_ids)
  LOOP
    PERFORM public.recalc_campaign_metrics(_row.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_campaign_metrics_on_submission ON public.form_submissions;
CREATE TRIGGER trg_bump_campaign_metrics_on_submission
AFTER INSERT ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.bump_campaign_metrics_on_submission();

-- Grant org members the ability to call recalc on their own campaigns
REVOKE ALL ON FUNCTION public.recalc_campaign_metrics(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_org_campaign_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_campaign_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_org_campaign_metrics(uuid) TO authenticated;