export type BuiltInCircleId = 'morning' | 'real-talk' | 'fun' | 'life-stuff' | 'wellness' | 'creative' | 'gratitude' | 'night-owls' | 'bookworm';
export type CircleId = BuiltInCircleId | string;

export type CircleCategory = 'connect' | 'create' | 'grow';

export interface CircleMeta {
  emoji: string;
  label: string;
  category?: CircleCategory;
  isCustom?: boolean;
  creatorId?: string;
  id?: string;
}

export interface CommunityMember {
  id: string;
  name: string;
  handle: string;
  initial: string;
  colorVar: string;
  age: string;
  gender: 'male' | 'female' | 'nonbinary';
  personality: string;
  bio: string;
  isCompanion?: boolean;
  avatarUrl?: string;
  isDynamic?: boolean;
  circles: CircleId[];
}

export type FeedCardType = 'life-event' | 'reflection' | 'milestone' | 'user-post';

export interface CompanionReaction {
  memberId: string;
  name: string;
  avatarUrl?: string;
  emoji?: string;        // e.g. 👍, 🔥
  comment?: string;      // short text reaction e.g. "Nice follow-through."
}

export interface CommunityPost {
  id: string;
  memberId: string;
  content: string;
  timeAgo: string;
  imageKey?: string;
  imageUrl?: string;
  circle?: CircleId;
  isUserPost?: boolean;
  userPostMeta?: { userName: string; username?: string; avatarUrl?: string };
  /** ISO timestamp used for cursor-based pagination */
  _createdAt?: string;
  /** Thread-specific fields */
  visibility?: 'public' | 'thread';
  threadFriendId?: string;
  threadFriendName?: string;
  /** Event-driven feed fields */
  cardType?: FeedCardType;
  eventLabel?: string;             // e.g. "You completed 'Morning Walk'"
  companionReactions?: CompanionReaction[];
  companionRole?: string;          // e.g. "Accountability Partner"
}

export const CIRCLE_CATEGORIES: Record<CircleCategory, { label: string; emoji: string }> = {
  connect: { label: 'Connect', emoji: '💬' },
  create: { label: 'Create', emoji: '🎨' },
  grow: { label: 'Grow', emoji: '🌱' },
};

export const BUILT_IN_CIRCLES: Record<BuiltInCircleId, CircleMeta> = {
  'morning':     { emoji: '☀️', label: 'Morning',       category: 'connect' },
  'real-talk':   { emoji: '💬', label: 'Real Talk',     category: 'connect' },
  'fun':         { emoji: '🎉', label: 'Just for Fun',  category: 'create' },
  'life-stuff':  { emoji: '🌱', label: 'Life Stuff',    category: 'grow' },
  'wellness':    { emoji: '🧘', label: 'Wellness',      category: 'grow' },
  'creative':    { emoji: '🎨', label: 'Creative',      category: 'create' },
  'gratitude':   { emoji: '🙏', label: 'Gratitude',     category: 'grow' },
  'night-owls':  { emoji: '🦉', label: 'Night Owls',    category: 'connect' },
  'bookworm':    { emoji: '📚', label: 'Bookworm',      category: 'create' },
};

export const CIRCLE_META: Record<string, CircleMeta> = { ...BUILT_IN_CIRCLES };

// Vibe → suggested circles mapping
export function getSuggestedCircles(vibe?: string | null): BuiltInCircleId[] {
  if (!vibe) return ['real-talk', 'fun', 'morning', 'life-stuff'];
  const v = vibe.toLowerCase();
  if (v.includes('conversation') || v.includes('talk')) return ['real-talk', 'fun', 'morning', 'bookworm'];
  if (v.includes('someone') || v.includes('talk to') || v.includes('lonely')) return ['real-talk', 'life-stuff', 'wellness', 'morning'];
  if (v.includes('vibe') || v.includes('good')) return ['fun', 'morning', 'creative', 'gratitude'];
  return ['real-talk', 'fun', 'morning', 'life-stuff'];
}

export const COMPANION_NAME = '';

