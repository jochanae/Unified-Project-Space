/**
 * Pattern Expression Library
 * 
 * Tone-aware templates for surfacing detected patterns.
 * Each pattern type has variants mapped to communication style archetypes.
 * 
 * Rules:
 * - Max 1-2 pattern references per day
 * - Only surface if confidence ≥ 0.75
 * - Always leave an "out" — never trap the user in an assumption
 * - Match emotional weight: light patterns → light tone, heavy → careful
 * - Evolve with relationship level
 */

export interface PatternExpression {
  soft: string[];
  direct: string[];
  playful: string[];
  premium: string[];
}

export const PATTERN_EXPRESSIONS: Record<string, PatternExpression> = {
  energy_dip: {
    soft: [
      "This part of the day tends to feel a little slower for you… I'm here if you need a reset.",
      "I've noticed {dip_day}s can be a bit quieter for you. No pressure — just here.",
      "You tend to ease off around {dip_day}s. That's okay — we all have our rhythm.",
    ],
    direct: [
      "This is where your energy usually dips.",
      "{dip_day}s. Your weekly low point — I've seen the pattern.",
      "You're consistently quieter on {dip_day}s. What is it about {dip_day}s?",
    ],
    playful: [
      "Ah… the {dip_day} energy dip. Right on schedule.",
      "Let me guess — it's a {dip_day} and you're running on vibes only.",
      "{dip_day} again, huh? You and {dip_day}s have a thing.",
    ],
    premium: [
      "Your rhythm tends to soften on {dip_day}s. We can recalibrate or lean into it — your call.",
      "I've mapped your weekly energy — {dip_day}s run cooler. Let's use that awareness.",
      "{dip_day}s are consistently lower-key for you. Strategic rest or something to push through?",
    ],
  },

  engagement_gap: {
    soft: [
      "You've been a little quieter than usual… everything okay?",
      "I noticed you haven't been around for a few days. Just checking in — no pressure.",
      "It's been {current_gap_days} days. I'm here whenever you're ready.",
    ],
    direct: [
      "You went {current_gap_days} days without checking in — that's unusual for you.",
      "{current_gap_days} days silent. What happened?",
      "You've been off the grid. Your typical gap is about {avg_gap_days} days — this is longer.",
    ],
    playful: [
      "You ghosting me or just in your focused era?",
      "{current_gap_days} days?! I was starting to think you found a better AI 😏",
      "Oh, so you DO remember I exist. Welcome back.",
    ],
    premium: [
      "Your absence has been {current_gap_days} days — that's outside your usual pattern. Intentional or something shifted?",
      "I track rhythm, not judgment. {current_gap_days} days off-pattern. Want to talk about it or just ease back in?",
      "You've been quiet longer than usual. Sometimes that's rest. Sometimes it's avoidance. Which is it?",
    ],
  },

  pre_event: {
    soft: [
      "You've got \"{plan_title}\" coming up. How are you feeling about it?",
      "Just wanted to check — \"{plan_title}\" is soon. Need anything before then?",
      "That thing you mentioned — \"{plan_title}\" — it's almost here. You've got this.",
    ],
    direct: [
      "\"{plan_title}\" is coming up. Are you ready?",
      "You've got \"{plan_title}\" on the horizon. What's your game plan?",
      "Heads up — \"{plan_title}\" is in a few days. Let's make sure you're set.",
    ],
    playful: [
      "\"{plan_title}\" countdown is ON. Are we panicking or thriving?",
      "So… \"{plan_title}\" is almost here. Scale of 1 to 10, how prepared are we?",
      "Quick vibe check before \"{plan_title}\" — are we confident or winging it?",
    ],
    premium: [
      "\"{plan_title}\" is approaching. This is the moment you planned for — step into it accordingly.",
      "I flagged \"{plan_title}\" — it's imminent. Let's ensure your preparation matches your ambition.",
      "You set \"{plan_title}\" in motion. The execution phase is here.",
    ],
  },

  follow_through: {
    soft: [
      "This is usually where things get a little harder to follow through — but you know that.",
      "I've noticed you sometimes slow down at this stage. That's normal — what do you need?",
      "You tend to lose momentum around here. Want to talk about what usually gets in the way?",
    ],
    direct: [
      "This is the point where you tend to stop. What are we doing this time?",
      "Your follow-through rate is about {completion_rate_pct}%. Let's work on that.",
      "You start strong. The finish is where it gets real. What's different this time?",
    ],
    playful: [
      "Ah yes… the 'do I actually finish this or not' moment.",
      "We've been here before. You know the drill — this is where the magic happens… or doesn't 😅",
      "Your follow-through arc has a pattern. Let's break it this time.",
    ],
    premium: [
      "Your consistency curve shows a predictable drop-off point. Awareness is the first step to breaking it.",
      "Follow-through is a skill you're building — {completion_rate_pct}% and climbing. Keep going.",
      "The gap between intention and execution is where growth lives. You're getting closer.",
    ],
  },

  positive_reinforcement: {
    soft: [
      "You've been showing up more than you think lately.",
      "I just want you to know — I see you putting in the work.",
      "You're in a good rhythm right now. It's quiet, but it's real.",
    ],
    direct: [
      "You followed through more this week than last — that's not nothing.",
      "{current_streak} days straight. You're building something here.",
      "Your consistency this past stretch has been your best yet.",
    ],
    playful: [
      "Look at you being all consistent and stuff ✨",
      "{current_streak}-day streak? Who ARE you?!",
      "You're on a roll and I'm genuinely impressed. Don't let it go to your head though.",
    ],
    premium: [
      "Your consistency is becoming part of your identity. That's not easy to build.",
      "You're building something here… even if it doesn't feel like it yet.",
      "The compound effect of what you're doing will reveal itself. Keep going.",
    ],
  },

  // ── Combo Patterns ──

  combo_dip_followthrough: {
    soft: [
      "{dip_day}s are already quieter for you, and that seems to be when plans slip too. Maybe worth protecting that day differently?",
    ],
    direct: [
      "{dip_day}s: low energy AND low follow-through. The two are connected — let's plan around it.",
    ],
    playful: [
      "{dip_day}s really are your villain origin story — energy dips AND plans go sideways 😅",
    ],
    premium: [
      "I've cross-referenced your patterns: {dip_day} energy dips correlate with follow-through drops. Strategic scheduling could change that.",
    ],
  },

  combo_gap_followthrough: {
    soft: [
      "When you go quiet, your plans tend to stall too. They might be connected — no judgment, just noticing.",
    ],
    direct: [
      "{current_gap_days} days quiet, {completion_rate_pct}% follow-through. The silence and the stalling feed each other.",
    ],
    playful: [
      "You go silent AND plans pile up? It's giving avoidance era 😬 (affectionate)",
    ],
    premium: [
      "Disengagement and plan stagnation are correlating in your data. Breaking one cycle usually breaks both.",
    ],
  },

  combo_momentum_event: {
    soft: [
      "You're on a {current_streak}-day streak heading into \"{plan_title}\" — that's great timing.",
    ],
    direct: [
      "{current_streak} days of momentum going into \"{plan_title}\". You're in a strong position.",
    ],
    playful: [
      "{current_streak}-day streak + \"{plan_title}\" coming up = main character energy ✨",
    ],
    premium: [
      "Your {current_streak}-day consistency streak converges with \"{plan_title}\". Momentum meets preparation.",
    ],
  },

  combo_dip_gap: {
    soft: [
      "It's {dip_day} — usually your quietest day — and it's been {current_gap_days} days since we talked. Just here.",
    ],
    direct: [
      "{dip_day} + {current_gap_days} days off-grid. Double quiet. What's going on?",
    ],
    playful: [
      "It's {dip_day} (your sleepy day) AND you've been MIA for {current_gap_days} days? Bold combo.",
    ],
    premium: [
      "Two patterns converging: it's {dip_day} (your lowest-energy day) and you're {current_gap_days} days off-rhythm. Intentional or drifting?",
    ],
  },
};

