-- ============================================================
-- TIER A FOLLOWUP + TIER B SECURITY HARDENING
-- ============================================================

-- ------------------------------------------------------------
-- 1. REALTIME — Scope RLS to broadcast/presence only
-- postgres_changes uses realtime.messages too but is already protected
-- by table-level RLS on the underlying tables. Restricting all topics
-- broke 24 existing subscriptions. Limit enforcement to user-initiated
-- broadcast/presence channels (the actual exfiltration vector).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can only read their own realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Users can only write to their own realtime topic" ON realtime.messages;

CREATE POLICY "Broadcast/presence scoped to user topic - read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow postgres_changes to flow normally (table RLS protects payload)
  extension = 'postgres_changes'
  -- For broadcast/presence, require user:<uid>:* topic prefix
  OR (extension IN ('broadcast', 'presence')
      AND public.realtime_topic_user_id(topic) = auth.uid())
);

CREATE POLICY "Broadcast/presence scoped to user topic - write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'postgres_changes'
  OR (extension IN ('broadcast', 'presence')
      AND public.realtime_topic_user_id(topic) = auth.uid())
);

-- ------------------------------------------------------------
-- 2. BUG_REPORTS — Require auth + rate-limit-friendly check
-- Removes anonymous spam vector. Authenticated users may submit
-- only reports tied to their own user_id (or null if logging out flow).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit bug reports" ON public.bug_reports;

CREATE POLICY "Authenticated users can submit own bug reports"
ON public.bug_reports
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- ------------------------------------------------------------
-- 3. PROFESSIONAL_APPLICATIONS — Replace spoofable JWT email check
-- Requires user_id column populated; if missing on legacy rows the
-- old applicant can re-link via support. Going forward, the apply
-- flow must set user_id = auth.uid().
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own applications" ON public.professional_applications;

-- Add user_id column if not already present (idempotent)
ALTER TABLE public.professional_applications
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE POLICY "Users can view their own applications by user_id"
ON public.professional_applications
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. SMS_TRANSACTION_LOGS — Add missing write policies (owner-only)
-- ------------------------------------------------------------
CREATE POLICY "Users can insert own SMS logs"
ON public.sms_transaction_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SMS logs"
ON public.sms_transaction_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SMS logs"
ON public.sms_transaction_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. SMS_BILL_MATCHES — Add missing INSERT/DELETE policies
-- ------------------------------------------------------------
CREATE POLICY "Users can insert own SMS bill matches"
ON public.sms_bill_matches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SMS bill matches"
ON public.sms_bill_matches
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. STORAGE — De-duplicate avatar public SELECT policies
-- (Two identical "publicly accessible" / "Public can view" rules existed)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
-- "Public can view avatars" remains as the single canonical SELECT policy.