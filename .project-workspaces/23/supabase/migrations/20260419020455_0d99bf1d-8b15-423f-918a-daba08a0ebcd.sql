INSERT INTO public.knowledge_items (
  title, subtitle, body, category, topic, skill_level,
  tags, search_keywords, feature_link, feature_link_label,
  is_published, is_featured, order_index, read_minutes
) VALUES (
  'The 3-Step Production Workflow',
  'Signal → Studio → Video. Your end-to-end path from raw idea to cinematic explainer.',
  E'## The IntoIQ Production Suite\n\nIntoIQ is built as a workflow, not a junk drawer. Three rooms, one outcome: a high-end video your audience trusts.\n\n### Step 1 — Signal Lab (Strategy)\nGo to **Signal Lab** to sharpen your hook, define your audience, and lock in the message that converts. This is where the "Living Benefits" angle gets pressure-tested before you spend a second on production.\n\n### Step 2 — Brand Vault (Identity)\nOpen **Brand Vault** (the Studio) to lock in your colors, logos, fonts, and template library. Your Obsidian & Gold palette lives here. The Vault is your source of truth — every video, page, and asset draws from it.\n\n### Step 3 — Video Studio (Production)\nLand in **Video Studio** (Director Mode) to script, voice-preview with ElevenLabs, and render. Recent Drafts sit in a collapsible drawer at the top so your IUL "Smartphone of Insurance" history is one tap away.\n\n### The Handoff\nOnce a video is rendered, share the link or export the MP4 (Lambda export coming). Track plays and conversions back in **Analytics**, where Memory and Performance now live.\n\n### TL;DR\n1. **Signal Lab** → sharpen the hook\n2. **Brand Vault** → lock the identity\n3. **Video Studio** → produce the cinema',
  'feature',
  'Workflow',
  'beginner',
  ARRAY['workflow','video','studio','signal','brand','production','iul','director mode'],
  'workflow video production signal brand vault studio director mode iul living benefits explainer',
  '/video',
  'Open Video Studio',
  true,
  true,
  1,
  3
)
ON CONFLICT DO NOTHING;