import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Onboarding from '../Onboarding';

// Mock supabase
const mockUpdateEq = vi.fn().mockReturnValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
const mockSingle = vi.fn().mockResolvedValue({ data: { onboarding_completed: true }, error: null });
const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: mockUpdate, select: mockSelect }) },
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const createComponent = (tag: string) => ({ children, onClick, ...props }: any) => {
    const Tag = tag as any;
    return <Tag onClick={onClick} {...props}>{children}</Tag>;
  };
  return {
    motion: new Proxy({}, { get: (_t, prop: string) => createComponent(prop) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/hooks/useOnboardingSfx', () => ({ playSelectSound: vi.fn() }));
vi.mock('@/assets/browse/amara.jpg', () => ({ default: 'amara.jpg' }));
vi.mock('@/assets/browse/nova.jpg', () => ({ default: 'nova.jpg' }));
vi.mock('@/assets/browse/nyx.jpg', () => ({ default: 'nyx.jpg' }));
vi.mock('@/assets/browse/aether-orb.jpg', () => ({ default: 'aether.jpg' }));
vi.mock('@/assets/cami-avatar.jpg', () => ({ default: 'cami.jpg' }));

describe('Onboarding: Full path walkthroughs', () => {
  const onComplete = vi.fn();
  const userId = 'test-user';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockReturnValue({ error: null });
    mockSingle.mockResolvedValue({ data: { onboarding_completed: true }, error: null });
  });

  describe('Cami path (adult)', () => {
    it('completes full flow and saves onboarding_path=cami', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      // Path selection is now step 1
      fireEvent.click(screen.getByText('Find my companion'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ onboarding_path: 'cami', onboarding_completed: true }));
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  describe('Browse path (adult)', () => {
    it('completes full flow and saves onboarding_path=browse', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Browse companions'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ onboarding_path: 'browse', onboarding_completed: true }));
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  describe('Studio path (adult)', () => {
    it('completes full flow and saves onboarding_path=studio', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Create my own'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ onboarding_path: 'studio', onboarding_completed: true }));
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/studio?from=onboarding'));
    });

    it('Create my own is available in kids mode', () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });
  });

  describe('Kids mode: Cami path', () => {
    it('completes kids Cami flow', async () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      fireEvent.click(screen.getByText('Find my companion'));
      fireEvent.click(screen.getByRole('button', { name: /Meet your Compani/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
          onboarding_path: 'cami',
          onboarding_completed: true,
        }));
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
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
          onboarding_path: 'browse',
          onboarding_completed: true,
        }));
      });
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('/browse'));
    });
  });

  describe('Path selection', () => {
    it('shows all three paths for adults', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText('Find my companion')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });
  });
});
