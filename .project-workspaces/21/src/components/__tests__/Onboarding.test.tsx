import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Onboarding from '../Onboarding';

// Mock supabase
const mockEq = vi.fn().mockReturnValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: mockUpdate }) },
}));

// Mock framer-motion — need span too
vi.mock('framer-motion', () => {
  const createComponent = (tag: string) => ({ children, onClick, ...props }: any) => {
    const Tag = tag as any;
    return <Tag onClick={onClick} {...props}>{children}</Tag>;
  };
  return {
    motion: new Proxy({}, {
      get: (_target, prop: string) => createComponent(prop),
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock sfx
vi.mock('@/hooks/useOnboardingSfx', () => ({ playSelectSound: vi.fn() }));

// Mock image imports
vi.mock('@/assets/browse/amara.jpg', () => ({ default: 'amara.jpg' }));
vi.mock('@/assets/browse/nova.jpg', () => ({ default: 'nova.jpg' }));
vi.mock('@/assets/browse/nyx.jpg', () => ({ default: 'nyx.jpg' }));
vi.mock('@/assets/browse/aether-orb.jpg', () => ({ default: 'aether.jpg' }));
vi.mock('@/assets/cami-avatar.jpg', () => ({ default: 'cami.jpg' }));

describe('Onboarding', () => {
  const onComplete = vi.fn();
  const userId = 'test-user';

  beforeEach(() => { vi.clearAllMocks(); mockUpdate.mockReturnValue({ eq: mockEq }); mockEq.mockReturnValue({ error: null }); });

  describe('Adults flow', () => {
    it('shows path selection on first step', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText(/How would you like to meet your companion/i)).toBeInTheDocument();
      expect(screen.getByText('Find my companion')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });

    it('shows all 3 paths including Create my own for adults', () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      expect(screen.getByText('Find my companion')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });
  });

  describe('Kids mode', () => {
    it('shows path selection with all three paths for kids', () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      expect(screen.getByText(/How would you like to meet your companion/i)).toBeInTheDocument();
      expect(screen.getByText('Find my companion')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Create my own')).toBeInTheDocument();
    });
  });

  describe('Data persistence', () => {
    it('saves preferences via .update() when selecting Find my companion', async () => {
      render(<Onboarding userId={userId} onComplete={onComplete} />);
      // Select "Find my companion" path
      fireEvent.click(screen.getByText('Find my companion'));
      // Click the continue/finish button
      const finishBtn = screen.getByRole('button', { name: /Meet your Compani/i });
      fireEvent.click(finishBtn);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            onboarding_path: 'cami',
            onboarding_completed: true,
          })
        );
      });
    });

    it('saves null preferences for kids mode', async () => {
      render(<Onboarding userId={userId} kidsMode onComplete={onComplete} />);
      // Kids: select Find my companion
      fireEvent.click(screen.getByText('Find my companion'));
      const finishBtn = screen.getByRole('button', { name: /Meet your Compani/i });
      fireEvent.click(finishBtn);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            onboarding_path: 'cami',
            onboarding_completed: true,
          })
        );
      });
    });
  });
});
