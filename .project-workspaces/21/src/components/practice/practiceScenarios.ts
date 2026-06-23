import type { PracticeScenario } from './PracticeModeContext';

export type ScenarioCategory = 'foundation' | 'social' | 'emotional' | 'roleplay' | 'private';

export interface CategorizedScenario extends PracticeScenario {
  category: ScenarioCategory;
  requiresMature?: boolean;
}

export const SCENARIO_CATEGORIES: { id: ScenarioCategory; label: string; emoji: string; requiresMature?: boolean }[] = [
  { id: 'foundation', label: 'Foundation', emoji: '🔥' },
  { id: 'social', label: 'Social Dynamics', emoji: '🤝' },
  { id: 'emotional', label: 'Emotional Intelligence', emoji: '❤️' },
  { id: 'roleplay', label: 'Roleplay', emoji: '🎭' },
  { id: 'private', label: 'Private Dynamics', emoji: '🔒', requiresMature: true },
];

export const ALL_SCENARIOS: CategorizedScenario[] = [
  // ── Foundation (existing) ──
  {
    id: 'freeze', category: 'foundation',
    title: "When You Don't Know What to Say", emoji: '🔥',
    description: 'Practice responding under pressure without overthinking',
    prompt: "You're a little hard to read… I can't tell what you're thinking.",
    coachingFocus: "Don't over-explain. Stay calm and controlled.",
  },
  {
    id: 'playful', category: 'foundation',
    title: 'Playful Energy', emoji: '💬',
    description: 'Keep tension alive with playful, intriguing responses',
    prompt: "You seem like trouble.",
    coachingFocus: "Keep tension alive. Avoid killing the moment with logic.",
  },
  {
    id: 'emotional', category: 'foundation',
    title: 'Emotional Depth', emoji: '❤️',
    description: 'Express without overexposing — stay grounded',
    prompt: "I feel like you don't really let people in.",
    coachingFocus: "Express without overexposing. Stay grounded. No rambling.",
  },
  {
    id: 'boundaries', category: 'foundation',
    title: 'Boundaries', emoji: '🛑',
    description: 'Set clear boundaries without over-apologizing',
    prompt: "Why are you being so distant lately?",
    coachingFocus: "No over-apologizing. Clear ≠ harsh. Hold your position.",
  },
  {
    id: 'intrigue', category: 'foundation',
    title: 'First Impression', emoji: '🧠',
    description: "Let curiosity build — don't oversell yourself",
    prompt: "So what makes you different?",
    coachingFocus: "Don't oversell. Let curiosity build. Avoid resume answers.",
  },

  // ── Social Dynamics ──
  {
    id: 'group-pressure', category: 'social',
    title: 'Group Pressure', emoji: '👥',
    description: 'Hold your ground when the group disagrees',
    prompt: "Everyone thinks you're wrong about this. Are you sure?",
    coachingFocus: "Stay firm without being combative. Confidence ≠ arrogance.",
  },
  {
    id: 'awkward-silence', category: 'social',
    title: 'The Awkward Silence', emoji: '😶',
    description: 'Navigate pauses without panicking',
    prompt: "…",
    coachingFocus: "Silence is power. Don't rush to fill it. Let it breathe.",
  },
  {
    id: 'small-talk', category: 'social',
    title: 'Elevate Small Talk', emoji: '☕',
    description: 'Turn surface-level conversation into something real',
    prompt: "So, what do you do?",
    coachingFocus: "Go deeper than your job title. Make them curious, not informed.",
  },

  // ── Emotional Intelligence ──
  {
    id: 'apology', category: 'emotional',
    title: 'The Real Apology', emoji: '🕊️',
    description: 'Apologize with weight, not weakness',
    prompt: "You really hurt me with that.",
    coachingFocus: "Acknowledge impact, not just intent. No 'but' after sorry.",
  },
  {
    id: 'receiving-compliment', category: 'emotional',
    title: 'Receiving a Compliment', emoji: '✨',
    description: 'Accept warmth without deflecting',
    prompt: "I really admire how you handle things.",
    coachingFocus: "Don't deflect or minimize. Receive it. A simple 'thank you' is powerful.",
  },
  {
    id: 'expressing-need', category: 'emotional',
    title: 'Expressing a Need', emoji: '💬',
    description: 'Ask for what you need without over-justifying',
    prompt: "You never tell me what you actually want.",
    coachingFocus: "State your need clearly. No over-explaining or apologizing for having needs.",
  },

  // ── Roleplay (standard) ──
  {
    id: 'rp-unexpected', category: 'roleplay',
    title: 'The Unexpected Connection', emoji: '🎭',
    description: "You're at a private event. Someone starts a conversation.",
    prompt: "You don't seem like you really want to be here.",
    coachingFocus: "Natural presence. Don't over-perform. Let curiosity build.",
  },
  {
    id: 'rp-tension', category: 'roleplay',
    title: 'Tension & Boundaries', emoji: '⚔️',
    description: "Someone you've been talking to calls you out.",
    prompt: "You've been a little distant. I can't tell if you're actually interested.",
    coachingFocus: "Hold your ground. Don't over-apologize. Balanced honesty.",
  },
  {
    id: 'rp-leadership', category: 'roleplay',
    title: 'Leading Under Pressure', emoji: '🏔️',
    description: "You're navigating a tense group decision.",
    prompt: "Everyone's looking at you. What do we do?",
    coachingFocus: "Decisive without domineering. Acknowledge input, then lead.",
  },

  // ── Private Dynamics (Mature Mode required) ──
  {
    id: 'priv-latenight', category: 'private', requiresMature: true,
    title: 'Late Night Shift', emoji: '🌙',
    description: "The tone shifts — slower, more personal.",
    prompt: "Can I ask you something a little more real?",
    coachingFocus: "Emotional articulation. Controlled vulnerability. Stay present.",
  },
  {
    id: 'priv-chemistry', category: 'private', requiresMature: true,
    title: 'Romantic Chemistry', emoji: '🔥',
    description: "You're exploring what this connection really is.",
    prompt: "There's something different about how you look at me.",
    coachingFocus: "Let the moment breathe. Don't rush or retreat. Stay in it.",
  },
  {
    id: 'priv-vulnerability', category: 'private', requiresMature: true,
    title: 'Deeper Vulnerability', emoji: '💎',
    description: "A conversation turns unexpectedly personal.",
    prompt: "Why do you hold back sometimes?",
    coachingFocus: "Open without overexposing. Depth ≠ dumping. Be selective and real.",
  },
];

export function getScenariosForCategory(category: ScenarioCategory, matureMode: boolean): CategorizedScenario[] {
  return ALL_SCENARIOS.filter(s => {
    if (s.category !== category) return false;
    if (s.requiresMature && !matureMode) return false;
    return true;
  });
}

export function getVisibleCategories(matureMode: boolean): typeof SCENARIO_CATEGORIES {
  return SCENARIO_CATEGORIES.filter(c => !c.requiresMature || matureMode);
}
