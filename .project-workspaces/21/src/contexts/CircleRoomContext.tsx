import { createContext, useContext } from 'react';
import type { Circle, CircleMember, CircleMessage } from '@/hooks/useCircles';
import type { CircleType } from '@/components/circle/SpatialRoom';
import type { User } from '@supabase/supabase-js';

export interface CircleRoomContextType {
  circleId: string;
  circle: Circle | null;
  members: CircleMember[];
  messages: CircleMessage[];
  currentUser: User | null;
  isOwner: boolean;
  circleType: CircleType;
  communityFlavor: string;
  activeSpeakerId: string | null;
  
  // Actions
  sendMessage: (content: string, senderName: string, senderType?: string) => Promise<void>;
  
  // Loading states
  loading: boolean;
}

export const CircleRoomContext = createContext<CircleRoomContextType | null>(null);

export function useCircleRoom() {
  const ctx = useContext(CircleRoomContext);
  if (!ctx) {
    throw new Error('useCircleRoom must be used within a CircleRoomProvider');
  }
  return ctx;
}
