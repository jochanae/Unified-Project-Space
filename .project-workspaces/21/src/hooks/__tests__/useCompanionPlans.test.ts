import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock supabase
const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Helper to create a mock chain for select queries
function mockSelectChain(data: any[] = [], error: any = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  };
}

describe('useCompanionPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when userId is undefined', async () => {
    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should fetch plans when userId is provided', async () => {
    const mockData = [
      {
        id: 'plan-1',
        member_id: 'member-1',
        companion_name: 'Luna',
        title: 'Morning Workout',
        description: 'A daily routine',
        category: 'workout',
        emoji: '💪',
        schedule: { time: '07:00' },
        status: 'active',
        created_at: '2026-03-12T10:00:00Z',
        updated_at: '2026-03-12T10:00:00Z',
        plan_type: 'guidance',
        steps: ['Step 1', 'Step 2'],
        companion_note: 'You got this!',
        playbook_theme: 'fitness',
        stage: 'active',
        completed_at: null,
        checked_steps: [0],
        checklist_reset: 'daily',
      },
    ];

    mockFrom.mockReturnValue(mockSelectChain(mockData));

    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans('user-123'), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveLength(1);
    const plan = result.current.data![0];
    expect(plan.title).toBe('Morning Workout');
    expect(plan.memberId).toBe('member-1');
    expect(plan.companionName).toBe('Luna');
    expect(plan.planType).toBe('guidance');
    expect(plan.steps).toEqual(['Step 1', 'Step 2']);
    expect(plan.checkedSteps).toEqual([0]);
    expect(plan.checklistReset).toBe('daily');
  });

  it('maps checkedSteps and checklistReset from DB fields', async () => {
    const mockData = [
      {
        id: 'plan-2',
        member_id: 'member-1',
        companion_name: 'Marcus',
        title: 'Daily Habits',
        description: null,
        category: 'routine',
        emoji: '📋',
        schedule: {},
        status: 'active',
        created_at: '2026-03-13T08:00:00Z',
        updated_at: '2026-03-13T08:00:00Z',
        plan_type: 'guidance',
        steps: ['Meditate', 'Exercise', 'Journal'],
        companion_note: null,
        playbook_theme: null,
        stage: 'active',
        completed_at: null,
        checked_steps: [0, 2],
        checklist_reset: 'daily',
      },
    ];

    mockFrom.mockReturnValue(mockSelectChain(mockData));

    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans('user-456'), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const plan = result.current.data![0];
    expect(plan.checkedSteps).toEqual([0, 2]);
    expect(plan.checklistReset).toBe('daily');
  });

  it('defaults checkedSteps to empty array when null', async () => {
    const mockData = [
      {
        id: 'plan-3',
        member_id: 'member-1',
        companion_name: 'Luna',
        title: 'One-time plan',
        description: null,
        category: 'general',
        emoji: '📋',
        schedule: {},
        status: 'active',
        created_at: '2026-03-13T08:00:00Z',
        updated_at: '2026-03-13T08:00:00Z',
        plan_type: 'guidance',
        steps: ['Do thing'],
        companion_note: null,
        playbook_theme: null,
        stage: 'active',
        completed_at: null,
        checked_steps: null,
        checklist_reset: null,
      },
    ];

    mockFrom.mockReturnValue(mockSelectChain(mockData));

    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans('user-789'), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const plan = result.current.data![0];
    expect(plan.checkedSteps).toEqual([]);
    expect(plan.checklistReset).toBeNull();
  });

  it('completePlan should be a no-op when userId is undefined', async () => {
    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans(undefined), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.completePlan('plan-abc');
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('dismissPlan should be a no-op when userId is undefined', async () => {
    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans(undefined), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.dismissPlan('plan-xyz');
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns all expected functions', async () => {
    mockFrom.mockReturnValue(mockSelectChain([]));

    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans('user-123'), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.completePlan).toBe('function');
    expect(typeof result.current.dismissPlan).toBe('function');
    expect(typeof result.current.acceptPlan).toBe('function');
    expect(typeof result.current.reactivatePlan).toBe('function');
    expect(typeof result.current.updateStage).toBe('function');
    expect(typeof result.current.createPlan).toBe('function');
    expect(typeof result.current.toggleStep).toBe('function');
  });

  it('toggleStep should be a no-op when userId is undefined', async () => {
    const { useCompanionPlans } = await import('../useCompanionPlans');
    const { result } = renderHook(() => useCompanionPlans(undefined), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.toggleStep('plan-abc', 0, []);
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });
});
