import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CompanionRevealCard from '../CompanionRevealCard';

// Mock framer-motion
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

// Mock AbstractAvatar
vi.mock('../AbstractAvatar', () => ({
  default: ({ memberId, size }: any) => (
    <div data-testid="abstract-avatar" data-member-id={memberId} data-size={size} />
  ),
}));

// Suppress AudioContext / vibrate
beforeEach(() => {
  (globalThis as any).AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: () => ({
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
    destination: {},
    currentTime: 0,
  }));
  Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), writable: true, configurable: true });
});

describe('CompanionRevealCard', () => {
  const onContinue = vi.fn();
  const onRedo = vi.fn();
  const onSwitchPath = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders photo avatar when visualMode is not abstract', () => {
    render(<CompanionRevealCard name="Nina" avatarUrl="https://example.com/nina.jpg" bio="A creative soul" onContinue={onContinue} />);
    // The avatar uses a shimmer-loading pattern with aria-hidden img
    const img = document.querySelector('img[src="https://example.com/nina.jpg"]');
    expect(img).toBeTruthy();
    expect(screen.queryByTestId('abstract-avatar')).not.toBeInTheDocument();
  });

  it('renders AbstractAvatar when visualMode is abstract and no avatarUrl', () => {
    render(<CompanionRevealCard name="Echo" visualMode="abstract" memberId="m-123" onContinue={onContinue} />);
    expect(screen.getByTestId('abstract-avatar')).toHaveAttribute('data-member-id', 'm-123');
    expect(screen.getByText('NO FACE · JUST ENERGY ✨')).toBeInTheDocument();
    expect(screen.queryByAltText('Echo')).not.toBeInTheDocument();
  });

  it('renders initial fallback when no avatar', () => {
    render(<CompanionRevealCard name="Kael" onContinue={onContinue} />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('fires onContinue after inscription flow completes', async () => {
    vi.useFakeTimers();
    render(<CompanionRevealCard name="Nina" onContinue={onContinue} />);
    // Click "Say hello →" starts inscription phase
    fireEvent.click(screen.getByText('Say hello →'));
    // Advance past the 2200ms inscription timer to reach "decree" phase
    await act(async () => { vi.advanceTimersByTime(2500); });
    // Now click the final CTA in the decree phase
    fireEvent.click(screen.getByText('Enter Your Space →'));
    expect(onContinue).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('renders bio text', () => {
    render(<CompanionRevealCard name="Nina" bio="Loves music" onContinue={onContinue} />);
    expect(screen.getByText('Loves music')).toBeInTheDocument();
  });

  describe('Redo menu', () => {
    it('shows "Not quite right?" when onRedo or onSwitchPath is provided', () => {
      render(<CompanionRevealCard name="Nina" onContinue={onContinue} onRedo={onRedo} />);
      expect(screen.getByText('Not quite right?')).toBeInTheDocument();
    });

    it('hides trigger when no redo options', () => {
      render(<CompanionRevealCard name="Nina" onContinue={onContinue} />);
      expect(screen.queryByText('Not quite right?')).not.toBeInTheDocument();
    });

    it('opens bottom menu with Try again, Browse, and Studio options', () => {
      render(<CompanionRevealCard name="Nina" currentPath="cami" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      expect(screen.getByText('Try again')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.getByText('Build in Studio')).toBeInTheDocument();
    });

    it('hides Browse option when currentPath is browse', () => {
      render(<CompanionRevealCard name="Nina" currentPath="browse" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      expect(screen.getByText('Try again')).toBeInTheDocument();
      expect(screen.queryByText('Browse companions')).not.toBeInTheDocument();
      expect(screen.getByText('Build in Studio')).toBeInTheDocument();
    });

    it('hides Studio option when currentPath is studio', () => {
      render(<CompanionRevealCard name="Nina" currentPath="studio" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      expect(screen.getByText('Try again')).toBeInTheDocument();
      expect(screen.getByText('Browse companions')).toBeInTheDocument();
      expect(screen.queryByText('Build in Studio')).not.toBeInTheDocument();
    });

    it('fires onRedo when Try again is clicked', () => {
      render(<CompanionRevealCard name="Nina" currentPath="cami" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      fireEvent.click(screen.getByText('Try again'));
      expect(onRedo).toHaveBeenCalledOnce();
    });

    it('fires onSwitchPath("browse") when Browse is clicked', () => {
      render(<CompanionRevealCard name="Nina" currentPath="cami" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      fireEvent.click(screen.getByText('Browse companions'));
      expect(onSwitchPath).toHaveBeenCalledWith('browse');
    });

    it('fires onSwitchPath("studio") when Studio is clicked', () => {
      render(<CompanionRevealCard name="Nina" currentPath="cami" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      fireEvent.click(screen.getByText('Build in Studio'));
      expect(onSwitchPath).toHaveBeenCalledWith('studio');
    });

    it('closes menu on Cancel', () => {
      render(<CompanionRevealCard name="Nina" currentPath="cami" onContinue={onContinue} onRedo={onRedo} onSwitchPath={onSwitchPath} />);
      fireEvent.click(screen.getByText('Not quite right?'));
      expect(screen.getByText('Try a different approach')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Cancel'));
      // Menu title should be gone (AnimatePresence mock removes immediately)
      expect(screen.queryByText('Try a different approach')).not.toBeInTheDocument();
    });
  });
});
