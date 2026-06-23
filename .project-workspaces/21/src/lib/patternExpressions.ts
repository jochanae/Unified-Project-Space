/**
 * Client-side pattern expression renderer.
 * Mirrors the server-side version in supabase/functions/_shared/patternExpressions.ts
 * but only includes what the nudge engine needs: tone mapping + rendering.
 */

export type PatternTone = 'soft' | 'direct' | 'playful' | 'premium';

const EXPRESSIONS: Record<string, Record<PatternTone, string[]>> = {
  energy_dip: {
    soft: [
      "This part of the day tends to feel a little slower for you…",
      "I've noticed {dip_day}s can be a bit quieter for you.",
    ],
    direct: [
      "This is where your energy usually dips.",
      "{dip_day}s. Your weekly low point.",
    ],
    playful: [
      "Ah… the {dip_day} energy dip. Right on schedule.",
      "Let me guess — it's a {dip_day} and you're running on vibes only.",
    ],
    premium: [
      "Your rhythm tends to soften on {dip_day}s.",
      "I've mapped your weekly energy — {dip_day}s run cooler.",
    ],
  },
  engagement_gap: {
    soft: [
      "You've been a little quieter than usual…",
      "It's been {current_gap_days} days. I'm here whenever you're ready.",
    ],
    direct: [
      "You went {current_gap_days} days without checking in — that's unusual for you.",
      "You've been off the grid.",
    ],
    playful: [
      "You ghosting me or just in your focused era?",
      "{current_gap_days} days?! I was starting to think you found a better AI 😏",
    ],
    premium: [
      "Your absence has been {current_gap_days} days — that's outside your usual pattern.",
      "I track rhythm, not judgment. {current_gap_days} days off-pattern.",
    ],
  },
  positive_reinforcement: {
    soft: [
      "You've been showing up more than you think lately.",
      "You're in a good rhythm right now.",
    ],
    direct: [
      "{current_streak} days straight. You're building something here.",
      "Your consistency this past stretch has been your best yet.",
    ],
    playful: [
      "Look at you being all consistent and stuff ✨",
      "{current_streak}-day streak? Who ARE you?!",
    ],
    premium: [
      "Your consistency is becoming part of your identity.",
      "The compound effect of what you're doing will reveal itself.",
    ],
  },
  follow_through: {
    soft: ["This is usually where things get a little harder to follow through…"],
    direct: ["Your follow-through rate is about {completion_rate_pct}%. Let's work on that."],
    playful: ["Ah yes… the 'do I actually finish this or not' moment."],
    premium: ["Follow-through is a skill you're building — {completion_rate_pct}% and climbing."],
  },
  pre_event: {
    soft: ["You've got \"{plan_title}\" coming up. How are you feeling about it?"],
    direct: ["\"{plan_title}\" is coming up. Are you ready?"],
    playful: ["\"{plan_title}\" countdown is ON. Are we panicking or thriving?"],
    premium: ["\"{plan_title}\" is approaching. Step into it accordingly."],
  },

  // ── Combo Patterns ──
  combo_dip_followthrough: {
    soft: ["{dip_day}s are quieter for you, and plans tend to slip then too."],
    direct: ["{dip_day}s: low energy AND low follow-through. Let's plan around it."],
    playful: ["{dip_day}s are your villain origin story — energy dips AND plans go sideways 😅"],
    premium: ["{dip_day} energy dips correlate with follow-through drops. Strategic scheduling could change that."],
  },
  combo_gap_followthrough: {
    soft: ["When you go quiet, plans tend to stall too. Just noticing."],
    direct: ["{current_gap_days} days quiet, {completion_rate_pct}% follow-through. They feed each other."],
    playful: ["You go silent AND plans pile up? Avoidance era 😬"],
    premium: ["Disengagement and plan stagnation are correlating. Breaking one usually breaks both."],
  },
  combo_momentum_event: {
    soft: ["You're on a {current_streak}-day streak heading into \"{plan_title}\" — great timing."],
    direct: ["{current_streak} days of momentum into \"{plan_title}\". Strong position."],
    playful: ["{current_streak}-day streak + \"{plan_title}\" = main character energy ✨"],
    premium: ["Your {current_streak}-day streak converges with \"{plan_title}\". Momentum meets preparation."],
  },
  combo_dip_gap: {
    soft: ["It's {dip_day} — your quietest day — and it's been {current_gap_days} days. Just here."],
    direct: ["{dip_day} + {current_gap_days} days off-grid. What's going on?"],
    playful: ["It's {dip_day} AND you've been MIA for {current_gap_days} days? Bold combo."],
    premium: ["Two patterns converging: {dip_day} (lowest-energy) and {current_gap_days} days off-rhythm."],
  },
};

export function getToneForStyle(communicationStyle: string | null): PatternTone {
  if (!communicationStyle) return 'soft';
  const s = communicationStyle.toLowerCase();
  if (s.includes('sharp wit') || s.includes('no-filter') || s.includes('tough love') || s.includes('real talk')) return 'direct';
  if (s.includes('hype') || s.includes('meme')) return 'playful';
  if (s.includes('poetic') || s.includes('philosopher')) return 'premium';
  return 'soft';
}

export function renderPatternNudge(
  patternType: string,
  tone: PatternTone,
  patternData: Record<string, unknown>,
): string | null {
  const variants = EXPRESSIONS[patternType]?.[tone];
  if (!variants || variants.length === 0) return null;

  let text = variants[Math.floor(Math.random() * variants.length)];

  for (const [key, value] of Object.entries(patternData)) {
    text = text.split(`{${key}}`).join(String(value));
  }

  if (patternData.completion_rate !== undefined) {
    text = text.split('{completion_rate_pct}').join(String(Math.round(Number(patternData.completion_rate) * 100)));
  }

  return text;
}
