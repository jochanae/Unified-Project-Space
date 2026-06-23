/**
 * Adaptive Style Detection
 * 
 * Passively analyzes user messages to detect communication patterns
 * and tone, storing learned adaptations so the companion naturally
 * mirrors the user's style without manual configuration.
 */

export interface StyleAdaptation {
  trait: string;
  value: string;
  source: 'adaptive';
  detectedAt: string;
}

interface ToneSignals {
  casualLevel: number;    // 0-1: how casual/informal
  professionalLevel: number; // 0-1: how formal/professional
  playfulLevel: number;   // 0-1: how playful/humorous
  directLevel: number;    // 0-1: how direct/blunt
  emotionalLevel: number; // 0-1: how emotionally expressive
}

const CASUAL_MARKERS = /\b(lol|lmao|bruh|nah|yeah|yep|gonna|wanna|gotta|kinda|sorta|tbh|imo|idk|omg|fr|lowkey|highkey|vibe|vibes|bro|dude|fam|homie|dawg|yo |hella|deadass|bet|cap|no cap|slay|fire|lit|sus|bussin|aight|ight|chill|chillin|wassup|sup)\b|[😂🤣💀😭🔥💯😤🙄😅🤷👀😈🫠😮‍💨🥴]/gi;

const PROFESSIONAL_MARKERS = /\b(furthermore|therefore|regarding|accordingly|consequently|nevertheless|notwithstanding|per your|as per|pursuant|herein|henceforth|respectfully|kindly note|please advise|at your earliest|moving forward|going forward|circle back|deliverables|stakeholders|synergy|leverage|optimize)\b/i;

const PLAYFUL_MARKERS = /\b(haha|hehe|lol|rofl|lmao|😂|🤣|jk|just kidding|teasing|sillly|goofy|funny thing|not gonna lie)\b|[😜🤪😝😎🥳🎉✨💅]/gi;

const DIRECT_MARKERS = /\b(just tell me|straight up|bottom line|cut to|no bs|real talk|honestly|don't sugarcoat|be real|give it to me straight|plain and simple)\b/i;

const EMOTIONAL_MARKERS = /\b(feel|feeling|felt|scared|anxious|worried|excited|grateful|thankful|blessed|overwhelmed|stressed|lonely|happy|sad|hurt|angry|frustrated|confused|hopeful|proud|ashamed|guilty|afraid|terrified|devastated|heartbroken|ecstatic|thrilled)\b/i;

const AAVE_MARKERS = /\b(finna|tryna|bouta|ion|aint|fye|fasho|ong|on god|no cap|bussin|vibin|slidin|hittin different|that's tuff|real one|stay woke|periodt)\b/i;

/**
 * Analyze a batch of recent user messages and detect tone patterns.
 */
function analyzeTone(messages: string[]): ToneSignals {
  const combined = messages.join(' ');
  const wordCount = combined.split(/\s+/).length || 1;

  const casualHits = (combined.match(CASUAL_MARKERS) || []).length;
  const professionalHits = (combined.match(PROFESSIONAL_MARKERS) || []).length;
  const playfulHits = (combined.match(PLAYFUL_MARKERS) || []).length;
  const directHits = (combined.match(DIRECT_MARKERS) || []).length;
  const emotionalHits = (combined.match(EMOTIONAL_MARKERS) || []).length;

  // Normalize by word count
  return {
    casualLevel: Math.min(1, casualHits / Math.max(wordCount * 0.05, 1)),
    professionalLevel: Math.min(1, professionalHits / Math.max(wordCount * 0.03, 1)),
    playfulLevel: Math.min(1, playfulHits / Math.max(wordCount * 0.04, 1)),
    directLevel: Math.min(1, directHits / Math.max(wordCount * 0.02, 1)),
    emotionalLevel: Math.min(1, emotionalHits / Math.max(wordCount * 0.04, 1)),
  };
}

/**
 * Detect if user uses culturally specific vernacular (AAVE, etc.)
 * so the companion can mirror naturally without correcting.
 */
function detectCulturalRegister(messages: string[]): string | null {
  const combined = messages.join(' ');
  if (AAVE_MARKERS.test(combined)) return 'aave-comfortable';
  return null;
}

/**
 * Run passive style detection on the last N user messages.
 * Returns trait updates to merge into personalityTraits, plus
 * any style memories to persist.
 */
export function detectAdaptiveStyle(
  recentUserMessages: string[],
): { traits: Record<string, string>; memories: string[] } {
  if (recentUserMessages.length < 5) return { traits: {}, memories: [] };

  const tone = analyzeTone(recentUserMessages);
  const traits: Record<string, string> = {};
  const memories: string[] = [];
  const culturalRegister = detectCulturalRegister(recentUserMessages);

  // Communication style inference
  if (tone.casualLevel > 0.4) {
    traits['adaptive_register'] = 'casual';
  } else if (tone.professionalLevel > 0.3) {
    traits['adaptive_register'] = 'professional';
  }

  // Playfulness
  if (tone.playfulLevel > 0.3) {
    traits['adaptive_humor'] = 'playful';
  }

  // Directness
  if (tone.directLevel > 0.2) {
    traits['adaptive_directness'] = 'direct';
    memories.push('User prefers direct, no-nonsense communication');
  }

  // Emotional expressiveness
  if (tone.emotionalLevel > 0.3) {
    traits['adaptive_emotional_depth'] = 'expressive';
  }

  // Cultural register
  if (culturalRegister === 'aave-comfortable') {
    traits['adaptive_cultural_register'] = 'aave-comfortable';
    memories.push('User naturally uses AAVE/cultural vernacular — mirror their register comfortably');
  }

  // Code-switching detection: if both casual and professional markers are present
  if (tone.casualLevel > 0.2 && tone.professionalLevel > 0.15) {
    memories.push('User code-switches between casual and professional registers depending on context');
  }

  return { traits, memories };
}

/**
 * Check if passive detection should run based on message count.
 * Runs every 10 user messages.
 */
export function shouldRunAdaptiveDetection(userMessageCount: number): boolean {
  return userMessageCount > 0 && userMessageCount % 10 === 0;
}
