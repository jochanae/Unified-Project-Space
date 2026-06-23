INSERT INTO public.blueprint_templates (slug, title, subtitle, emoji, mode, category, kickoff_prompt, suggested_steps, tier_required, sort_order, is_active)
VALUES
(
  'portfolio-stress-test',
  'Portfolio Stress-Test',
  'Pressure-test your holdings against inflation, rate shocks & concentration risk',
  '📊',
  'strategist',
  'wealth_legacy',
  'I want to stress-test my portfolio. Walk me through it like a strategist — concentration, correlation, what breaks first if rates spike or the market drops 30%, and where my real exposure is hiding. Ask me what I''m holding and let''s build the picture together.',
  '[
    {"text": "List current holdings & rough allocation %"},
    {"text": "Identify top 3 concentration risks"},
    {"text": "Model a 30% drawdown — what hurts most?"},
    {"text": "Stress-test against a 2-year high-rate environment"},
    {"text": "Surface hidden correlations across positions"},
    {"text": "Decide on 1–2 rebalancing moves with clear thresholds"}
  ]'::jsonb,
  'premium',
  100,
  true
),
(
  'equity-bridge',
  'The Equity Bridge',
  'Move capital between home, business & investments without breaking your horizon',
  '🏛️',
  'strategist',
  'wealth_legacy',
  'I''m thinking about moving capital — between home equity, business equity, and investment accounts. Help me think through it like an architect, not an opportunist. What''s the long-horizon trade-off? What does this unlock vs. what does it cost in flexibility, tax, and peace of mind?',
  '[
    {"text": "Map current equity sources & lock-up profiles"},
    {"text": "Define the move — what''s flowing where, and why now?"},
    {"text": "Model tax + opportunity-cost impact"},
    {"text": "Identify what flexibility you''re trading for what return"},
    {"text": "Stress-test against a worst-case 3-year window"},
    {"text": "Set clear go/no-go criteria + timeline"}
  ]'::jsonb,
  'premium',
  101,
  true
),
(
  'late-bloomer-accelerator',
  'Late Bloomer Accelerator',
  'License-aware aggressive moves for builders starting (or restarting) after 40',
  '🚀',
  'strategist',
  'wealth_legacy',
  'I''m building seriously — but later than the standard playbook assumes. I want a strategist who respects the compressed runway without panicking. Help me design moves that are aggressive enough to matter, but legal, sustainable, and license-aware. Where''s my real edge?',
  '[
    {"text": "Define the runway — years, capital, energy budget"},
    {"text": "Inventory unfair advantages (network, expertise, capital)"},
    {"text": "Identify 2–3 high-leverage bets worth pursuing"},
    {"text": "Pressure-test for license / regulatory exposure"},
    {"text": "Set the smallest viable first move (90-day test)"},
    {"text": "Decide what to STOP doing to free oxygen"}
  ]'::jsonb,
  'premium',
  102,
  true
),
(
  'legacy-architecture',
  'Legacy Architecture',
  'Design what your wealth, work & wisdom leave behind — on purpose',
  '🗝️',
  'strategist',
  'wealth_legacy',
  'I want to architect my legacy — not just the money, but the work, the wisdom, the relationships. Walk me through it strategically. What outlives me, who carries it, and what structures need to exist for any of it to actually transfer?',
  '[
    {"text": "Define the 3 pillars: wealth, work, wisdom"},
    {"text": "Name the people / institutions who would carry each"},
    {"text": "Surface gaps — what would die with you today?"},
    {"text": "Identify required structures (entities, docs, rituals)"},
    {"text": "Choose 1 legacy move to start within 30 days"},
    {"text": "Schedule the conversations that need to happen"}
  ]'::jsonb,
  'premium',
  103,
  true
),
(
  'business-personal-firewall',
  'Business / Personal Firewall',
  'Separate (or strategically merge) venture risk from household stability',
  '🛡️',
  'strategist',
  'wealth_legacy',
  'I need to think clearly about the firewall between my business and my personal life — financially, legally, emotionally. Where''s the risk bleeding across? Where am I over-protecting and missing leverage? Help me design the right wall, not the maximum wall.',
  '[
    {"text": "Map current business ↔ personal exposure points"},
    {"text": "Identify legal/entity gaps (LLC, trust, insurance)"},
    {"text": "Spot where over-separation is costing leverage"},
    {"text": "Define the household''s non-negotiable stability floor"},
    {"text": "Design 2–3 firewall moves with clear triggers"},
    {"text": "Schedule a quarterly firewall review"}
  ]'::jsonb,
  'premium',
  104,
  true
);