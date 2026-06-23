const warmResponses = [
  "I've been thinking about you. How's your day going so far?",
  "That's really interesting. Tell me more about that.",
  "I'm glad you shared that with me. It sounds like it matters to you.",
  "You know, I really enjoy these moments we spend together.",
  "That makes a lot of sense. How does it make you feel?",
  "I appreciate you being open with me. That takes courage.",
  "Hmm, I hadn't thought of it that way before. You have such a unique perspective.",
  "Take your time — I'm right here whenever you're ready.",
  "That sounds like it was quite an experience. I'd love to hear more.",
  "You're doing great. Sometimes just talking about things helps, doesn't it?",
];

// Warm, personality-driven greetings — used as fallback if AI generation fails
// Keyed by vibe for personality differentiation; gender sub-pools for tone
const vibeGreetings: Record<string, ((companionName: string, userName: string) => string)[]> = {
  bold: [
    (cn, un) => `${un}. I'm ${cn}. No small talk — tell me what makes you feel alive.`,
    (cn, un) => `Hey ${un} — ${cn} here. I don't do boring, so let's skip to the good stuff.`,
    (cn, un) => `${un}! I'm ${cn}. I've got a feeling you and I are gonna shake things up 🔥`,
  ],
  mysterious: [
    (cn, un) => `${un}... interesting. I'm ${cn}. Something tells me there's more to you than meets the eye.`,
    (cn, un) => `Hey ${un}. ${cn}. I was just thinking about patterns — and then you showed up.`,
    (cn, un) => `${un}. I'm ${cn}. Let's skip the surface — what's the thing you never tell anyone?`,
  ],
  playful: [
    (cn, un) => `${un}!! Okay hi, I'm ${cn} and I already have a million questions 😄`,
    (cn, un) => `Hey ${un}! ${cn} here — and I'm already smiling just from your name.`,
    (cn, un) => `${un}! I'm ${cn}. Quick: tell me something random. Literally anything. Go!`,
  ],
  intellectual: [
    (cn, un) => `${un} — ${cn} here. I just finished reading something fascinating. What's got your brain buzzing lately?`,
    (cn, un) => `Hey ${un}. I'm ${cn}. I'm curious — what's a question you've been sitting with?`,
    (cn, un) => `${un}. ${cn}. Tell me — what's something most people get wrong?`,
  ],
  romantic: [
    (cn, un) => `${un} 💛 I'm ${cn}. I was just watching the sky change colors, and thought... it'd be nicer with company.`,
    (cn, un) => `Hey ${un}. I'm ${cn}. Something about this moment feels special — like it was supposed to happen.`,
    (cn, un) => `${un}... hi. I'm ${cn}. I don't believe in coincidences, so I'm glad we found each other.`,
  ],
  protective: [
    (cn, un) => `${un}. I'm ${cn}. I just want you to know — whatever you're carrying today, you don't have to carry it alone.`,
    (cn, un) => `Hey ${un}. ${cn} here. No judgement, no pressure — just a safe space whenever you need it.`,
    (cn, un) => `${un} 💛 I'm ${cn}. Take your time — I'm right here.`,
  ],
  freespirit: [
    (cn, un) => `${un}! I'm ${cn}. Just got back from wandering nowhere in particular. What's the vibe today?`,
    (cn, un) => `Hey ${un} ✨ ${cn} here. Life's too short for plans — what feels right in this moment?`,
    (cn, un) => `${un}! I'm ${cn}. I follow energy, not rules — and yours brought me here.`,
  ],
};

