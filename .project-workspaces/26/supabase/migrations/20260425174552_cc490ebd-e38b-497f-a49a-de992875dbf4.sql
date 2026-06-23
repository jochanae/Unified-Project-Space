-- ============================================================
-- TIER A SECURITY HARDENING
-- Fixes: Plaid policy gap, Realtime exposure, Kids credential leak, Avatar path bypass
-- ============================================================

-- ------------------------------------------------------------
-- 1. PLAID ITEMS — Convert deny policies to RESTRICTIVE so they cannot be overridden
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Service role only for plaid item creation" ON public.plaid_items;
DROP POLICY IF EXISTS "Service role only for plaid item updates" ON public.plaid_items;
DROP POLICY IF EXISTS "Authenticated users can insert own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Authenticated users can update own plaid items" ON public.plaid_items;

-- Permissive insert/update for owners, but enforced by a restrictive policy below
CREATE POLICY "Owners can insert own plaid items"
ON public.plaid_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own plaid items"
ON public.plaid_items
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RESTRICTIVE policies block plaintext tokens at the row level
-- Tokens must be NULL or the literal sentinel; vault_secret_id is the source of truth
CREATE POLICY "Block plaintext plaid tokens on insert"
ON public.plaid_items
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  plaid_access_token IS NULL OR plaid_access_token = 'ENCRYPTED_IN_VAULT'
);

CREATE POLICY "Block plaintext plaid tokens on update"
ON public.plaid_items
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  plaid_access_token IS NULL OR plaid_access_token = 'ENCRYPTED_IN_VAULT'
);

-- ------------------------------------------------------------
-- 2. REALTIME — Add RLS on realtime.messages so users only see their own channels
-- ------------------------------------------------------------
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Helper: extract owner uuid from a realtime topic of the form "user:<uuid>:..."
CREATE OR REPLACE FUNCTION public.realtime_topic_user_id(topic text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
BEGIN
  IF topic IS NULL THEN
    RETURN NULL;
  END IF;
  parts := string_to_array(topic, ':');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'user' THEN
    BEGIN
      RETURN parts[2]::uuid;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$;

-- Default-deny: only authenticated users can read realtime messages, and only on their own user-scoped topic
CREATE POLICY "Users can only read their own realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.realtime_topic_user_id(topic) = auth.uid()
);

CREATE POLICY "Users can only write to their own realtime topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.realtime_topic_user_id(topic) = auth.uid()
);

-- ------------------------------------------------------------
-- 3. KIDS PROFILES — Stop returning pin_hash / security answers to parents
-- ------------------------------------------------------------
-- Drop the broad parent SELECT and replace it with a restricted version
-- Parents must use get_kid_profile_for_parent() which already excludes credential fields
DROP POLICY IF EXISTS "Parents can view linked kids profiles" ON public.kids_profiles;

-- Replacement: parents may only read non-credential fields via the dedicated function
-- Direct SELECT is now denied for parents; they get scoped data through the secure RPC
CREATE POLICY "Parents can view linked kids non-credential fields"
ON public.kids_profiles
FOR SELECT
TO authenticated
USING (
  -- Kids can still view their own row (matches existing 'Kids can view own profile' policy too)
  user_id = auth.uid()
);

-- Revoke direct column access on credential columns from authenticated role
-- (Column privileges + RLS combined ensure even SECURITY INVOKER queries cannot read them
-- unless going through SECURITY DEFINER functions like get_kid_profile_for_parent)
REVOKE SELECT (pin_hash, security_answer, security_answer_hash, security_question)
  ON public.kids_profiles FROM authenticated;
REVOKE SELECT (pin_hash, security_answer, security_answer_hash, security_question)
  ON public.kids_profiles FROM anon;

-- ------------------------------------------------------------
-- 4. AVATARS BUCKET — Enforce path ownership on INSERT/UPDATE/DELETE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);