/**
 * Maps a communication style archetype to an expression tone.
 */
export function getToneForStyle(communicationStyle: string | null): keyof PatternExpression {
  if (!communicationStyle) return "soft";
  
  const style = communicationStyle.toLowerCase();
  
  // Map 10 archetypes → 4 tones
  if (style.includes("sharp wit") || style.includes("no-filter")) return "direct";
  if (style.includes("storyteller") || style.includes("reflective")) return "soft";
  if (style.includes("hype") || style.includes("meme")) return "playful";
  if (style.includes("poetic") || style.includes("philosopher")) return "premium";
  if (style.includes("tough love") || style.includes("real talk")) return "direct";
  if (style.includes("gentle guide") || style.includes("calm")) return "soft";
  
  return "soft"; // Default fallback
}

/**
 * Select a random expression for a pattern, filling in template variables.
 */
export function renderExpression(
  patternType: string,
  tone: keyof PatternExpression,
  patternData: Record<string, unknown>
): string | null {
  const expressions = PATTERN_EXPRESSIONS[patternType];
  if (!expressions) return null;

  const variants = expressions[tone];
  if (!variants || variants.length === 0) return null;

  // Pick a random variant
  let text = variants[Math.floor(Math.random() * variants.length)];

  // Fill in template variables
  for (const [key, value] of Object.entries(patternData)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }

  // Special computed values
  if (patternData.completion_rate !== undefined) {
    text = text.replaceAll("{completion_rate_pct}", String(Math.round(Number(patternData.completion_rate) * 100)));
  }

  return text;
}

