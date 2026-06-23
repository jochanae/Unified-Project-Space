/**
 * Strategist Mode Detection
 *
 * Universal high-stakes radar. Scans recent user messages for signals of
 * gravity — stakes, intent, ownership, risk — across finance, career, and
 * life-architecture domains. When 2.5+ weighted points appear across at
 * least 2 categories within the recent window, mode flips to "strategist".
 *
 * Recognizes WEIGHT, not vocabulary. "I'm thinking of leaving my company
 * to start my own thing" should fire just as reliably as "my VOO position
 * is 40% of my portfolio."
 */

export type StrategistSignalCategory =
  | 'stakes'
  | 'intent'
  | 'ownership'
  | 'finance'
  | 'career'
  | 'life'
  | 'risk';

interface CategoryConfig {
  pattern: RegExp;
  weight: number;
}

const CATEGORIES: Record<StrategistSignalCategory, CategoryConfig> = {
  // 1. Stakes & Magnitude — the *weight*
  stakes: {
    weight: 1.5,
    pattern:
      /\b(significant|substantial|major|massive|huge|life-?changing|irreversible|permanent|long[- ]term|decade|decades?|retirement|forever|years from now|10[- ]?year|20[- ]?year|five[- ]?year|long horizon|big picture|generational)\b|\$\s?\d|\b\d+k\b|\b\d+\s?(million|mil|billion|bn|m\b)/i,
  },
  // 2. Intent & Decision — the *posture*
  intent: {
    weight: 1.5,
    pattern:
      /\b(deciding|committing|signing|walking away|pulling the trigger|going all[- ]in|betting on|doubling down|taking the leap|locking in|i'?m thinking (of|about)|i want to|i need to figure|should i|do i|considering|on the fence|leaning toward|made up my mind|ready to|time to)\b/i,
  },
  // 3. Ownership & Identity — the *"this is mine"*
  ownership: {
    weight: 1.5,
    pattern:
      /\b(my (equity|stake|company|business|marriage|kids?|future|legacy|name|reputation|portfolio|career|practice|firm|brand)|what i'?m building|where i'?m headed|my path|my move|my call)\b/i,
  },
  // 4. Domain — Finance
  finance: {
    weight: 1,
    pattern:
      /\b(portfolio|equity|roi|401k|roth|hsa|ira|real estate|valuation|runway|allocation|capital|leverage|dividend|yield|index fund|etf|stocks?|bonds?|crypto|bitcoin|net worth|liquidity|diversif|rebalanc|inflation|interest rates?|fed)\b|\b(VOO|QQQM?|SPY|VTI|SMH|VXUS|BND|VNQ|SCHD)\b/i,
  },
  // 5. Domain — Career & Work
  career: {
    weight: 1,
    pattern:
      /\b(promotion|offer|quitting|quit my|founding|launching|pivoting|scaling|hiring|firing|partnership|acquisition|exit|ipo|raise|board|severance|resign|step down|new role|career move|going independent|consulting|freelance|side hustle)\b/i,
  },
  // 6. Domain — Life Architecture
  life: {
    weight: 1,
    pattern:
      /\b(marriage|divorce|having (kids?|a baby)|moving (to|out)|relocating|buying a (house|home)|selling the house|parents (aging|getting older)|health diagnosis|caregiving|will|estate|prenup|trust fund|inheritance|adoption|cross[- ]country|emigrat|immigrat)\b/i,
  },
  // 7. Risk & Trade-off — the *gravity*
  risk: {
    weight: 2,
    pattern:
      /\b(risk|stakes|trade[- ]?offs?|sacrifice|what if it fails|downside|worst case|exposure|consequence|regret|can'?t undo|no going back|burn the boats|all in|on the line|gamble|bet the (farm|house))\b/i,
  },
};

export interface StrategistDetectionResult {
  active: boolean;
  score: number;
  hits: StrategistSignalCategory[];
  /** How many of the last N messages contained a signal (for decay tracking) */
  recentSignalDepth: number;
}

const ACTIVATION_THRESHOLD = 2.5;
const MIN_CATEGORIES = 2;

/**
 * Analyze the last N messages and decide if Strategist Mode should be active.
 */
export function detectStrategistMode(
  recentUserMessages: string[],
): StrategistDetectionResult {
  if (recentUserMessages.length === 0) {
    return { active: false, score: 0, hits: [], recentSignalDepth: 0 };
  }

  // Combine the last 5 messages for cross-message context.
  const window = recentUserMessages.slice(-5);
  const combined = window.join(' \n ');

  const hits: StrategistSignalCategory[] = [];
  let score = 0;

  (Object.keys(CATEGORIES) as StrategistSignalCategory[]).forEach((cat) => {
    const cfg = CATEGORIES[cat];
    if (cfg.pattern.test(combined)) {
      hits.push(cat);
      score += cfg.weight;
    }
  });

  const recentSignalDepth = window.filter((msg) =>
    (Object.values(CATEGORIES) as CategoryConfig[]).some((c) => c.pattern.test(msg)),
  ).length;

  const active = score >= ACTIVATION_THRESHOLD && hits.length >= MIN_CATEGORIES;

  return { active, score, hits, recentSignalDepth };
}

/**
 * Decay rule: if no qualifying signals appear in the last `decayWindow`
 * messages, mode should fade out even if previously active.
 */
export function shouldDecayStrategistMode(
  recentUserMessages: string[],
  decayWindow = 4,
): boolean {
  if (recentUserMessages.length === 0) return true;
  const tail = recentUserMessages.slice(-decayWindow);
  const anyHit = tail.some((msg) =>
    (Object.values(CATEGORIES) as CategoryConfig[]).some((c) => c.pattern.test(msg)),
  );
  return !anyHit;
}
