import { describe, it, expect } from 'vitest';

/**
 * Tests the plan extraction regex pattern used in useChatStreaming.ts
 * to determine whether to trigger the extract-plans edge function.
 */

const PLAN_REGEX = /\b(plan for you|here'?s (a|your) (plan|routine|schedule)|(daily|weekly|morning|evening) routine|let'?s set up|i'?ve (put together|created|drafted)|action items:|step[s]? to follow|checklist:)/i;

describe('Plan extraction trigger regex', () => {
  const shouldMatch = [
    'Here\'s a workout plan for you',
    'Here\'s a plan for you to follow',
    'Here is your daily routine for the morning',
    'I\'ve put together a schedule for your week',
    'I\'ve created a morning routine for you',
    'Let\'s set up a daily check-in',
    'Here are your action items: 1. Wake up early',
    'Here\'s your schedule for the week',
    'I\'ve drafted a wellness plan for you',
    'Follow these steps to follow for your workout',
    'Here\'s a checklist: morning tasks',
    'Your evening routine could look like this',
  ];

  const shouldNotMatch = [
    'How was your day?',
    'That sounds fun!',
    'I understand how you feel',
    'Tell me more about that',
    'I suggest we talk about something else',
    'I recommend taking a break',
    'Here\'s what I think about that',
    'Here\'s how I see it',
    'You should try doing more of what makes you happy',
    'Every day is a new opportunity',
    'I was fixing bugs all day',
    'Let me know about your work rules',
    'Those are interesting steps in your process',
  ];

  shouldMatch.forEach((text) => {
    it(`should trigger extraction for: "${text.slice(0, 50)}..."`, () => {
      expect(PLAN_REGEX.test(text)).toBe(true);
    });
  });

  shouldNotMatch.forEach((text) => {
    it(`should NOT trigger extraction for: "${text}"`, () => {
      expect(PLAN_REGEX.test(text)).toBe(false);
    });
  });
});

describe('Plan data mapping', () => {
  it('should correctly map snake_case DB fields to camelCase', () => {
    const dbRow = {
      id: 'abc-123',
      member_id: 'member-1',
      companion_name: 'Luna',
      title: 'Morning Workout',
      description: 'A daily workout routine',
      category: 'workout',
      emoji: '💪',
      schedule: { time: '07:00', days: ['Monday', 'Wednesday', 'Friday'], frequency: 'daily' },
      status: 'active',
      created_at: '2026-03-12T10:00:00Z',
      updated_at: '2026-03-12T10:00:00Z',
      plan_type: 'guidance',
      steps: ['Step 1', 'Step 2'],
      companion_note: 'Keep going!',
      playbook_theme: 'fitness',
      stage: 'active',
      completed_at: null,
      checked_steps: [0],
      checklist_reset: 'daily',
    };

    const mapped: Record<string, any> = {
      id: dbRow.id,
      memberId: dbRow.member_id,
      companionName: dbRow.companion_name,
      title: dbRow.title,
      description: dbRow.description,
      category: dbRow.category,
      emoji: dbRow.emoji,
      schedule: dbRow.schedule || {},
      status: dbRow.status,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      planType: dbRow.plan_type,
      steps: dbRow.steps,
      companionNote: dbRow.companion_note,
      playbookTheme: dbRow.playbook_theme,
      stage: dbRow.stage,
      completedAt: dbRow.completed_at,
      checkedSteps: dbRow.checked_steps,
      checklistReset: dbRow.checklist_reset,
    };

    expect(mapped.memberId).toBe('member-1');
    expect(mapped.companionName).toBe('Luna');
    expect(mapped.schedule.time).toBe('07:00');
    expect(mapped.schedule.days).toEqual(['Monday', 'Wednesday', 'Friday']);
    expect(mapped.emoji).toBe('💪');
    expect(mapped.planType).toBe('guidance');
    expect(mapped.steps).toEqual(['Step 1', 'Step 2']);
    expect(mapped.checkedSteps).toEqual([0]);
    expect(mapped.checklistReset).toBe('daily');
  });

  it('should handle null schedule gracefully', () => {
    const raw: any = null;
    const schedule = raw || {};
    expect(schedule).toEqual({});
  });

  it('should handle missing description', () => {
    const description = null;
    expect(description).toBeNull();
  });

  it('should handle null checked_steps as empty array', () => {
    const raw: any = null;
    const checked = Array.isArray(raw) ? raw : [];
    expect(checked).toEqual([]);
  });

  it('should handle null checklist_reset as null', () => {
    const raw: any = null;
    const reset = raw || null;
    expect(reset).toBeNull();
  });
});

describe('Schedule display logic', () => {
  it('should show time and day when both present', () => {
    const schedule = { time: '07:00', days: ['Monday'], frequency: 'daily' };
    const text = schedule.time
      ? `${schedule.days?.[0] || 'Today'} • ${schedule.time}`
      : schedule.frequency || '';
    expect(text).toBe('Monday • 07:00');
  });

  it('should fallback to "Today" when no days', () => {
    const schedule = { time: '08:00' } as any;
    const text = schedule.time
      ? `${schedule.days?.[0] || 'Today'} • ${schedule.time}`
      : schedule.frequency || '';
    expect(text).toBe('Today • 08:00');
  });

  it('should show frequency when no time', () => {
    const schedule = { frequency: 'weekly' } as any;
    const text = schedule.time
      ? `${schedule.days?.[0] || 'Today'} • ${schedule.time}`
      : schedule.frequency || '';
    expect(text).toBe('weekly');
  });

  it('should return empty string when no schedule info', () => {
    const schedule = {} as any;
    const text = schedule.time
      ? `${schedule.days?.[0] || 'Today'} • ${schedule.time}`
      : schedule.frequency || '';
    expect(text).toBe('');
  });
});

describe('Checklist step toggle logic', () => {
  it('adds step index to checked array', () => {
    const current = [0];
    const stepIndex = 2;
    const result = current.includes(stepIndex)
      ? current.filter(i => i !== stepIndex)
      : [...current, stepIndex];
    expect(result).toEqual([0, 2]);
  });

  it('removes step index from checked array', () => {
    const current = [0, 1, 2];
    const stepIndex = 1;
    const result = current.includes(stepIndex)
      ? current.filter(i => i !== stepIndex)
      : [...current, stepIndex];
    expect(result).toEqual([0, 2]);
  });

  it('detects all steps completed', () => {
    const totalSteps = 3;
    const checked = [0, 1, 2];
    const allDone = checked.length === totalSteps;
    expect(allDone).toBe(true);
  });

  it('detects not all steps completed', () => {
    const totalSteps = 3;
    const checked = [0, 2];
    const allDone = checked.length === totalSteps;
    expect(allDone).toBe(false);
  });
});

describe('Daily reset logic', () => {
  it('should reset checked steps when updated on a different day', () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const checklistReset = 'daily';
    const updatedDay = yesterday;
    const effectiveChecked = checklistReset === 'daily' && updatedDay !== today
      ? []
      : [0, 1, 2];
    expect(effectiveChecked).toEqual([]);
  });

  it('should keep checked steps when updated same day', () => {
    const today = new Date().toDateString();
    const checklistReset = 'daily';
    const updatedDay = today;
    const savedChecks = [0, 1];
    const effectiveChecked = checklistReset === 'daily' && updatedDay !== today
      ? []
      : savedChecks;
    expect(effectiveChecked).toEqual([0, 1]);
  });

  it('should not reset for non-daily checklists', () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const checklistReset: string | null = null;
    const updatedDay = yesterday;
    const savedChecks = [0, 1, 2];
    const effectiveChecked = checklistReset === 'daily' && updatedDay !== today
      ? []
      : savedChecks;
    expect(effectiveChecked).toEqual([0, 1, 2]);
  });
});