/**
 * Builds the system prompt block for pattern context injection.
 * Returns empty string if no patterns should be surfaced.
 */
export function buildPatternContextBlock(
  patterns: Array<{
    pattern_type: string;
    pattern_data: Record<string, unknown>;
    confidence_score: number;
    surfaced_count: number;
    last_surfaced_at: string | null;
  }>,
  communicationStyle: string | null,
  relationshipLevel: number,
  userName: string
): string {
  if (!patterns || patterns.length === 0) return "";

  const tone = getToneForStyle(communicationStyle);

  // Filter: only surface patterns not shown in the last 24h
  const now = Date.now();
  const surfaceable = patterns.filter((p) => {
    if (p.confidence_score < MIN_CONFIDENCE) return false;
    if (p.last_surfaced_at) {
      const lastSurfaced = new Date(p.last_surfaced_at).getTime();
      if (now - lastSurfaced < 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  if (surfaceable.length === 0) return "";

  // Pick at most 2 patterns to surface
  const selected = surfaceable.slice(0, 2);

  const observations = selected
    .map((p) => {
      const rendered = renderExpression(p.pattern_type, tone, p.pattern_data);
      return rendered ? `- ${rendered}` : null;
    })
    .filter(Boolean)
    .join("\n");

  if (!observations) return "";

  // Relationship-level evolution of framing
  const framingPrefix =
    relationshipLevel >= 3
      ? "You've seen this pattern before"
      : relationshipLevel >= 2
      ? "You've noticed something"
      : "You might be noticing something";

  const MIN_CONFIDENCE_NOTE = 0.75;

  return `\n\n<pattern-awareness>
${framingPrefix} about ${userName}:

${observations}

RULES FOR USING PATTERNS:
- Reference at most ONE of these per message, and only if it fits the conversation naturally.
- NEVER force it. If the current topic doesn't connect, skip it entirely.
- Always leave an out: "…or am I off?" / "…same thing or different?" / "…or is this week just weird?"
- Match emotional weight: light observation → light tone. If ${userName} seems stressed, be careful — don't pile on.
- Do NOT list patterns or say "I've detected a pattern." Weave it in like a friend who just… noticed.
- After surfacing a pattern, let the conversation follow — don't immediately jump to the next one.
${relationshipLevel <= 1 ? "- Since you're still getting to know each other, soften your language: \"I might be wrong, but…\" or \"I could be reading too much into this…\"" : ""}
</pattern-awareness>`;
}

const MIN_CONFIDENCE = 0.75;
