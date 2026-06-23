-- 1. Per-project opt-in toggle
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS auto_followup_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Source attribution
ALTER TABLE public.scheduled_followups
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.lead_followups
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- 3. Allow updates on lead_followups (engagement tracking needs this)
DROP POLICY IF EXISTS "Org members can update their org follow-ups" ON public.lead_followups;
CREATE POLICY "Org members can update their org follow-ups"
  ON public.lead_followups
  FOR UPDATE
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- 4. Subscription tier helper (security definer to read across tenants safely)
CREATE OR REPLACE FUNCTION public.get_org_subscription_tier(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier TEXT := 'signal';
  _product TEXT;
BEGIN
  -- Find any active subscription for any user in this org
  SELECT s.product_id INTO _product
  FROM public.subscriptions s
  JOIN public.users u ON u.id = s.user_id
  WHERE u.org_id = _org_id
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF _product IS NULL THEN
    RETURN 'signal';
  END IF;

  -- Map product IDs to tiers (heuristic on product_id naming)
  IF _product ILIKE '%innovation%' OR _product ILIKE '%79%' THEN
    _tier := 'innovation';
  ELSIF _product ILIKE '%identity%' OR _product ILIKE '%39%' THEN
    _tier := 'identity';
  ELSE
    _tier := 'identity'; -- any active paid sub defaults to identity tier
  END IF;

  RETURN _tier;
END;
$$;

-- 5. Blueprint trigger engine
CREATE OR REPLACE FUNCTION public.evaluate_followup_triggers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _queued INTEGER := 0;
  _row RECORD;
  _next_seq RECORD;
  _last_followup RECORD;
  _tier TEXT;
BEGIN
  -- Find lead_notifications where:
  --   - The project has auto_followup_enabled
  --   - The org is on a paid tier (identity or innovation)
  --   - The most recent follow-up to this recipient was NOT opened or clicked
  --   - Enough time has passed since the last send (per next sequence step delay)
  --   - The next sequence step exists and hasn't already been queued/sent
  FOR _row IN
    SELECT DISTINCT ON (ln.id)
      ln.id AS notification_id,
      ln.org_id,
      ln.project_id,
      ln.email AS recipient_email,
      ln.created_at AS lead_created_at
    FROM public.lead_notifications ln
    JOIN public.projects p ON p.id = ln.project_id
    WHERE p.auto_followup_enabled = true
      AND ln.created_at > now() - interval '30 days' -- limit window
    ORDER BY ln.id, ln.created_at DESC
  LOOP
    -- Tier gate
    _tier := public.get_org_subscription_tier(_row.org_id);
    IF _tier = 'signal' THEN
      CONTINUE;
    END IF;

    -- Find the most recent follow-up to this recipient for this notification
    SELECT lf.*, EXTRACT(EPOCH FROM (now() - lf.created_at)) / 3600 AS hours_since
    INTO _last_followup
    FROM public.lead_followups lf
    WHERE lf.lead_notification_id = _row.notification_id
    ORDER BY lf.created_at DESC
    LIMIT 1;

    -- Skip if there's recent engagement (opened or clicked)
    IF _last_followup.id IS NOT NULL
       AND (_last_followup.opened_at IS NOT NULL OR _last_followup.clicked_at IS NOT NULL) THEN
      CONTINUE;
    END IF;

    -- Find next sequence step for this project that hasn't been queued yet
    SELECT es.*
    INTO _next_seq
    FROM public.email_sequences es
    WHERE es.project_id = _row.project_id
      AND es.org_id = _row.org_id
      AND NOT EXISTS (
        SELECT 1 FROM public.scheduled_followups sf
        WHERE sf.lead_notification_id = _row.notification_id
          AND sf.subject = es.subject
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.lead_followups lf2
        WHERE lf2.lead_notification_id = _row.notification_id
          AND lf2.subject = es.subject
      )
    ORDER BY es.order_index ASC
    LIMIT 1;

    IF _next_seq.id IS NULL THEN
      CONTINUE;
    END IF;

    -- Check delay: hours since last activity must exceed delay_days * 24
    IF _last_followup.id IS NOT NULL
       AND _last_followup.hours_since < (_next_seq.delay_days * 24) THEN
      CONTINUE;
    END IF;

    IF _last_followup.id IS NULL
       AND EXTRACT(EPOCH FROM (now() - _row.lead_created_at)) / 3600 < (_next_seq.delay_days * 24) THEN
      CONTINUE;
    END IF;

    -- Queue it
    INSERT INTO public.scheduled_followups (
      org_id, scheduled_by, lead_notification_id, recipient_email,
      subject, body, send_at, status, source
    )
    VALUES (
      _row.org_id,
      (SELECT id FROM public.users WHERE org_id = _row.org_id LIMIT 1),
      _row.notification_id,
      _row.recipient_email,
      _next_seq.subject,
      _next_seq.body,
      now(),
      'pending',
      'auto_blueprint'
    );

    _queued := _queued + 1;
  END LOOP;

  RETURN _queued;
END;
$$;

-- 6. Schedule it every 15 minutes
SELECT cron.unschedule('evaluate-followup-triggers')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-followup-triggers');

SELECT cron.schedule(
  'evaluate-followup-triggers',
  '*/15 * * * *',
  $$ SELECT public.evaluate_followup_triggers(); $$
);