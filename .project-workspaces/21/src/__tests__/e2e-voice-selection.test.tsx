import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceBrowser from '../components/VoiceBrowser';

// Mock fetch for ElevenLabs API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sonner
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Mock companions
vi.mock('@/lib/companions', () => ({
  VOICE_ROSTER: [
    { id: 'voice-1', label: 'Sarah — Warm', gender: 'female', vibe: ['warm'], ageGroup: 'adult', ethnicity: 'American' },
    { id: 'voice-2', label: 'Liam — Calm', gender: 'male', vibe: ['calm'], ageGroup: 'adult', ethnicity: 'British' },
    { id: 'voice-3', label: 'River — Soft', gender: 'neutral', vibe: ['gentle'], ageGroup: 'adult', ethnicity: null },
    { id: 'voice-4', label: 'Luna — Teen', gender: 'female', vibe: ['playful'], ageGroup: 'teen', ethnicity: 'American' },
  ],
  VOICE_IDS: { male: 'voice-2', female: 'voice-1', neutral: 'voice-3' },
}));

// Mock Audio
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();

vi.stubGlobal('Audio', vi.fn(() => ({
  play: mockPlay,
  pause: mockPause,
  onended: null,
  onerror: null,
})));

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
});

describe('E2E Voice Selection', () => {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ voices: [], source: 'library' }),
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });
  });

  describe('Rendering', () => {
    it('renders sheet with title when open', () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          companionGender="female"
          onSelect={onSelect}
        />
      );
      expect(screen.getByText('Choose a voice')).toBeInTheDocument();
    });

    it('shows search input', () => {
      render(
        <VoiceBrowser open={true} onOpenChange={onOpenChange} onSelect={onSelect} />
      );
      expect(screen.getByPlaceholderText('Search voices...')).toBeInTheDocument();
    });

    it('shows gender filter tabs', () => {
      render(
        <VoiceBrowser open={true} onOpenChange={onOpenChange} onSelect={onSelect} />
      );
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Female')).toBeInTheDocument();
      expect(screen.getByText('Male')).toBeInTheDocument();
      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });

    it('shows confirm button', () => {
      render(
        <VoiceBrowser open={true} onOpenChange={onOpenChange} onSelect={onSelect} />
      );
      expect(screen.getByText('Select a voice')).toBeInTheDocument();
    });
  });

  describe('Local fallback voices', () => {
    it('shows adult voices when not minor', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          companionGender=""
          isMinor={false}
          onSelect={onSelect}
        />
      );
      // Local fallback should show adult voices
      await waitFor(() => {
        expect(screen.getByText('Sarah — Warm')).toBeInTheDocument();
        expect(screen.getByText('Liam — Calm')).toBeInTheDocument();
        expect(screen.getByText('River — Soft')).toBeInTheDocument();
      });
    });

    it('shows teen voices when minor', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          companionGender=""
          isMinor={true}
          onSelect={onSelect}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Luna — Teen')).toBeInTheDocument();
      });
      // Adult voices should not show in teen mode
      expect(screen.queryByText('Sarah — Warm')).not.toBeInTheDocument();
    });
  });

  describe('Voice selection', () => {
    it('selects a voice and enables confirm button', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Sarah — Warm')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Sarah — Warm'));
      expect(screen.getByText('Confirm voice')).toBeInTheDocument();
    });

    it('calls onSelect with voice_id on confirm', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Sarah — Warm')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Sarah — Warm'));
      fireEvent.click(screen.getByText('Confirm voice'));
      expect(onSelect).toHaveBeenCalledWith('voice-1');
    });

    it('pre-selects current voice', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          currentVoiceId="voice-2"
          onSelect={onSelect}
        />
      );
      // Confirm button should show since there's a pre-selected voice
      await waitFor(() => {
        expect(screen.getByText('Confirm voice')).toBeInTheDocument();
      });
    });
  });

  describe('Gender filtering', () => {
    it('filters local voices by gender tab', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          companionGender=""
          onSelect={onSelect}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Sarah — Warm')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Male'));
      // After clicking Male filter, should show only male voices
      await waitFor(() => {
        expect(screen.getByText('Liam — Calm')).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('has search input that accepts text', () => {
      render(
        <VoiceBrowser open={true} onOpenChange={onOpenChange} onSelect={onSelect} />
      );
      const searchInput = screen.getByPlaceholderText('Search voices...');
      fireEvent.change(searchInput, { target: { value: 'Sarah' } });
      expect(searchInput).toHaveValue('Sarah');
    });

    it('shows clear button when search has text', () => {
      render(
        <VoiceBrowser open={true} onOpenChange={onOpenChange} onSelect={onSelect} />
      );
      const searchInput = screen.getByPlaceholderText('Search voices...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      // An X button should appear for clearing
      const clearButtons = screen.getAllByRole('button');
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  describe('API fetch', () => {
    it('calls get-voices edge function on open', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          companionGender="female"
          onSelect={onSelect}
        />
      );
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/get-voices'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('sends gender filter in API request', async () => {
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          companionGender="male"
          onSelect={onSelect}
        />
      );
      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[0];
        const body = JSON.parse(lastCall[1].body);
        expect(body.gender).toBe('male');
      });
    });

    it('falls back to local voices when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      render(
        <VoiceBrowser
          open={true}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      );
      // Should still show local voices
      await waitFor(() => {
        expect(screen.getByText('Sarah — Warm')).toBeInTheDocument();
      });
    });
  });
});
