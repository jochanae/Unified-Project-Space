
CREATE OR REPLACE FUNCTION public.evaluate_followup_triggers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _queued INTEGER := 0;
  _row RECORD;
  _next_seq RECORD;
  _last_followup RECORD;
  _tier TEXT;
  _phone TEXT;
  _consent TIMESTAMPTZ;
  _unsub TIMESTAMPTZ;
BEGIN
  FOR _row IN
    SELECT DISTINCT ON (ln.id)
      ln.id AS notification_id,
      ln.org_id,
      ln.project_id,
      ln.email AS recipient_email,
      ln.contact_id AS contact_id,
      ln.created_at AS lead_created_at
    FROM public.lead_notifications ln
    JOIN public.projects p ON p.id = ln.project_id
    WHERE p.auto_followup_enabled = true
      AND ln.created_at > now() - interval '30 days'
    ORDER BY ln.id, ln.created_at DESC
  LOOP
    _tier := public.get_org_subscription_tier(_row.org_id);
    IF _tier = 'signal' THEN
      CONTINUE;
    END IF;

    SELECT lf.*, EXTRACT(EPOCH FROM (now() - lf.created_at)) / 3600 AS hours_since
    INTO _last_followup
    FROM public.lead_followups lf
    WHERE lf.lead_notification_id = _row.notification_id
    ORDER BY lf.created_at DESC
    LIMIT 1;

    IF _last_followup.id IS NOT NULL
       AND (_last_followup.opened_at IS NOT NULL OR _last_followup.clicked_at IS NOT NULL) THEN
      CONTINUE;
    END IF;

    SELECT es.*
    INTO _next_seq
    FROM public.email_sequences es
    WHERE es.project_id = _row.project_id
      AND es.org_id = _row.org_id
      AND NOT EXISTS (
        SELECT 1 FROM public.scheduled_followups sf
        WHERE sf.lead_notification_id = _row.notification_id
          AND COALESCE(sf.subject,'') = COALESCE(es.subject,'')
          AND COALESCE(sf.channel,'email') = COALESCE(es.channel,'email')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.lead_followups lf2
        WHERE lf2.lead_notification_id = _row.notification_id
          AND COALESCE(lf2.subject,'') = COALESCE(es.subject,'')
          AND COALESCE(lf2.channel,'email') = COALESCE(es.channel,'email')
      )
    ORDER BY es.order_index ASC
    LIMIT 1;

    IF _next_seq.id IS NULL THEN
      CONTINUE;
    END IF;

    IF _last_followup.id IS NOT NULL
       AND _last_followup.hours_since < (_next_seq.delay_days * 24) THEN
      CONTINUE;
    END IF;

    IF _last_followup.id IS NULL
       AND EXTRACT(EPOCH FROM (now() - _row.lead_created_at)) / 3600 < (_next_seq.delay_days * 24) THEN
      CONTINUE;
    END IF;

    -- For SMS, require contact phone + consent
    _phone := NULL;
    IF COALESCE(_next_seq.channel,'email') = 'sms' THEN
      SELECT c.phone, c.sms_consent_at, c.sms_unsubscribed_at
        INTO _phone, _consent, _unsub
        FROM public.contacts c
       WHERE c.id = _row.contact_id;
      IF _phone IS NULL OR _consent IS NULL OR _unsub IS NOT NULL THEN
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.scheduled_followups (
      org_id, scheduled_by, lead_notification_id,
      recipient_email, recipient_phone,
      subject, body, channel, send_at, status, source
    )
    VALUES (
      _row.org_id,
      (SELECT id FROM public.users WHERE org_id = _row.org_id LIMIT 1),
      _row.notification_id,
      CASE WHEN COALESCE(_next_seq.channel,'email')='email' THEN _row.recipient_email ELSE NULL END,
      _phone,
      _next_seq.subject,
      _next_seq.body,
      COALESCE(_next_seq.channel,'email'),
      now(),
      'pending',
      'auto_blueprint'
    );

    _queued := _queued + 1;
  END LOOP;

  RETURN _queued;
END;
$function$;
