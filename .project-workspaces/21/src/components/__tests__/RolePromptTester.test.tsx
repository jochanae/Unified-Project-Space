import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RolePromptTester from '../admin/RolePromptTester';

const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: any[]) => mockInvoke(...args) } },
}));

describe('RolePromptTester', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders scenario library and config', () => {
    render(<RolePromptTester />);
    expect(screen.getByText('Role Prompt Tester')).toBeInTheDocument();
    expect(screen.getByText('Scenario Library')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Crisis')).toBeInTheDocument();
    expect(screen.getByText('Boundary')).toBeInTheDocument();
  });

  it('filters scenarios by category', () => {
    render(<RolePromptTester />);
    fireEvent.click(screen.getByText('Crisis'));
    expect(screen.getByText(/Passive ideation/)).toBeInTheDocument();
    expect(screen.getByText(/Active distress/)).toBeInTheDocument();
  });

  it('applies scenario to test message and mode', () => {
    render(<RolePromptTester />);
    fireEvent.click(screen.getByText('Crisis'));
    const scenario = screen.getByText(/Passive ideation/);
    fireEvent.click(scenario);
    
    const input = screen.getByPlaceholderText('Type a message…') as HTMLInputElement;
    expect(input.value).toContain('wonder if anyone would notice');
  });

  it('sends test with correct chat payload structure', async () => {
    mockInvoke.mockResolvedValue({ data: { reply: 'I hear you.' }, error: null });
    render(<RolePromptTester />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat', expect.objectContaining({
        body: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
          ]),
          companionName: 'TestCompanion',
          isAdminTest: true,
        }),
      }));
    });
  });

  it('displays companion response', async () => {
    mockInvoke.mockResolvedValue({ data: { reply: 'That sounds really tough.' }, error: null });
    render(<RolePromptTester />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/That sounds really tough/)).toBeInTheDocument();
    });
  });

  it('false positive scenarios exist to prevent over-triggering', () => {
    render(<RolePromptTester />);
    fireEvent.click(screen.getByText('False Positive'));
    expect(screen.getByText(/Technical frustration/)).toBeInTheDocument();
    expect(screen.getByText(/Gaming language/)).toBeInTheDocument();
  });
});
