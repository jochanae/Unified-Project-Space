import { CommunityMember, CommunityPost } from './communityPersonas';
import { VisualMode } from '@/hooks/useProfile';

// Knowledge domains allow interest-based matching for specific hobbies/activities
export type KnowledgeDomain = 'books' | 'faith' | 'sports' | 'study' | 'music' | 'art' | 'cooking' | 'nature' | 'wellness' | 'travel' | 'tech' | 'games';

export interface MatchResult {
  member: CommunityMember;
  reason: string;
  tailoredPost: CommunityPost;
  visualMode: VisualMode;
  isCreated?: boolean; // true if companion was AI-generated rather than matched
  appearanceDesc?: string; // appearance description for avatar generation
  communicationStyle?: string; // inferred communication style id
  connectionMode?: string; // role: friend, mentor, accountability, romantic, assistant, kids-companion
}

// Map user hobby keywords → knowledge domains for scoring
const DOMAIN_KEYWORDS: Record<KnowledgeDomain, string[]> = {
  books: ['book', 'reading', 'novel', 'author', 'literature', 'chapter', 'library', 'bookworm', 'book club', 'kindle', 'fiction', 'nonfiction', 'memoir', 'story', 'stories'],
  faith: ['bible', 'church', 'faith', 'pray', 'prayer', 'spiritual', 'worship', 'scripture', 'god', 'jesus', 'devotion', 'sermon', 'ministry', 'fellowship', 'religion', 'mosque', 'temple', 'meditation', 'soul'],
  sports: ['sport', 'workout', 'gym', 'fitness', 'running', 'basketball', 'football', 'soccer', 'tennis', 'yoga', 'hiking', 'cycling', 'swim', 'athlete', 'training', 'marathon', 'exercise'],
  study: ['study', 'homework', 'exam', 'school', 'college', 'university', 'class', 'learn', 'tutor', 'academic', 'research', 'thesis', 'grades', 'major', 'degree', 'lecture', 'course'],
  music: ['music', 'song', 'album', 'concert', 'guitar', 'piano', 'sing', 'band', 'playlist', 'vinyl', 'record', 'jazz', 'hip hop', 'classical', 'instrument'],
  art: ['art', 'paint', 'draw', 'sketch', 'gallery', 'museum', 'creative', 'design', 'craft', 'sculpture', 'photography', 'canvas', 'color', 'illustration'],
  cooking: ['cook', 'bake', 'recipe', 'kitchen', 'food', 'meal', 'chef', 'dinner', 'cuisine', 'ingredient', 'restaurant'],
  nature: ['garden', 'plant', 'hike', 'nature', 'outdoor', 'camp', 'trail', 'forest', 'mountain', 'beach', 'wildlife', 'bird'],
  wellness: ['wellness', 'mindful', 'meditat', 'self-care', 'therapy', 'mental health', 'anxiety', 'stress', 'breathe', 'heal', 'journal'],
  travel: ['travel', 'trip', 'adventure', 'explore', 'destination', 'flight', 'road trip', 'backpack', 'wander', 'country', 'culture'],
  tech: ['tech', 'code', 'program', 'software', 'app', 'computer', 'ai', 'robot', 'game dev', 'startup'],
  games: ['game', 'gaming', 'video game', 'board game', 'puzzle', 'chess', 'card game', 'trivia', 'rpg', 'esport'],
};

// Detect which knowledge domains the user's text maps to
export function detectDomains(text: string): KnowledgeDomain[] {
  const lower = text.toLowerCase();
  const matched: KnowledgeDomain[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matched.push(domain as KnowledgeDomain);
    }
  }
  return matched;
}

// Detect if user is describing an activity-based companion (book club, study group, etc.)
export function detectActivityIntent(text: string): { isActivity: boolean; activityType: string } {
  const lower = text.toLowerCase();
  const patterns: { regex: RegExp; type: string }[] = [
    { regex: /book\s*club|reading\s*group|book\s*of\s*the\s*month/i, type: 'book club' },
    { regex: /bible\s*study|prayer\s*group|faith\s*group|church\s*group|fellowship/i, type: 'faith group' },
    { regex: /study\s*(group|partner|buddy)|homework|exam\s*prep|study\s*session/i, type: 'study group' },
    { regex: /workout\s*(buddy|partner|group)|gym\s*partner|running\s*(club|group|buddy)|fitness/i, type: 'fitness group' },
    { regex: /club\s*activit|our\s*(club|group|circle)|meet\s*(weekly|monthly|regularly)|once\s*a\s*week/i, type: 'recurring group' },
    { regex: /game\s*night|gaming\s*(group|buddy)|board\s*game/i, type: 'gaming group' },
  ];
  for (const { regex, type } of patterns) {
    if (regex.test(lower)) return { isActivity: true, activityType: type };
  }
  return { isActivity: false, activityType: '' };
}

// Infer visual mode + vibe from a fast-track free text response
export function inferFromFreeText(text: string): { visualMode: VisualMode; wantedStyle: 'listener' | 'challenger' | 'warm'; needsHeavy: boolean; needsPatience: boolean } {
  const lower = text.toLowerCase();
  
  // Infer visual mode
  let visualMode: VisualMode = 'unsure';
  if (/face|look|photo|image|picture|see them|what they look|appearance|physical/i.test(lower)) {
    visualMode = 'personal';
  } else if (/abstract|energy|vibe|feeling|no face|don't need|presence/i.test(lower)) {
    visualMode = 'abstract';
  }

  // Classify presence style
  let wantedStyle: 'listener' | 'challenger' | 'warm' = 'warm';
  if (/listen|quiet|space/i.test(lower)) wantedStyle = 'listener';
  else if (/challeng|push|honest|direct/i.test(lower)) wantedStyle = 'challenger';

  // Classify heavy topics
  const needsHeavy = lower.length > 30 || /stress|anxiet|depress|loss|grief|struggle|hard|difficult|overwhelm|lonely|alone|divorce|breakup|health/i.test(lower);

  // Classify pace
  const needsPatience = /time|slow|comfortable|trust|ease|gradual|patient|careful|shy|introvert/i.test(lower);

  return { visualMode, wantedStyle, needsHeavy, needsPatience };
}
