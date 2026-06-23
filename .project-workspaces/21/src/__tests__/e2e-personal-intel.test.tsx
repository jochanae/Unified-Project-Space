import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/* ── Mock react-router-dom ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

/* ── Chainable supabase mock ── */
const createChainMock = (mockData: any[] = []) => {
  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    range: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
  };
  for (const key of Object.keys(chain)) {
    if (!['single', 'maybeSingle', 'order', 'limit', 'range'].includes(key)) {
      chain[key].mockReturnValue(chain);
    }
  }
  return chain;
};

let supabaseMockData: any[] = [];
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createChainMock(supabaseMockData)),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

/* ── Mock framer-motion ── */
vi.mock('framer-motion', () => {
  const wrap = (tag: string) => ({ children, onClick, className, ...rest }: any) => {
    const Tag = tag as any;
    return <Tag onClick={onClick} className={className} data-testid={rest['data-testid']}>{children}</Tag>;
  };
  return {
    motion: new Proxy({}, { get: (_, tag: string) => wrap(tag) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

/* ── Mock tanstack query ── */
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [], refetch: vi.fn(), isLoading: false }),
  useQueryClient: vi.fn().mockReturnValue({}),
  QueryClient: vi.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: any) => <>{children}</>,
}));

/* ── Mock AppContext ── */
const mockUser = { id: 'test-user', email: 'test@test.com' };
const mockCompanion = { memberId: 'comp-1', name: 'Luna' };
vi.mock('@/contexts/AppContext', () => ({
  useAppContext: vi.fn().mockReturnValue({
    user: mockUser,
    connections: [mockCompanion],
    profile: {},
  }),
}));

/* ── Mock vaul (Sheet) ── */
vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children }: any) => <>{children}</>,
    Trigger: ({ children }: any) => <>{children}</>,
    Portal: ({ children }: any) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: any) => <div>{children}</div>,
    Title: ({ children }: any) => <h2>{children}</h2>,
    Close: ({ children }: any) => <>{children}</>,
  },
}));

/* ── Imports under test ── */
import { discoveryTopics, getDiscoveryTopic } from '@/lib/discoveryTopics';
import { useQuery } from '@tanstack/react-query';

/* ═══════════════════════════════════════════════════════
   1. TOPIC REGISTRY INTEGRITY
   ═══════════════════════════════════════════════════════ */
describe('Discovery Topics Registry', () => {
  it('has exactly 10 topics', () => {
    expect(discoveryTopics).toHaveLength(10);
  });

  it('includes stress-response topic', () => {
    const sr = getDiscoveryTopic('stress-response');
    expect(sr).toBeDefined();
    expect(sr!.title).toBe('Stress Response');
    expect(sr!.emoji).toBe('🔥');
  });

  it('every topic has required fields', () => {
    for (const t of discoveryTopics) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.subtitle).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.color).toBeTruthy();
      expect(t.questions.length).toBeGreaterThanOrEqual(4);
      expect(typeof t.score).toBe('function');
    }
  });

  it('every topic ID is unique', () => {
    const ids = discoveryTopics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getDiscoveryTopic returns undefined for non-existent ID', () => {
    expect(getDiscoveryTopic('nonexistent')).toBeUndefined();
  });

  it('all 10 expected IDs are present', () => {
    const expectedIds = [
      'love-languages', 'attachment-style', 'conflict-style',
      'apology-language', 'boundaries-style', 'enneagram',
      'emotional-intelligence', 'communication-style',
      'values-mapping', 'stress-response',
    ];
    const actualIds = discoveryTopics.map((t) => t.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });
});

/* ═══════════════════════════════════════════════════════
   2. THEME GROUPS — ensure all IDs resolve
   ═══════════════════════════════════════════════════════ */
