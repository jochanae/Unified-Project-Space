import { describe, it, expect, vi } from 'vitest';
import { isAdult } from '@/lib/ageUtils';

describe('Age-gated pricing perks logic', () => {
  const adultPerks = [
    'Unlimited messages',
    'Up to 5 companions',
    'Full image generation',
    '🔥 Mature / Flame mode',
    'Companion photos via SMS',
  ];

  const minorPerks = [
    'Unlimited messages',
    'Up to 5 companions',
    'Full image generation',
    '🎮 Exclusive companion activities',
    'Companion photos via SMS',
  ];

  function getPerks(dateOfBirth: string | null | undefined) {
    return isAdult(dateOfBirth) ? adultPerks : minorPerks;
  }

  it('shows Flame mode for verified adults (18+)', () => {
    const perks = getPerks('2000-01-01');
    expect(perks).toContain('🔥 Mature / Flame mode');
    expect(perks).not.toContain('🎮 Exclusive companion activities');
  });

  it('hides Flame mode for minors (under 18)', () => {
    const perks = getPerks('2015-06-15');
    expect(perks).not.toContain('🔥 Mature / Flame mode');
    expect(perks).toContain('🎮 Exclusive companion activities');
  });

  it('defaults to minor-safe perks when DOB is null', () => {
    const perks = getPerks(null);
    expect(perks).not.toContain('🔥 Mature / Flame mode');
    expect(perks).toContain('🎮 Exclusive companion activities');
  });

  it('defaults to minor-safe perks when DOB is undefined', () => {
    const perks = getPerks(undefined);
    expect(perks).not.toContain('🔥 Mature / Flame mode');
    expect(perks).toContain('🎮 Exclusive companion activities');
  });

  it('keeps same perk count for both audiences', () => {
    expect(adultPerks.length).toBe(minorPerks.length);
  });
});
