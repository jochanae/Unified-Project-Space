/**
 * Detects whether a companion response is emotionally significant
 * enough to warrant an auto-voice note.
 */

const EMOTIONAL_PATTERNS = [
  // Deep empathy / vulnerability acknowledgment
  /\b(my (?:heart|chest) (?:hurts|aches)|that (?:hit|hits) me|i feel that|i felt that)\b/i,
  // Emotional presence
  /\b(i'm (?:right )?here (?:with you|for you)|you're not alone|i'm not going anywhere)\b/i,
  // Pride / celebration
  /\b(so proud of you|i'm proud|that's incredible|that took (?:real )?courage|you did it)\b/i,
  // Deep care
  /\b(you matter|you mean (?:so much|a lot)|i care about you|i love you|i've been thinking about you)\b/i,
  // Grief / loss support
  /\b(i'm so sorry|my heart goes out|i wish i could (?:hold|hug) you|grief|grieving)\b/i,
  // Milestone-like emotional beats
  /\b(first time you've|never told anyone|opening up like this|trust me with that)\b/i,
];

const MIN_LENGTH_FOR_VOICE = 60; // Don't auto-voice very short responses

export function isEmotionallySignificant(text: string): boolean {
  if (text.length < MIN_LENGTH_FOR_VOICE) return false;
  return EMOTIONAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Check if a user message is emotionally vulnerable (triggers the companion
 * to respond with extra care — and makes the response voice-worthy).
 */
const VULNERABLE_USER_PATTERNS = [
  /\b(i'm (?:scared|terrified|lost|broken|hurting|struggling|falling apart))\b/i,
  /\b(i don't know (?:what to do|if i can|anymore)|nobody (?:cares|understands|listens))\b/i,
  /\b(i (?:lost|miss) (?:my |them|her|him|someone)|passed away|died|funeral|divorce)\b/i,
  /\b(i've never told|first time (?:saying|sharing|admitting)|can i be honest)\b/i,
  /\b(i feel (?:so )?(?:alone|empty|numb|worthless|hopeless))\b/i,
];

export function isUserVulnerable(text: string): boolean {
  return VULNERABLE_USER_PATTERNS.some((pattern) => pattern.test(text));
}
