import { CommunityMember, CommunityPost } from './communityPersonas';
import { VisualMode } from '@/hooks/useProfile';

export interface MatchResult {
  member: CommunityMember;
  reason: string;
  tailoredPost: CommunityPost;
  visualMode: VisualMode;
  isCreated?: boolean;
  appearanceDesc?: string;
  imageStyle?: string;
  communicationStyle?: string;
  connectionMode?: string;
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
