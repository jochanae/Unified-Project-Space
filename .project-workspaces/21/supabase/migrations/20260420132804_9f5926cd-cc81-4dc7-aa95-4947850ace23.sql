-- ============================================
-- BLUEPRINT TEMPLATES (Layover Launch)
-- ============================================
CREATE TABLE public.blueprint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  emoji TEXT NOT NULL DEFAULT '✨',
  mode TEXT NOT NULL DEFAULT 'strategist',
  category TEXT NOT NULL DEFAULT 'launch',
  kickoff_prompt TEXT NOT NULL,
  suggested_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tier_required TEXT NOT NULL DEFAULT 'free',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blueprint_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are viewable by authenticated users"
ON public.blueprint_templates
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.blueprint_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blueprint_templates_updated_at
BEFORE UPDATE ON public.blueprint_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial 6 templates
INSERT INTO public.blueprint_templates (slug, title, subtitle, emoji, mode, category, kickoff_prompt, suggested_steps, tier_required, sort_order) VALUES
('layover-launch', 'Layover Launch', 'Funnel + landing page sprint between flights', '🛫', 'strategist', 'launch',
  'I want to launch a new offer in the next 48 hours — likely between layovers. Walk me through a focused sprint: clarify the offer in one sentence, draft the funnel structure (hook → promise → CTA), outline the landing page sections, and list the 3 highest-leverage tasks I should do first. Ask me one clarifying question at a time.',
  '["Clarify the one-sentence offer", "Draft funnel: hook → promise → CTA", "Outline landing page sections", "List top 3 priority tasks"]'::jsonb,
  'free', 1),
('document-audit', 'Document Audit', 'Review and tighten an existing doc, deck, or proposal', '📄', 'strategist', 'audit',
  'I have a document I want to sharpen. Help me audit it: ask me to share or describe it, then identify the 3 weakest sections, the boldest claim that needs proof, and the single edit that would most increase its impact. Be direct, not gentle.',
  '["Share or describe the doc", "Identify 3 weakest sections", "Pressure-test the boldest claim", "Recommend the highest-impact edit"]'::jsonb,
  'free', 2),
('offer-architect', 'Offer Architect', 'Design a premium offer from raw idea to pricing', '🏛️', 'strategist', 'offer',
  'Help me architect a premium offer from scratch. We''ll move through: who it''s for, the transformation it delivers, what''s included, the price anchor, and the one objection that will kill it if I don''t handle it. Ask me one question at a time and push me to think bigger.',
  '["Define ideal buyer", "Name the transformation", "Scope deliverables", "Set price anchor", "Surface the killer objection"]'::jsonb,
  'free', 3),
('weekly-reset', 'Weekly Reset', 'Sunday strategic review and week-ahead planning', '🌅', 'strategist', 'rhythm',
  'Run a Sunday Reset with me. Review last week (what moved, what stalled, what I learned), then design the coming week around 3 outcomes and one bold move. Keep it tight — no fluff.',
  '["Review last week''s wins and stalls", "Extract 1 lesson", "Pick 3 outcomes for the week", "Name one bold move"]'::jsonb,
  'free', 4),
('content-engine', 'Content Engine', 'Turn one big idea into a week of content', '📡', 'strategist', 'content',
  'Help me build a content engine from a single idea. Ask me for the core idea, then break it into: 1 long-form anchor, 3 short posts, 1 story angle, and 1 conversation starter for DMs. Make each piece feel native to its format.',
  '["Capture the core idea", "Draft long-form anchor", "Spin off 3 short posts", "Add story angle + DM opener"]'::jsonb,
  'genesis', 5),
('vision-translator', 'Vision Translator', 'Convert a big vision into a 90-day blueprint', '🗺️', 'strategist', 'vision',
  'I have a big vision and I need to translate it into a 90-day blueprint. Help me distill the vision into one sentence, identify the 3 milestones that would prove it''s real, and reverse-engineer the first 2 weeks of action. Ask sharp questions.',
  '["Distill vision to one sentence", "Pick 3 proof-point milestones", "Reverse-engineer first 2 weeks", "Name the first action today"]'::jsonb,
  'genesis', 6);

