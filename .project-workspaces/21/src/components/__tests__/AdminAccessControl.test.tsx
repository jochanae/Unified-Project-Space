import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminRouteGuard } from '../AdminRouteGuard';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
const mockMaybeSingle = vi.fn();
const mockEqRole = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqRole });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: () => ({ select: mockSelect }),
  },
}));

describe('AdminRouteGuard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRouteGuard>
          <div>Admin Content</div>
        </AdminRouteGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('redirects when user has no admin role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: null });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRouteGuard>
          <div>Admin Content</div>
        </AdminRouteGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('renders children when user is admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: { role: 'admin' } });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRouteGuard>
          <div>Admin Content</div>
        </AdminRouteGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('shows nothing during loading state', () => {
    mockGetUser.mockReturnValue(new Promise(() => {})); // Never resolves

    const { container } = render(
      <MemoryRouter>
        <AdminRouteGuard>
          <div>Admin Content</div>
        </AdminRouteGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });
});