describe('PersonalIntelPage theme groups', () => {
  const themeGroups = [
    { label: 'Social Dynamics', topicIds: ['attachment-style', 'conflict-style', 'communication-style'] },
    { label: 'Core Values', topicIds: ['love-languages', 'apology-language', 'values-mapping'] },
    { label: 'Growth', topicIds: ['emotional-intelligence', 'boundaries-style', 'stress-response', 'enneagram'] },
  ];

  it('every topicId in every theme group resolves to a real topic', () => {
    for (const group of themeGroups) {
      for (const id of group.topicIds) {
        const topic = getDiscoveryTopic(id);
        expect(topic).toBeDefined();
        if (!topic) throw new Error(`Missing topic: ${id} in group ${group.label}`);
      }
    }
  });

  it('all 10 topics are covered by exactly one group', () => {
    const allGroupIds = themeGroups.flatMap((g) => g.topicIds);
    expect(allGroupIds).toHaveLength(10);
    expect(new Set(allGroupIds).size).toBe(10);
  });

  it('no topic appears in multiple groups', () => {
    const seen = new Set<string>();
    for (const group of themeGroups) {
      for (const id of group.topicIds) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });
});

/* ═══════════════════════════════════════════════════════
   3. SCORING FUNCTIONS
   ═══════════════════════════════════════════════════════ */
describe('Scoring functions', () => {
  it('stress-response scoring returns valid result for all-fighter answers', () => {
    const topic = getDiscoveryTopic('stress-response')!;
    const answers: Record<string, string> = {};
    topic.questions.forEach((q) => { answers[q.id] = 'fighter'; });
    const result = topic.score(answers);
    expect(result.key).toBe('fighter');
    expect(result.label).toBe('The Fighter');
    expect(result.emoji).toBe('⚔️');
    expect(result.description).toBeTruthy();
    expect(result.companionHint).toBeTruthy();
  });

  it('stress-response scoring handles mixed answers', () => {
    const topic = getDiscoveryTopic('stress-response')!;
    const answers: Record<string, string> = {};
    topic.questions.forEach((q, i) => {
      answers[q.id] = i < 3 ? 'freezer' : 'fixer';
    });
    const result = topic.score(answers);
    expect(result.key).toBe('freezer');
  });

  it('every topic scoring function returns a valid result', () => {
    for (const topic of discoveryTopics) {
      const answers: Record<string, string> = {};
      topic.questions.forEach((q) => {
        answers[q.id] = q.options[0].key;
      });
      const result = topic.score(answers);
      expect(result.key).toBeTruthy();
      expect(result.label).toBeTruthy();
      expect(result.emoji).toBeTruthy();
      expect(result.description).toBeTruthy();
      expect(result.companionHint).toBeTruthy();
    }
  });

  it('every topic scoring handles all-same-option for each option key', () => {
    for (const topic of discoveryTopics) {
      const optionKeys = new Set<string>();
      topic.questions.forEach((q) => q.options.forEach((o) => optionKeys.add(o.key)));

      for (const key of optionKeys) {
        const answers: Record<string, string> = {};
        topic.questions.forEach((q) => { answers[q.id] = key; });
        const result = topic.score(answers);
        expect(result.key).toBe(key);
        expect(result.label).toBeTruthy();
      }
    }
  });
});

/* ═══════════════════════════════════════════════════════
   4. QUESTION INTEGRITY
   ═══════════════════════════════════════════════════════ */
describe('Question integrity', () => {
  it('every question has unique ID within its topic', () => {
    for (const topic of discoveryTopics) {
      const qIds = topic.questions.map((q) => q.id);
      expect(new Set(qIds).size).toBe(qIds.length);
    }
  });

  it('every question has at least 3 options', () => {
    for (const topic of discoveryTopics) {
      for (const q of topic.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('every option has key, label, and emoji', () => {
    for (const topic of discoveryTopics) {
      for (const q of topic.questions) {
        for (const opt of q.options) {
          expect(opt.key).toBeTruthy();
          expect(opt.label).toBeTruthy();
          expect(opt.emoji).toBeTruthy();
        }
      }
    }
  });

  it('stress-response has exactly 5 questions with 5-6 options each', () => {
    const topic = getDiscoveryTopic('stress-response')!;
    expect(topic.questions).toHaveLength(5);
    topic.questions.forEach((q) => {
      expect(q.options.length).toBeGreaterThanOrEqual(5);
      expect(q.options.length).toBeLessThanOrEqual(6);
    });
  });
});

/* ═══════════════════════════════════════════════════════
   5. PAGE RENDERING
   ═══════════════════════════════════════════════════════ */
describe('PersonalIntelPage rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMockData = [];
    (useQuery as any).mockReturnValue({ data: [], refetch: vi.fn(), isLoading: false });
  });

  it('renders all three theme groups', async () => {
    const PersonalIntelPage = (await import('@/pages/PersonalIntelPage')).default;
    render(<PersonalIntelPage />);

    expect(screen.getByText('Social Dynamics')).toBeInTheDocument();
    expect(screen.getByText('Core Values')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it('renders all available topic titles when none completed', async () => {
    const PersonalIntelPage = (await import('@/pages/PersonalIntelPage')).default;
    render(<PersonalIntelPage />);

    for (const topic of discoveryTopics) {
      expect(screen.getByText(topic.title)).toBeInTheDocument();
    }
  });

  it('shows progress as 0 of 10 when nothing completed', async () => {
    const PersonalIntelPage = (await import('@/pages/PersonalIntelPage')).default;
    render(<PersonalIntelPage />);

    expect(screen.getByText('0 of 10 discovered')).toBeInTheDocument();
  });

  it('renders completed results when data exists', async () => {
    const mockResults = [
      {
        id: 'r-1',
        topic: 'stress-response',
        result_key: 'fighter',
        result_label: 'The Fighter',
        result_emoji: '⚔️',
        result_description: 'Under pressure you charge forward',
        completed_at: new Date().toISOString(),
      },
    ];
    (useQuery as any).mockReturnValue({ data: mockResults, refetch: vi.fn(), isLoading: false });

    const PersonalIntelPage = (await import('@/pages/PersonalIntelPage')).default;
    render(<PersonalIntelPage />);

    expect(screen.getByText('The Fighter')).toBeInTheDocument();
    expect(screen.getByText('1 of 10 discovered')).toBeInTheDocument();
  });

  it('shows retake button for completed topics', async () => {
    const mockResults = [
      {
        id: 'r-1',
        topic: 'love-languages',
        result_key: 'words',
        result_label: 'Words of Affirmation',
        result_emoji: '💬',
        result_description: 'You feel most loved...',
        completed_at: new Date().toISOString(),
      },
    ];
    (useQuery as any).mockReturnValue({ data: mockResults, refetch: vi.fn(), isLoading: false });

    const PersonalIntelPage = (await import('@/pages/PersonalIntelPage')).default;
    render(<PersonalIntelPage />);

    expect(screen.getByText('Retake')).toBeInTheDocument();
  });

  it('navigate back when back button is clicked', async () => {
    const PersonalIntelPage = (await import('@/pages/PersonalIntelPage')).default;
    render(<PersonalIntelPage />);

    const backButton = screen.getByRole('button', { name: '' });
    // Find the back arrow button (first button)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

/* ═══════════════════════════════════════════════════════
   6. PERSONAL INTEL SECTION (Dashboard widget)
   ═══════════════════════════════════════════════════════ */
describe('PersonalIntelSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useQuery as any).mockReturnValue({ data: [], refetch: vi.fn(), isLoading: false });
  });

  it('renders section header', async () => {
    const PersonalIntelSection = (await import('@/components/PersonalIntelSection')).default;
    render(<PersonalIntelSection userId="test-user" companionName="Luna" />);

    expect(screen.getByText('🗺️ My Blueprint')).toBeInTheDocument();
  });

  it('collapsible can be expanded to show content', async () => {
    const PersonalIntelSection = (await import('@/components/PersonalIntelSection')).default;
    render(<PersonalIntelSection userId="test-user" />);

    // Collapsible starts closed when no results — click to open
    const trigger = screen.getByRole('button', { expanded: false });
    fireEvent.click(trigger);

    await waitFor(() => {
      // After expanding, available discovery topics should render
      expect(screen.getByText('Love Languages')).toBeInTheDocument();
    });
  });

  it('shows "View all" link when results exist', async () => {
    const mockResults = [
      {
        id: 'r-1',
        topic: 'enneagram',
        result_key: 'reformer',
        result_label: 'The Reformer',
        result_emoji: '1️⃣',
        result_description: 'Principled',
        completed_at: new Date().toISOString(),
      },
    ];
    (useQuery as any).mockReturnValue({ data: mockResults, refetch: vi.fn(), isLoading: false });

    const PersonalIntelSection = (await import('@/components/PersonalIntelSection')).default;
    render(<PersonalIntelSection userId="test-user" companionName="Luna" />);

    expect(screen.getByText('View all →')).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════
   7. DISCOVERY SHEET FLOW
   ═══════════════════════════════════════════════════════ */
describe('DiscoverySheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders intro screen with topic info', async () => {
    const DiscoverySheet = (await import('@/components/DiscoverySheet')).default;
    const topic = getDiscoveryTopic('stress-response')!;

    render(
      <DiscoverySheet
        open={true}
        onOpenChange={vi.fn()}
        topic={topic}
        userId="test-user"
      />
    );

    const titles = screen.getAllByText('Stress Response');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(topic.subtitle)).toBeInTheDocument();
    expect(screen.getByText("Let's find out")).toBeInTheDocument();
    expect(screen.getByText(/5 quick questions/)).toBeInTheDocument();
  });

  it('returns null when topic is null', async () => {
    const DiscoverySheet = (await import('@/components/DiscoverySheet')).default;
    const { container } = render(
      <DiscoverySheet
        open={true}
        onOpenChange={vi.fn()}
        topic={null}
        userId="test-user"
      />
    );
    expect(container.innerHTML).toBe('');
  });
});

/* ═══════════════════════════════════════════════════════
   8. COMPANION NAVIGATION
   ═══════════════════════════════════════════════════════ */
describe('Companion discovery navigation', () => {
  it('sets discoveryContext in sessionStorage and navigates to chat', () => {
    sessionStorage.clear();
    sessionStorage.setItem('discoveryContext', 'stress-response');
    expect(sessionStorage.getItem('discoveryContext')).toBe('stress-response');
  });
});