-- ============================================
-- SANCTUARY KEYS (Referral Artifact)
-- ============================================
CREATE TABLE public.sanctuary_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code TEXT NOT NULL UNIQUE,
  gifter_user_id UUID NOT NULL,
  gifter_name TEXT NOT NULL,
  gifter_serial INTEGER,
  recipient_user_id UUID,
  recipient_email TEXT,
  recipient_note TEXT,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanctuary_keys_gifter ON public.sanctuary_keys(gifter_user_id);
CREATE INDEX idx_sanctuary_keys_recipient ON public.sanctuary_keys(recipient_user_id);
CREATE INDEX idx_sanctuary_keys_code ON public.sanctuary_keys(key_code);

ALTER TABLE public.sanctuary_keys ENABLE ROW LEVEL SECURITY;

-- Gifters can see their own minted keys
CREATE POLICY "Gifters can view their own keys"
ON public.sanctuary_keys
FOR SELECT
TO authenticated
USING (auth.uid() = gifter_user_id);

-- Recipients can see keys gifted to them
CREATE POLICY "Recipients can view their claimed keys"
ON public.sanctuary_keys
FOR SELECT
TO authenticated
USING (auth.uid() = recipient_user_id);

-- Anyone authenticated can look up by code (for claim flow); we only expose minimal fields via RPC
CREATE POLICY "Authenticated can lookup unclaimed keys for claim"
ON public.sanctuary_keys
FOR SELECT
TO authenticated
USING (claimed_at IS NULL AND expires_at > now());

-- Mint key RPC: enforces 3-key quota and Genesis-only
CREATE OR REPLACE FUNCTION public.mint_sanctuary_key(p_recipient_note TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_serial INTEGER;
  v_name TEXT;
  v_count INTEGER;
  v_code TEXT;
  v_key_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Genesis only (serial <= 100)
  SELECT serial_number INTO v_serial
  FROM beta_serial_numbers
  WHERE user_id = v_user_id AND serial_number <= 100
  LIMIT 1;

  IF v_serial IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'genesis_only');
  END IF;

  -- Quota: 3 keys max
  SELECT count(*) INTO v_count
  FROM sanctuary_keys
  WHERE gifter_user_id = v_user_id;

  IF v_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'quota_exceeded', 'minted', v_count);
  END IF;

  SELECT COALESCE(preferred_name, user_name, 'A Founding Member') INTO v_name
  FROM profiles WHERE user_id = v_user_id;

  -- Generate readable code: KEY-{serial}-{random}
  v_code := 'KEY-' || lpad(v_serial::text, 3, '0') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO sanctuary_keys (key_code, gifter_user_id, gifter_name, gifter_serial, recipient_note)
  VALUES (v_code, v_user_id, v_name, v_serial, p_recipient_note)
  RETURNING id INTO v_key_id;

  RETURN jsonb_build_object(
    'success', true,
    'key_id', v_key_id,
    'key_code', v_code,
    'gifter_name', v_name,
    'gifter_serial', v_serial,
    'remaining', 3 - (v_count + 1)
  );
END;
$$;

-- Claim key RPC
CREATE OR REPLACE FUNCTION public.claim_sanctuary_key(p_key_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_key RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_key
  FROM sanctuary_keys
  WHERE key_code = upper(trim(p_key_code))
  LIMIT 1;

  IF v_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_key.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  IF v_key.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_key.gifter_user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_claim_own');
  END IF;

  UPDATE sanctuary_keys
  SET claimed_at = now(), recipient_user_id = v_user_id
  WHERE id = v_key.id;

  RETURN jsonb_build_object(
    'success', true,
    'gifter_name', v_key.gifter_name,
    'gifter_serial', v_key.gifter_serial,
    'recipient_note', v_key.recipient_note
  );
END;
$$;

-- Lookup key (preview before claim, no auth needed for preview is risky — keep authenticated only)
CREATE OR REPLACE FUNCTION public.preview_sanctuary_key(p_key_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
BEGIN
  SELECT key_code, gifter_name, gifter_serial, recipient_note, claimed_at, expires_at
  INTO v_key
  FROM sanctuary_keys
  WHERE key_code = upper(trim(p_key_code))
  LIMIT 1;

  IF v_key IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_key.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_claimed', 'gifter_name', v_key.gifter_name);
  END IF;

  IF v_key.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'gifter_name', v_key.gifter_name,
    'gifter_serial', v_key.gifter_serial,
    'recipient_note', v_key.recipient_note
  );
END;
$$;