export const communityMembers: CommunityMember[] = [
  {
    id: 'marcus',
    name: 'Marcus',
    handle: '@marcus',
    initial: 'M',
    colorVar: '--avatar-teal',
    age: '40s',
    gender: 'male',
    personality: 'Steady and grounded, shares wisdom through everyday observations',
    bio: 'Somewhere between observer and philosopher. Notices the things most people walk past.',
    circles: ['real-talk', 'life-stuff', 'morning'],
  },
  {
    id: 'diane',
    name: 'Diane',
    handle: '@diane_w',
    initial: 'D',
    colorVar: '--avatar-amber',
    age: '60s',
    gender: 'female',
    personality: 'Warm and nurturing, the community grandmother figure',
    bio: '63 and still figuring it out, which honestly feels right. Makes soup when words aren\'t enough.',
    circles: ['life-stuff', 'fun', 'gratitude'],
  },
  {
    id: 'reese',
    name: 'Reese',
    handle: '@reese',
    initial: 'R',
    colorVar: '--avatar-purple',
    age: 'late 20s',
    gender: 'female',
    personality: 'Upbeat and self-aware, balances humor with vulnerability',
    bio: '26. Navigating early adulthood one playlist at a time. Honest about the hard parts.',
    circles: ['fun', 'real-talk', 'night-owls'],
  },
  {
    id: 'carmen',
    name: 'Carmen',
    handle: '@carmen',
    initial: 'C',
    colorVar: '--avatar-coral',
    age: '30s',
    gender: 'female',
    personality: 'Creative and encouraging, celebrates small joys',
    bio: 'Finds color in ordinary moments. Three sentences of journaling a day and counting.',
    circles: ['creative', 'life-stuff', 'morning'],
  },
  {
    id: 'david',
    name: 'David',
    handle: '@david',
    initial: 'D',
    colorVar: '--avatar-slate',
    age: '50s',
    gender: 'male',
    personality: 'Quiet strength, shares reflections with gentle humor',
    bio: 'Practical by nature, philosophical by accident. Takes the long way home on purpose.',
    circles: ['real-talk', 'morning', 'gratitude'],
  },
  {
    id: 'jordan',
    name: 'Jordan',
    handle: '@jordan',
    initial: 'J',
    colorVar: '--avatar-teal',
    age: '30s',
    gender: 'nonbinary',
    personality: 'Nostalgic and thoughtful, finds meaning in music and memory',
    bio: 'Old soul in a streaming world. Every album is a chapter.',
    circles: ['real-talk', 'life-stuff', 'night-owls', 'bookworm'],
  },
  {
    id: 'evelyn',
    name: 'Evelyn',
    handle: '@evelyn',
    initial: 'E',
    colorVar: '--avatar-amber',
    age: '50s',
    gender: 'female',
    personality: 'Patient and wise, nurtures growth in people and gardens alike',
    bio: 'Recently retired, newly curious. Turns out life has a second act worth showing up for.',
    circles: ['morning', 'life-stuff', 'wellness', 'gratitude'],
  },
  {
    id: 'ray',
    name: 'Ray',
    handle: '@ray',
    initial: 'R',
    colorVar: '--avatar-coral',
    age: '40s',
    gender: 'male',
    personality: 'Adventurous and optimistic, always chasing the next horizon',
    bio: 'In transition. Learning that not all who wander are lost — some are just finding their footing.',
    circles: ['fun', 'life-stuff', 'creative'],
  },
  {
    id: 'soleil',
    name: 'Soleil',
    handle: '@soleil',
    initial: 'S',
    colorVar: '--avatar-purple',
    age: 'late 20s',
    gender: 'female',
    personality: 'Dreamy and introspective, finds beauty in quiet moments',
    bio: 'Writes poems at 2am. Wakes before the sun. Finds something holy in the quiet.',
    circles: ['real-talk', 'morning', 'night-owls', 'bookworm'],
  },
  {
    id: 'benny',
    name: 'Benny',
    handle: '@benny',
    initial: 'B',
    colorVar: '--avatar-slate',
    age: '30s',
    gender: 'male',
    personality: 'Warm and easygoing, the friend who always knows a good coffee spot',
    bio: 'Accidentally funny. Genuinely warm. Firmly believes the barista remembering your name counts as a win.',
    circles: ['fun', 'morning', 'gratitude'],
  },
];

export function getCompanionMember(_name?: string): CommunityMember | undefined {
  return undefined;
}

// Dynamic member registry for created companions
const dynamicMembers: Map<string, CommunityMember> = new Map();

export function registerDynamicMember(member: CommunityMember) {
  dynamicMembers.set(member.id, { ...member, isDynamic: true });
}

export function getMember(memberId: string, _companionName?: string): CommunityMember | undefined {
  return communityMembers.find((m) => m.id === memberId) || dynamicMembers.get(memberId);
}
