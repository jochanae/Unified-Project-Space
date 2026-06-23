import { describe, it, expect } from 'vitest';
import { CRISIS_RESOURCES } from '../moderation';

describe('Crisis Resources', () => {
  it('has correct structure', () => {
    expect(CRISIS_RESOURCES.title).toBe("You're not alone");
    expect(CRISIS_RESOURCES.message).toBeTruthy();
    expect(CRISIS_RESOURCES.resources).toHaveLength(3);
  });

  it('includes 988 Suicide & Crisis Lifeline', () => {
    const lifeline = CRISIS_RESOURCES.resources.find(r => r.value === '988');
    expect(lifeline).toBeDefined();
    expect(lifeline!.type).toBe('phone');
  });

  it('includes Crisis Text Line', () => {
    const textLine = CRISIS_RESOURCES.resources.find(r => r.type === 'text');
    expect(textLine).toBeDefined();
    expect(textLine!.value).toContain('741741');
  });

  it('includes international resource link', () => {
    const link = CRISIS_RESOURCES.resources.find(r => r.type === 'link');
    expect(link).toBeDefined();
    expect(link!.value).toContain('https://');
  });
});
