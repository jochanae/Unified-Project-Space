import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AITester from '../admin/AITester';

const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: any[]) => mockInvoke(...args) } },
}));

describe('AITester', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders with endpoint selector and send button', () => {
    render(<AITester />);
    expect(screen.getByText('AI / API Tester')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('shows error for invalid JSON payload', async () => {
    render(<AITester />);
    const textarea = screen.getByPlaceholderText('JSON payload…');
    fireEvent.change(textarea, { target: { value: 'not json {{{' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON payload')).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('calls supabase.functions.invoke on send with valid payload', async () => {
    mockInvoke.mockResolvedValue({ data: { reply: 'Hello!' }, error: null });
    render(<AITester />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat', expect.objectContaining({
        body: expect.any(Object),
      }));
    });
  });

  it('displays success result', async () => {
    mockInvoke.mockResolvedValue({ data: { reply: 'Test response works' }, error: null });
    render(<AITester />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/Test response works/)).toBeInTheDocument();
    });
  });

  it('displays error result', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Function crashed' } });
    render(<AITester />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/Error: Function crashed/)).toBeInTheDocument();
    });
  });

  it('shows latency badge after response', async () => {
    mockInvoke.mockResolvedValue({ data: 'ok', error: null });
    render(<AITester />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/\d+ms/)).toBeInTheDocument();
    });
  });
});
