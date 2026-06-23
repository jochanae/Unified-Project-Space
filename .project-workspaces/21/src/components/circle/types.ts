export interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  type: 'human' | 'companion';
  memberId?: string;
  userId?: string;
  ownerUserId?: string;
}

export type CircleType = 'social' | 'personal' | 'kids' | 'circle' | 'service' | 'fireside';
