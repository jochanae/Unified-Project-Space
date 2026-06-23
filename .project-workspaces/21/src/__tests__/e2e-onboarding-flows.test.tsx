import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Onboarding from '../components/Onboarding';

// ── Supabase mock ──
const mockUpdateEq = vi.fn().mockReturnValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
const mockSingle = vi.fn().mockResolvedValue({ data: { onboarding_completed: true }, error: null });
const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

vi.mock('@/integrations/supabase/client', () => {
  const mockSignOut = vi.fn().mockResolvedValue({ error: null });
  return {
    supabase: {
      from: () => ({ update: mockUpdate, select: mockSelect }),
      auth: { signOut: mockSignOut },
      storage: { from: () => ({ remove: vi.fn() }) },
    },
  };
});

// ── framer-motion mock ──
vi.mock('framer-motion', () => {
  const createComponent = (tag: string) => ({ children, onClick, ...props }: any) => {
    const Tag = tag as any;
    return <Tag onClick={onClick} data-testid={props['data-testid']} className={props.className} style={props.style}>{children}</Tag>;
  };
  return {
    motion: new Proxy({}, { get: (_t, prop: string) => createComponent(prop) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/hooks/useOnboardingSfx', () => ({ playSelectSound: vi.fn() }));
vi.mock('@/lib/imageCompression', () => ({ compressImage: vi.fn((f: File) => f) }));
vi.mock('@/lib/companionPhotoUpload', () => ({ uploadCompanionPhoto: vi.fn() }));
vi.mock('@/lib/imageModeration', () => ({ moderateImage: vi.fn().mockResolvedValue({ approved: true }) }));
vi.mock('@/assets/cami-avatar.jpg', () => ({ default: 'cami.jpg' }));

describe('E2E Onboarding Flows', () => {
  const onComplete = vi.fn();
  const userId = 'e2e-test-user';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockReturnValue({ error: null });
    mockSingle.mockResolvedValue({ data: { onboarding_completed: true }, error: null });
  });

  // ── Path selection rendering ──
  describe('Path selection', () => {
    it('renders all three paths for adults', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText('Find my companion')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });

    it('shows all paths for kids mode', () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      expect(screen.getByText('Find my companion')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });

    it('shows Recommended badge on Cami path', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('shows heading text', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText('How would you like to meet your companion?')).toBeInTheDocument();
    });
  });

  // ── Cami path ──
  describe('Cami path (adult)', () => {
    it('completes full flow with onboarding_path=cami', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Find my companion'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ onboarding_path: 'cami', onboarding_completed: true })
        );
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  // ── Browse path ──
  describe('Browse path (adult)', () => {
    it('completes full flow with onboarding_path=browse', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Browse companions'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ onboarding_path: 'browse', onboarding_completed: true })
        );
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  // ── Studio path ──
  describe('Studio path (adult)', () => {
    it('completes full flow with onboarding_path=studio', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Create my own'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ onboarding_path: 'studio', onboarding_completed: true })
        );
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/studio?from=onboarding'));
    });

    it('shows optional name input only when studio is selected', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      // Default is cami — name field should not show
      expect(screen.queryByPlaceholderText(/Their name/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Create my own'));
      expect(screen.getByPlaceholderText(/Their name/)).toBeInTheDocument();
    });

    it('saves companion name when provided', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Create my own'));
      const nameInput = screen.getByPlaceholderText(/Their name/);
      fireEvent.change(nameInput, { target: { value: 'Stella' } });
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            preferred_companion_name: 'Stella',
            onboarding_path: 'studio',
            onboarding_completed: true,
          })
        );
      });
    });
  });

  // ── Kids mode flows ──
  describe('Kids mode: Cami path', () => {
    it('completes kids Cami flow', async () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Find my companion'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ onboarding_path: 'cami', onboarding_completed: true })
        );
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  describe('Kids mode: Browse path', () => {
    it('completes kids Browse flow', async () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Browse companions'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ onboarding_path: 'browse', onboarding_completed: true })
        );
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  // ── Sign out ──
  describe('Sign out', () => {
    it('shows sign out button', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  // ── DB write verification ──
  describe('DB verification', () => {
    it('retries read-back after write to confirm onboarding_completed', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Find my companion'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        // update was called for the write
        expect(mockUpdate).toHaveBeenCalled();
        // select was called for the read-back verification
        expect(mockSelect).toHaveBeenCalledWith('onboarding_completed');
      });
    });

    it('handles DB write failure gracefully', async () => {
      mockUpdateEq.mockReturnValueOnce({ error: { message: 'DB error' } });
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Find my companion'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
      // onComplete should NOT have been called on failure
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // ── Path switching ──
  describe('Path switching', () => {
    it('allows switching between paths before submitting', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Create my own'));
      expect(screen.getByPlaceholderText(/Their name/)).toBeInTheDocument();
      fireEvent.click(screen.getByText('Find my companion'));
      // Name field should disappear when switching away from studio
      expect(screen.queryByPlaceholderText(/Their name/)).not.toBeInTheDocument();
    });
  });
});
