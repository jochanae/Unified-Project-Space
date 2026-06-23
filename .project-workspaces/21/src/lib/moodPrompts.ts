/**
 * Mood-Aware Prompt Pools
 *
 * Provides contextual journal prompts based on the user's selected mood level.
 * Prompts rotate daily within each pool to keep the experience fresh.
 */

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodPromptPool {
  label: string;
  emoji: string;
  tone: string;
  prompts: string[];
}

const MOOD_PROMPTS: Record<MoodLevel, MoodPromptPool> = {
  1: {
    label: 'Rough',
    emoji: '😢',
    tone: 'gentle',
    prompts: [
      "What's been the hardest part of today?",
      "If you could let go of one thing right now, what would it be?",
      "What does your body need from you in this moment?",
      "You don't have to fix anything right now. What do you just need to say?",
      "What would you tell a friend who felt the way you do?",
      "Is there something underneath the surface that's asking to be noticed?",
      "What's one small comfort you could give yourself today?",
      "Sometimes just naming the feeling helps. What word fits right now?",
    ],
  },
  2: {
    label: 'Low',
    emoji: '😔',
    tone: 'supportive',
    prompts: [
      "What's weighing on you today?",
      "Is there something you've been carrying that you wish someone knew about?",
      "What would 'feeling better' look like — even just slightly?",
      "When did this feeling start? Was there a moment?",
      "What's one thing that usually helps when you feel this way?",
      "If today had a color, what would it be and why?",
      "What boundary do you need to set this week?",
      "Write down one thing you did today, no matter how small.",
    ],
  },
  3: {
    label: 'Okay',
    emoji: '😐',
    tone: 'reflective',
    prompts: [
      "What would make today go from okay to good?",
      "What's been taking up the most space in your mind?",
      "Is there something you've been putting off that's quietly nagging you?",
      "What's one thing you're looking forward to?",
      "If you had an extra hour today, how would you spend it?",
      "What's something you noticed today that you usually overlook?",
      "Describe your ideal version of tomorrow morning.",
      "What's one question you wish someone would ask you?",
    ],
  },
  4: {
    label: 'Good',
    emoji: '😊',
    tone: 'celebratory',
    prompts: [
      "What made today feel good?",
      "Who or what brought you a moment of joy recently?",
      "What's something you did today that you're quietly proud of?",
      "What's a small win you haven't celebrated yet?",
      "How did you take care of yourself today?",
      "What's something that went better than you expected?",
      "Who showed up for you recently in a way that mattered?",
      "What are you grateful for right now — first thing that comes to mind?",
    ],
  },
  5: {
    label: 'Great',
    emoji: '🤩',
    tone: 'expansive',
    prompts: [
      "What's fueling your energy right now?",
      "Describe this feeling — what does 'great' look like for you today?",
      "What's something exciting on the horizon?",
      "How can you bottle this feeling for a harder day?",
      "Who do you want to share this energy with?",
      "What's one bold thing you'd do if you felt like this every day?",
      "What clicked or fell into place recently?",
      "Write a note to your future self about why today matters.",
    ],
  },
};

/**
 * Get a rotating prompt for a given mood level.
 * Rotates daily within the mood's prompt pool.
 */
export function getMoodPrompt(moodLevel: MoodLevel): string {
  const pool = MOOD_PROMPTS[moodLevel];
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % pool.prompts.length;
  return pool.prompts[dayIndex];
}

/**
 * Get multiple prompts for a mood level (for showing options).
 * Returns 2-3 prompts, rotating daily.
 */
export function getMoodPrompts(moodLevel: MoodLevel, count: number = 2): string[] {
  const pool = MOOD_PROMPTS[moodLevel];
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const results: string[] = [];
  for (let i = 0; i < Math.min(count, pool.prompts.length); i++) {
    results.push(pool.prompts[(dayIndex + i) % pool.prompts.length]);
  }
  return results;
}

/**
 * Get the prompt pool metadata for a mood level.
 */
export function getMoodPoolInfo(moodLevel: MoodLevel): Omit<MoodPromptPool, 'prompts'> {
  const { prompts, ...info } = MOOD_PROMPTS[moodLevel];
  return info;
}

/**
 * Get a mood-aware affirmation after check-in.
 */
const MOOD_AFFIRMATIONS: Record<MoodLevel, string[]> = {
  1: [
    "It takes courage to show up when things are hard. You did that.",
    "You don't have to carry this alone.",
    "Even on rough days, you matter.",
  ],
  2: [
    "Acknowledging how you feel is the first step. You're doing it.",
    "Low days don't define you. They're just part of the story.",
    "You showed up for yourself today. That counts.",
  ],
  3: [
    "Okay is a perfectly valid place to be.",
    "Not every day needs to be extraordinary. You're doing fine.",
    "Checking in with yourself is a quiet act of self-care.",
  ],
  4: [
    "You earned this good feeling. Let yourself enjoy it.",
    "Good days are worth noticing. Well done.",
    "Your energy is contagious — even to yourself.",
  ],
  5: [
    "This is your moment. Soak it in.",
    "When you feel this good, the world feels it too.",
    "Remember this feeling — it's proof of what's possible.",
  ],
};

export function getMoodAffirmation(moodLevel: MoodLevel): string {
  const pool = MOOD_AFFIRMATIONS[moodLevel];
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % pool.length;
  return pool[dayIndex];
}

/**
 * Map mood level to a prompt_type string for companion_context.
 */
export function getMoodPromptType(moodLevel: MoodLevel): string {
  const types: Record<MoodLevel, string> = {
    1: 'crisis_mood',
    2: 'low_mood',
    3: 'neutral',
    4: 'positive',
    5: 'high_mood',
  };
  return types[moodLevel];
}
