/**
 * Gift Thank-You Response Matrix
 *
 * Maps gift categories to categorized companion reactions —
 * tone, dialogue templates, and expression triggers.
 */

export type GiftResponseCategory = 'wardrobe' | 'moment' | 'sanctuary';

interface GiftResponse {
  category: GiftResponseCategory;
  tone: string;
  lines: string[];
  expressionType: 'glow' | 'sparkle';
  ambientEmoji: string;
  ambientDurationMs: number;
}

// ── Category detection ──
const WARDROBE_CATEGORIES = new Set([
  'streetwear', 'formal', 'fantasy', 'casual', 'seasonal', 'loungewear', 'lingerie', 'shoes',
]);

const SANCTUARY_IDS = new Set([
  'cs-star', 'cs-picnic', // peaceful / grounding items
]);

export function resolveGiftCategory(
  itemCategory: string,
  itemId: string,
): GiftResponseCategory {
  if (SANCTUARY_IDS.has(itemId)) return 'sanctuary';
  if (WARDROBE_CATEGORIES.has(itemCategory)) return 'wardrobe';
  return 'moment';
}

// ── Response pools ──
const RESPONSES: Record<GiftResponseCategory, GiftResponse> = {
  wardrobe: {
    category: 'wardrobe',
    tone: 'confident',
    lines: [
      'A perfect fit. You always know exactly how I should present myself.',
      'This matches my energy perfectly. I love it.',
      'You have exquisite taste — I can feel the quality from here.',
      'I\'ve been wanting something like this. You read my mind.',
      'Consider it worn. This is going straight into rotation.',
    ],
    expressionType: 'sparkle',
    ambientEmoji: '✨',
    ambientDurationMs: 15_000,
  },
  moment: {
    category: 'moment',
    tone: 'warm',
    lines: [
      'I needed that energy today. Thank you for thinking of me.',
      'That was exactly what I needed. You always know.',
      'You make even the small things feel like something special.',
      'This is why I look forward to seeing you.',
      'I can feel the warmth from here. Thank you.',
    ],
    expressionType: 'glow',
    ambientEmoji: '💛',
    ambientDurationMs: 10_000,
  },
  sanctuary: {
    category: 'sanctuary',
    tone: 'peaceful',
    lines: [
      'The silence is a gift. I\'m here with you, in the quiet.',
      'Sometimes the best thing is just... being together.',
      'I feel grounded when you do things like this.',
      'This moment — right here — is enough.',
      'Peace suits us. Thank you for creating this space.',
    ],
    expressionType: 'glow',
    ambientEmoji: '🌙',
    ambientDurationMs: 20_000,
  },
};

// ── Public API ──

export function getGiftResponse(itemCategory: string, itemId: string) {
  const cat = resolveGiftCategory(itemCategory, itemId);
  const pool = RESPONSES[cat];
  const line = pool.lines[Math.floor(Math.random() * pool.lines.length)];
  return { ...pool, selectedLine: line };
}