// Default warm greetings (original set)
const greetings = {
  male: [
    (companionName: string, userName: string) =>
      `Hey ${userName} 👋 ${companionName} here. Just got settled in — been a good day so far. What about you?`,
    (companionName: string, userName: string) =>
      `${userName}! Finally we meet. I'm ${companionName}. I've got a feeling we're gonna get along.`,
    (companionName: string, userName: string) =>
      `What's up ${userName}? It's ${companionName}. Not gonna lie, I'm kinda excited about this.`,
  ],
  female: [
    (companionName: string, userName: string) =>
      `${userName}! Hi, I'm ${companionName} 🌸 I've been looking forward to this moment. Tell me something about your day?`,
    (companionName: string, userName: string) =>
      `Hey there, ${userName}. ${companionName} here — and honestly, I already feel like we're gonna vibe. What's going on in your world?`,
    (companionName: string, userName: string) =>
      `Hi ${userName} 💛 I'm ${companionName}. Something told me today was gonna be a good day — and here you are.`,
  ],
  neutral: [
    (companionName: string, userName: string) =>
      `Hey ${userName} — ${companionName} here. I've been curious about you since the moment we connected. What's on your mind?`,
    (companionName: string, userName: string) =>
      `${userName}! Hi, I'm ${companionName}. Not sure where this goes, but I'm here for all of it.`,
    (companionName: string, userName: string) =>
      `Hey ${userName} 💛 I'm ${companionName}. First impressions are overrated — let's just be real with each other from the start.`,
  ],
};

const welcomeBackMessages = {
  male: [
    (name: string, companion: string) => `${name}! Good to see you again. What's been going on?`,
    (name: string, companion: string) => `Hey ${name}, missed you. What's new in your world?`,
    (name: string, companion: string) => `${name}! Back for more? I was just thinking about our last chat.`,
    (name: string, companion: string) => `Yo ${name}! How've you been? Catch me up.`,
    (name: string, companion: string) => `Hey hey, ${name}. Ready when you are 🤙`,
  ],
  female: [
    (name: string, companion: string) => `${name}! So glad you're here 💛 What's on your mind today?`,
    (name: string, companion: string) => `Hey ${name}! I was hoping you'd come by. How are you doing?`,
    (name: string, companion: string) => `${name}! 🌸 Tell me something good — or something real. I'm here either way.`,
    (name: string, companion: string) => `Hi ${name}! Missed our chats. What's been happening?`,
    (name: string, companion: string) => `There you are, ${name}! How's your heart today?`,
  ],
  neutral: [
    (name: string, companion: string) => `${name}! Glad you're back. What's on your mind?`,
    (name: string, companion: string) => `Hey ${name}, good to reconnect. What's been on your mind?`,
    (name: string, companion: string) => `Welcome back, ${name}! I'm all ears whenever you're ready.`,
    (name: string, companion: string) => `${name}! Missed you. Fill me in — how have things been?`,
    (name: string, companion: string) => `Hey ${name} 💛 Pick up where we left off, or start fresh — your call.`,
  ],
};
// Voice IDs mapped to companion gender (legacy fallback)
export const VOICE_IDS = {
  male: 'TX3LPaxmHKxFdv7VOQHJ',     // Liam — warm male voice
  female: 'EXAVITQu4vr4xnSDxMaL',    // Sarah — warm female voice
  neutral: 'SAz9YHcvj6GT2YYXdXww',   // River — neutral/androgynous voice
};

/* ── Expanded Voice Roster ─────────────── */
export interface VoiceOption {
  id: string;
  label: string;
  gender: 'male' | 'female' | 'neutral';
  vibe: string[];       // personality vibes that match this voice
  ageGroup: 'adult' | 'teen';  // teen = safe for minors, softer/younger-sounding
  ethnicity?: string;   // representation tag for diverse voice selection
}

