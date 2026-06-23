import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('starts in loading state', async () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves
    const { useAuth } = await import('../useAuth');
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('resolves to no user when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { useAuth } = await import('../useAuth');
    const { result } = renderHook(() => useAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('resolves to user when session exists', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    const { useAuth } = await import('../useAuth');
    const { result } = renderHook(() => useAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it('sets up auth state change listener', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { useAuth } = await import('../useAuth');
    renderHook(() => useAuth());

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(typeof mockOnAuthStateChange.mock.calls[0][0]).toBe('function');
  });

  it('signOut calls supabase.auth.signOut', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({});
    const { useAuth } = await import('../useAuth');
    const { result } = renderHook(() => useAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('handles getSession failure gracefully', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));
    const { useAuth } = await import('../useAuth');
    const { result } = renderHook(() => useAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
