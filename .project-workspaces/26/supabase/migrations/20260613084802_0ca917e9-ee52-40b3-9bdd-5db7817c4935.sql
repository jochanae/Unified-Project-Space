UPDATE public.feature_flags SET is_enabled = false
WHERE feature_key IN ('professionals', 'refer_business', 'kids', 'kids_chat');

INSERT INTO public.feature_flags (feature_key, feature_name, description, is_enabled, category) VALUES
  ('live_and_learn', 'Live & Learn Card', 'Dashboard education/news card', false, 'learning'),
  ('kidsbloom', 'KidsBloom', 'Family / kids financial literacy surface', false, 'family'),
  ('family_chat', 'Family Chat', 'Multi-person household chat', false, 'family'),
  ('allowance', 'Allowance & Chores', 'Allowance scheduling and chore board', false, 'family'),
  ('vision_board_card', 'Vision Board (Dashboard)', 'Vision board dashboard surface', true, 'planning'),
  ('white_label_partners', 'White Label / Partners', 'B2B partner branding and partner admin', false, 'business'),
  ('scenario_lab', 'Scenario Lab', 'What-if financial scenarios deep work', true, 'planning'),
  ('financial_plans', 'Living Money Plan', 'Bloom Living Money Plan roadmaps', true, 'planning')
ON CONFLICT (feature_key) DO NOTHING;