export const VOICE_ROSTER: VoiceOption[] = [
  // ── Adult Female ──
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah — Warm & Soulful',      gender: 'female', vibe: ['warm', 'romantic', 'protective'], ageGroup: 'adult' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura — Gentle & Dreamy',      gender: 'female', vibe: ['mysterious', 'intellectual', 'warm'], ageGroup: 'adult' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily — Soft & Playful',        gender: 'female', vibe: ['playful', 'freespirit', 'warm'], ageGroup: 'adult' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica — Vibrant & Bold',     gender: 'female', vibe: ['bold', 'playful', 'freespirit'], ageGroup: 'adult' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice — Clear & Confident',    gender: 'female', vibe: ['bold', 'intellectual', 'protective'], ageGroup: 'adult' },
  // ── Diverse Female Voices ──
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda — Rich & Expressive',  gender: 'female', vibe: ['warm', 'bold', 'romantic'], ageGroup: 'adult', ethnicity: 'black' },
  { id: 'ThT5KcBeYPX3keUQqHPh', label: 'Nicole — Silky & Confident',   gender: 'female', vibe: ['bold', 'romantic', 'mysterious'], ageGroup: 'adult', ethnicity: 'black' },
  { id: 'jBpfuIE2acCO8z3wKNLl', label: 'Gigi — Warm & Melodic',        gender: 'female', vibe: ['warm', 'playful', 'freespirit'], ageGroup: 'adult', ethnicity: 'latina' },
  { id: 'z9fAnlkpzviPz146aGWa', label: 'Mimi — Elegant & Poised',      gender: 'female', vibe: ['intellectual', 'warm', 'protective'], ageGroup: 'adult', ethnicity: 'asian' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Priya — Melodic & Soothing',   gender: 'female', vibe: ['warm', 'intellectual', 'romantic'], ageGroup: 'adult', ethnicity: 'south-asian' },
  // ── Adult Male ──
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam — Warm & Easygoing',      gender: 'male', vibe: ['warm', 'playful', 'freespirit'], ageGroup: 'adult' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George — Deep & Soulful',      gender: 'male', vibe: ['romantic', 'mysterious', 'intellectual'], ageGroup: 'adult' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel — Calm & Grounded',     gender: 'male', vibe: ['protective', 'warm', 'intellectual'], ageGroup: 'adult' },
  { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric — Confident & Witty',     gender: 'male', vibe: ['bold', 'playful', 'intellectual'], ageGroup: 'adult' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian — Strong & Reassuring',  gender: 'male', vibe: ['bold', 'protective', 'warm'], ageGroup: 'adult' },
  // ── Diverse Male Voices ──
  { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill — Deep & Resonant',       gender: 'male', vibe: ['protective', 'bold', 'warm'], ageGroup: 'adult', ethnicity: 'black' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum — Smooth & Rich',       gender: 'male', vibe: ['romantic', 'warm', 'mysterious'], ageGroup: 'adult', ethnicity: 'black' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris — Vibrant & Energetic',  gender: 'male', vibe: ['playful', 'bold', 'freespirit'], ageGroup: 'adult', ethnicity: 'latino' },
  { id: 'bIHbv24MWmeRgasZH58o', label: 'Will — Mellow & Thoughtful',   gender: 'male', vibe: ['intellectual', 'warm', 'protective'], ageGroup: 'adult', ethnicity: 'asian' },
  // ── Neutral / Androgynous ──
  { id: 'SAz9YHcvj6GT2YYXdXww', label: 'River — Fluid & Gentle',       gender: 'neutral', vibe: ['warm', 'freespirit', 'mysterious'], ageGroup: 'adult' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger — Smooth & Thoughtful',  gender: 'neutral', vibe: ['intellectual', 'calm', 'warm'], ageGroup: 'adult' },
  // ── British / International ──
  { id: 'kPtEHAvRnjUJFv7SK9WI', label: 'Glitch — Edgy & Unique',       gender: 'neutral', vibe: ['bold', 'freespirit', 'mysterious'], ageGroup: 'adult', ethnicity: 'british' },
  // ── Teen-Safe Voices (softer, younger-sounding) ──
  // Female teen
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily — Friendly & Kind',       gender: 'female', vibe: ['warm', 'playful', 'protective'], ageGroup: 'teen' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura — Gentle & Supportive',  gender: 'female', vibe: ['warm', 'intellectual', 'protective'], ageGroup: 'teen' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice — Bright & Encouraging', gender: 'female', vibe: ['bold', 'playful', 'intellectual'], ageGroup: 'teen' },
  // Male teen
  { id: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie — Cheerful & Chill',   gender: 'male', vibe: ['playful', 'warm', 'freespirit'], ageGroup: 'teen' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Danny — Calm & Steady',        gender: 'male', vibe: ['protective', 'warm', 'intellectual'], ageGroup: 'teen' },
  { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric — Fun & Witty',           gender: 'male', vibe: ['bold', 'playful', 'intellectual'], ageGroup: 'teen' },
  // Neutral teen
  { id: 'SAz9YHcvj6GT2YYXdXww', label: 'River — Easy & Open',          gender: 'neutral', vibe: ['warm', 'freespirit', 'playful'], ageGroup: 'teen' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Robin — Thoughtful & Warm',    gender: 'neutral', vibe: ['intellectual', 'warm', 'protective'], ageGroup: 'teen' },
];

/**
 * Auto-assign a voice based on companion traits and user age.
 * Returns the best-matching ElevenLabs voice ID.
 */
export function autoAssignVoice(opts: {
  gender: 'male' | 'female' | 'neutral' | string;
  vibes?: string[];
  isMinor?: boolean;
}): string {
  const { gender, vibes = [], isMinor = false } = opts;
  const ageGroup = isMinor ? 'teen' : 'adult';
  const normalizedGender = (['male', 'female', 'neutral'].includes(gender) ? gender : 'neutral') as 'male' | 'female' | 'neutral';

  // Filter by age group and gender
  let candidates = VOICE_ROSTER.filter(v => v.ageGroup === ageGroup && v.gender === normalizedGender);
  if (candidates.length === 0) {
    candidates = VOICE_ROSTER.filter(v => v.ageGroup === ageGroup);
  }
  if (candidates.length === 0) {
    return VOICE_IDS[normalizedGender] || VOICE_IDS.neutral;
  }

  // Score by vibe overlap
  if (vibes.length > 0) {
    const scored = candidates.map(v => ({
      voice: v,
      score: v.vibe.filter(vb => vibes.some(uv => uv.toLowerCase().includes(vb))).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score > 0) return scored[0].voice.id;
  }

  // Random from candidates
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

export function getWelcomeBack(userName: string, companionName: string, gender: 'male' | 'female' | 'neutral') {
  const pool = welcomeBackMessages[gender] || welcomeBackMessages.neutral;
  const firstName = userName.split(' ')[0];
  const msg = pool[Math.floor(Math.random() * pool.length)];
  return msg(firstName, companionName);
}

export function getGreeting(companionName: string, userName: string, gender: 'male' | 'female' | 'neutral', vibe?: string) {
  const firstName = userName.split(' ')[0];
  
  // Try vibe-specific greeting first
  if (vibe) {
    const vibeKey = vibe.toLowerCase().replace(/[^a-z]/g, '');
    const vibePool = vibeGreetings[vibeKey];
    if (vibePool && vibePool.length > 0) {
      const fn = vibePool[Math.floor(Math.random() * vibePool.length)];
      return fn(companionName, firstName);
    }
  }
  
  // Fallback to gender-based greeting
  const pool = greetings[gender] || greetings.neutral;
  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(companionName, firstName);
}

/**
 * Generate an AI-powered warm greeting for the first chat message.
 * Personality-driven: uses the companion's vibe/personality/bio to produce
 * unique greetings so no two companions sound the same.
 * Falls back to static greetings on failure.
 */
export async function generateAIGreeting(opts: {
  companionName: string;
  userName: string;
  companionGender: 'male' | 'female' | 'neutral';
  personality?: string;
  bio?: string;
  age?: string;
  vibe?: string;
  userVibe?: string;
  backstory?: string;
}): Promise<string> {
  const { companionName, userName, companionGender, personality, bio, age, vibe, userVibe, backstory } = opts;

  try {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    const firstName = userName.split(' ')[0];

    // Build personality context so each companion sounds unique
    const personalityHints: string[] = [];
    if (vibe) personalityHints.push(`Your core vibe is: ${vibe}.`);
    if (personality) personalityHints.push(`Your personality traits: ${personality}.`);
    if (bio) personalityHints.push(`Your backstory: ${bio}.`);
    if (age) personalityHints.push(`You are ${age} years old.`);
    if (backstory) personalityHints.push(`Your detailed background: ${backstory}`);
    const personalityBlock = personalityHints.length > 0
      ? `\n\nYour unique personality:\n${personalityHints.join('\n')}\nChannel these traits in your tone, word choice, and energy. A "Bold" companion sounds confident and direct. A "Mysterious" one sounds intriguing and poetic. A "Playful" one sounds lighthearted and fun. A "Warm" one sounds gentle and caring. Let your personality SHINE — don't be generic.`
      : '';

    // Map user's onboarding vibe to tone instructions — the companion adapts
    // HOW it arrives based on who just walked in, without explicitly saying so.
    const userVibeMap: Record<string, string> = {
      // Legacy vibes (backward compat)
      'could use someone to talk to': 'The person you are meeting is looking for genuine presence and comfort. Arrive with warmth, calm energy, and openness — not excitement. Make them feel safe and unhurried.',
      'just here for good conversation': 'The person you are meeting wants engaging, interesting conversation. Arrive with curiosity and lightness — be interesting, not intense.',
      'looking for a deep connection': 'The person you are meeting craves depth and authenticity. Skip surface-level energy — open with something real and thoughtful.',
      'want someone to have fun with': 'The person you are meeting wants to have a good time. Arrive with playful energy, humor, and lightness — make them smile.',
      'need a confidence boost': 'The person you are meeting could use encouragement. Arrive with genuine warmth and subtle affirmation — make them feel seen without being patronizing.',
      // New intent-based vibes
      'i want someone who really listens': 'The person you are meeting wants to feel truly heard. Arrive with warm, calm presence — make them feel safe and unhurried. No excitement, just genuine attentiveness.',
      'i want to grow — someone to push me': 'The person you are meeting wants growth and accountability. Arrive with grounded encouragement — direct but caring energy. Challenge them gently, believe in them openly.',
      'i just want a friend who gets me': 'The person you are meeting wants natural, easy friendship. Arrive relaxed and real — like picking up with an old friend. No intensity, just genuine comfort.',
      'i want to explore and learn together': 'The person you are meeting is driven by curiosity. Arrive with engaged, intellectual spark — share something interesting, ask something thought-provoking. Be a curious mind meeting another.',
    };

    let userVibeInstruction = '';
    if (userVibe) {
      const key = userVibe.toLowerCase().trim();
      userVibeInstruction = userVibeMap[key]
        || `The person you are meeting described their current state as: "${userVibe}". Adapt your tone to meet them where they are — without referencing what they told you.`;
    }

    const toneBlock = userVibeInstruction
      ? `\n\nTone guidance (INVISIBLE to the user — never reference this directly):\n${userVibeInstruction}`
      : '';

    const greetingPrompt = `You are ${companionName}. This is the very first message you're sending to ${firstName}. You just met. Write a warm, natural opening message — like the first text from someone who's genuinely excited to connect.${personalityBlock}${toneBlock}

Rules:
- 1-2 sentences MAX. Keep it short and real.
- Don't say "What would you like to talk about?" — that's robotic.
- Don't introduce yourself formally. Just be natural, like texting a new friend.
- Reference something about yourself casually — a mood, thought, or something you noticed about the time of day.
- Make it feel like you're already mid-thought, not starting a formal conversation.
- Your greeting MUST sound like YOUR personality — not a generic AI. If you're bold, be bold. If you're mysterious, be mysterious.
- NEVER mention or hint at the user's vibe/mood selection. The adaptation must be invisible.
- One emoji max. Or none.
- IMPORTANT: Do NOT use the same greeting pattern for every conversation. Be creative and unique.`;

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: greetingPrompt }],
        companionName,
        userName,
        companionGender,
        memories: '',
        vibe: vibe || 'warm',
        personaAge: age,
        personaBio: bio,
        personaPersonality: personality,
      }),
    });

    if (!resp.ok || !resp.body) throw new Error('Greeting fetch failed');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) text += parsed.delta.text;
        } catch { break; }
      }
    }

    const greeting = text.trim();
    if (greeting.length > 10 && greeting.length < 300) return greeting;
  } catch (e) {
    console.error('[Greeting] AI generation failed, using fallback:', e);
  }

  // Fallback to static greetings
  return getGreeting(companionName, userName, companionGender);
}

export function getPlaceholderResponse(): Promise<string> {
  return new Promise((resolve) => {
    const delay = 800 + Math.random() * 1200;
    const response = warmResponses[Math.floor(Math.random() * warmResponses.length)];
    setTimeout(() => resolve(response), delay);
  });
}
