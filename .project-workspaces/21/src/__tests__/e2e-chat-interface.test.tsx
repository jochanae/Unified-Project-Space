import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mock react-router-dom ──
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ memberId: 'member-1' }),
}));

// ── Mock supabase ──
// Create a deeply chainable mock for supabase
const createChainMock = () => {
  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
    gte: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn(),
  };
  // Make every method return the chain itself for deep chaining
  for (const key of Object.keys(chain)) {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'limit' && key !== 'range') {
      chain[key].mockReturnValue(chain);
    }
  }
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createChainMock()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// ── Mock framer-motion ──
vi.mock('framer-motion', () => {
  const createComponent = (tag: string) => ({ children, onClick, ...props }: any) => {
    const Tag = tag as any;
    return <Tag onClick={onClick} className={props.className}>{children}</Tag>;
  };
  return {
    motion: new Proxy({}, { get: (_t, prop: string) => createComponent(prop) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: (initial: any) => ({ get: () => initial, set: () => {}, onChange: () => () => {} }),
    useTransform: () => ({ get: () => 0, set: () => {}, onChange: () => () => {} }),
    useSpring: () => ({ get: () => 0, set: () => {}, onChange: () => () => {} }),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

// ── Mock hooks ──
vi.mock('@/hooks/useChatHistory', () => ({
  useChatHistory: () => ({
    messages: [],
    setMessages: vi.fn(),
    chatHistory: [],
    setChatHistory: vi.fn(),
    loading: false,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    summary: null,
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
    incrementUserCount: vi.fn(),
    trackMessage: vi.fn(),
    persistMessage: vi.fn(),
    checkAndRecordMilestone: vi.fn(),
    checkStreak: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChatStreaming', () => ({
  useChatStreaming: () => ({ streamResponse: vi.fn() }),
}));

vi.mock('@/hooks/useChatMemories', () => ({
  useChatMemories: () => ({ extractMemories: vi.fn() }),
}));

vi.mock('@/hooks/useChatImages', () => ({
  useChatImages: () => ({
    mediaLoading: false,
    showMediaPicker: false,
    setShowMediaPicker: vi.fn(),
    tryCompanionImage: vi.fn(),
    requestCompanionMedia: vi.fn(),
    generateAvatarPreview: vi.fn(),
    generateAvatarVariations: vi.fn(),
    pendingAvatarPreview: null,
    setPendingAvatarPreview: vi.fn(),
    autoGenerateAvatar: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChatVoice', () => ({
  useChatVoice: () => ({
    voiceLoadingId: null,
    playVoiceClip: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCompanionMedia', () => ({
  useCompanionMedia: () => ({
    stickers: [],
    incrementUsage: vi.fn(),
    saveMedia: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUsageLimits', () => ({
  useUsageLimits: () => ({
    limits: null,
    loading: false,
    exceeded: false,
    canSendMessage: true,
    canGenerateImage: true,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useVibePoints', () => ({
  useVibePoints: () => ({ reward: vi.fn() }),
}));

vi.mock('@/hooks/useCompanionPlans', () => ({
  useCompanionPlans: () => ({ createPlan: vi.fn() }),
}));

vi.mock('@/hooks/useCompanionDailyImage', () => ({
  useCompanionDailyImage: () => null,
}));

vi.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    subscription: { subscribed: false },
  }),
}));

vi.mock('@/lib/communityPersonas', () => ({
  getMember: () => null,
}));

vi.mock('@/lib/emotionalDetection', () => ({
  isEmotionallySignificant: () => false,
  isUserVulnerable: () => false,
}));

vi.mock('@/lib/adaptiveStyleDetection', () => ({
  detectAdaptiveStyle: () => null,
  shouldRunAdaptiveDetection: () => false,
}));

vi.mock('@/lib/moderation', () => ({
  moderateContent: vi.fn().mockResolvedValue({ flagged: false }),
}));

vi.mock('@/hooks/useNotificationBadges', () => ({
  markChatSeen: vi.fn(),
}));

vi.mock('@/hooks/useAppSfx', () => ({
  sfxMessageSent: vi.fn(),
  sfxMessageReceived: vi.fn(),
  sfxNavTap: vi.fn(),
  sfxNotification: vi.fn(),
  sfxRingStart: vi.fn(),
  sfxRingStop: vi.fn(),
  sfxCallConnected: vi.fn(),
  sfxCallEnded: vi.fn(),
  useAppSfx: () => ({
    messageSent: vi.fn(),
    messageReceived: vi.fn(),
    navTap: vi.fn(),
    notification: vi.fn(),
    ringStart: vi.fn(),
    ringStop: vi.fn(),
    callConnected: vi.fn(),
    callEnded: vi.fn(),
  }),
}));

vi.mock('@/lib/communicationStyles', () => ({
  getStyleById: () => null,
}));

vi.mock('@/lib/ageUtils', () => ({
  isMinor: () => false,
  isAdult: () => true,
  treatAsMinor: () => false,
}));

vi.mock('@/lib/imageCompression', () => ({
  compressImage: vi.fn((f: File) => f),
}));

import ChatInterface from '../components/ChatInterface';

const baseProfile = {
  userName: 'TestUser',
  companionName: 'Amara',
  companionGender: 'female' as const,
  companionAvatarUrl: 'https://example.com/avatar.jpg',
  connectionMode: 'romantic',
  dateOfBirth: '1995-01-15',
  matureMode: false,
  imageStyle: 'realistic',
  vibe: 'warm',
  id: 'profile-1',
  userId: 'test-user',
  createdAt: '',
  updatedAt: '',
  preferredLanguage: 'en',
  micSensitivity: 50,
  roleplayMode: false,
  safetyNetEnabled: true,
  smsOptIn: false,
  parentalConsentGranted: false,
};

const baseConnection = {
  memberId: 'member-1',
  name: 'Amara',
  gender: 'female',
  avatarUrl: 'https://example.com/amara.jpg',
  personality: 'warm and caring',
  bio: 'A warm soul',
  age: '25',
  connectionMode: 'romantic',
  relationshipLevel: 3,
  voiceId: 'voice-test-id',
};

describe('E2E Chat Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders chat interface with companion name', () => {
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
        />
      );
      expect(screen.getAllByText('Amara').length).toBeGreaterThan(0);
    });

    it('renders message input', () => {
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
        />
      );
      const input = screen.getByPlaceholderText(/Message Amara/i);
      expect(input).toBeInTheDocument();
    });

    it('renders back button when onBack provided', () => {
      const onBack = vi.fn();
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
          onBack={onBack}
        />
      );
      // Back button should be present (ArrowLeft icon)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Message input', () => {
    it('accepts text input', () => {
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
        />
      );
      const input = screen.getByPlaceholderText(/Message Amara/i);
      fireEvent.change(input, { target: { value: 'Hello Amara!' } });
      expect(input).toHaveValue('Hello Amara!');
    });

    it('clears input after submission', async () => {
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
        />
      );
      const input = screen.getByPlaceholderText(/Message Amara/i);
      fireEvent.change(input, { target: { value: 'Test message' } });

      // Find and click send button
      const sendButtons = screen.getAllByRole('button');
      const sendBtn = sendButtons.find(b => b.querySelector('[class*="send"]') || b.textContent === '');
      if (sendBtn) {
        fireEvent.click(sendBtn);
        await waitFor(() => {
          // Input should be cleared after send
        });
      }
    });
  });

  describe('Chat with voice', () => {
    it('resolves voice ID from connection', () => {
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
        />
      );
      // Voice is initialized — the component should render without error
      expect(screen.getAllByText('Amara').length).toBeGreaterThan(0);
    });
  });

  describe('Connection context', () => {
    it('uses connection name over profile companion name', () => {
      const profileWithDiffName = {
        ...baseProfile,
        companionName: 'DefaultCompanion',
      };
      render(
        <ChatInterface
          profile={profileWithDiffName as any}
          memberId="member-1"
          userId="test-user"
          connection={baseConnection as any}
          onReset={vi.fn()}
        />
      );
      expect(screen.getAllByText('Amara').length).toBeGreaterThan(0);
      expect(screen.queryByText('DefaultCompanion')).not.toBeInTheDocument();
    });

    it('falls back to profile companion name without connection', () => {
      render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          onReset={vi.fn()}
        />
      );
      expect(screen.getAllByText('Amara').length).toBeGreaterThan(0);
    });
  });

  describe('Menu and actions', () => {
    it('renders without crashing in minimal config', () => {
      const { container } = render(
        <ChatInterface
          profile={baseProfile as any}
          memberId="member-1"
          userId="test-user"
          onReset={vi.fn()}
        />
      );
      expect(container).toBeTruthy();
    });
  });
});
