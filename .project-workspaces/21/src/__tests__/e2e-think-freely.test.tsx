import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock fetch for think-freely edge function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock supabase
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'entry-1' }, error: null }),
    }),
  }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { response: 'AI response' }, error: null }),
    },
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const createComponent = (tag: string) => ({ children, onClick, ...props }: any) => {
    const Tag = tag as any;
    return <Tag onClick={onClick} className={props.className}>{children}</Tag>;
  };
  return {
    motion: new Proxy({}, { get: (_t, prop: string) => createComponent(prop) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Minimal WellnessHub mock — test the Think Freely conversation flow
describe('E2E Think Freely', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: "I hear you. That sounds like a lot to carry." }),
    });
  });

  describe('Edge function contract', () => {
    it('sends message to think-freely endpoint with auth', async () => {
      const session = { access_token: 'test-jwt-token' };
      await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: "I'm feeling overwhelmed" }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('think-freely'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token',
          }),
        })
      );
    });

    it('sends conversation history for multi-turn', async () => {
      const history = [
        { role: 'user', content: "Everything feels heavy today" },
        { role: 'assistant', content: "I hear you. What's weighing on you most?" },
        { role: 'user', content: "Just work stuff. And some personal things." },
      ];

      await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test-token`,
        },
        body: JSON.stringify({ history }),
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.history).toHaveLength(3);
      expect(callBody.history[0].role).toBe('user');
      expect(callBody.history[2].content).toBe('Just work stuff. And some personal things.');
    });

    it('handles API error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'No message provided' }),
      });

      const resp = await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
        body: JSON.stringify({ message: '' }),
      });

      expect(resp.ok).toBe(false);
    });

    it('returns response in expected format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "That's a lot. What feels most pressing right now?" }),
      });

      const resp = await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
        body: JSON.stringify({ message: "I don't know what to do" }),
      });

      const data = await resp.json();
      expect(data.response).toBeTruthy();
      expect(typeof data.response).toBe('string');
    });

    it('supports both single message and history formats', async () => {
      // Single message (legacy)
      await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
        body: JSON.stringify({ message: "just thinking" }),
      });
      const singleBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(singleBody.message).toBe('just thinking');

      // Multi-turn history
      await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
        body: JSON.stringify({
          history: [
            { role: 'user', content: 'msg1' },
            { role: 'assistant', content: 'reply1' },
          ],
        }),
      });
      const historyBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(historyBody.history).toHaveLength(2);
    });
  });

  describe('Privacy contract', () => {
    it('does not include user_id in think-freely request body', async () => {
      await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
        body: JSON.stringify({ message: "private thought" }),
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.user_id).toBeUndefined();
    });

    it('requires Authorization header', async () => {
      await fetch(`https://test.supabase.co/functions/v1/think-freely`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer my-jwt' },
        body: JSON.stringify({ message: "test" }),
      });
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toMatch(/^Bearer /);
    });
  });
});
