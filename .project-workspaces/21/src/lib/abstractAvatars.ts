import { CommunityMember } from './communityPersonas';

/**
 * Abstract avatar configuration per persona.
 * Each persona gets a unique gradient + emoji symbol that represents their "world"
 * rather than their face. Used when connection_mode = 'abstract'.
 */

interface AbstractAvatarConfig {
  gradient: string; // CSS gradient
  symbol: string;   // Emoji representing their essence
  label: string;    // Accessible label
}

// Each persona's abstract identity — their "world" distilled into color + symbol
const abstractAvatars: Record<string, AbstractAvatarConfig> = {
  marcus: {
    gradient: 'linear-gradient(135deg, hsl(175 45% 40%), hsl(200 40% 50%))',
    symbol: '🌊',
    label: 'Calm ocean energy',
  },
  diane: {
    gradient: 'linear-gradient(135deg, hsl(35 80% 55%), hsl(25 70% 50%))',
    symbol: '🍵',
    label: 'Warm kitchen energy',
  },
  reese: {
    gradient: 'linear-gradient(135deg, hsl(350 55% 65%), hsl(15 75% 62%))',
    symbol: '✨',
    label: 'Bold spark energy',
  },
  carmen: {
    gradient: 'linear-gradient(135deg, hsl(130 40% 50%), hsl(160 35% 45%))',
    symbol: '🌿',
    label: 'Gentle garden energy',
  },
  david: {
    gradient: 'linear-gradient(135deg, hsl(215 30% 50%), hsl(230 25% 55%))',
    symbol: '🏔️',
    label: 'Steady mountain energy',
  },
  jordan: {
    gradient: 'linear-gradient(135deg, hsl(270 40% 55%), hsl(290 35% 50%))',
    symbol: '🎵',
    label: 'Nostalgic melody energy',
  },
  evelyn: {
    gradient: 'linear-gradient(135deg, hsl(80 45% 50%), hsl(120 40% 45%))',
    symbol: '🌱',
    label: 'Patient growth energy',
  },
  ray: {
    gradient: 'linear-gradient(135deg, hsl(15 75% 62%), hsl(40 80% 55%))',
    symbol: '🚗',
    label: 'Open road energy',
  },
  soleil: {
    gradient: 'linear-gradient(135deg, hsl(250 40% 35%), hsl(270 45% 45%))',
    symbol: '🌙',
    label: 'Quiet moonlight energy',
  },
  benny: {
    gradient: 'linear-gradient(135deg, hsl(25 70% 50%), hsl(35 65% 55%))',
    symbol: '☕',
    label: 'Warm coffee energy',
  },
};

// Default fallback for unknown personas
const defaultAbstract: AbstractAvatarConfig = {
  gradient: 'linear-gradient(135deg, hsl(15 80% 65%), hsl(350 55% 72%))',
  symbol: '💛',
  label: 'Warm presence',
};

export function getAbstractAvatar(memberId: string): AbstractAvatarConfig {
  return abstractAvatars[memberId] || defaultAbstract;
}

export type { AbstractAvatarConfig };
