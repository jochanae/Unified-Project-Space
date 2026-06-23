import { describe, it, expect } from 'vitest';
import { calculateAge, isAdult, isUnder13, isMinor, treatAsMinor } from '../ageUtils';

describe('calculateAge', () => {
  it('returns null for null/undefined input', () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(calculateAge('not-a-date')).toBeNull();
    expect(calculateAge('')).toBeNull();
  });

  it('calculates age correctly from string', () => {
    const age = calculateAge('2000-01-01');
    expect(age).toBeGreaterThanOrEqual(25);
    expect(age).toBeLessThanOrEqual(27);
  });

  it('calculates age correctly from Date object', () => {
    const age = calculateAge(new Date('2000-06-15'));
    expect(age).toBeGreaterThanOrEqual(25);
    expect(age).toBeLessThanOrEqual(26);
  });

  it('handles future date (negative age)', () => {
    const age = calculateAge('2099-01-01');
    expect(age).toBeLessThan(0);
  });
});

describe('isAdult', () => {
  it('returns false for null DOB', () => {
    expect(isAdult(null)).toBe(false);
  });

  it('returns true for someone born in 2000', () => {
    expect(isAdult('2000-01-01')).toBe(true);
  });

  it('returns false for a child', () => {
    expect(isAdult('2020-01-01')).toBe(false);
  });
});

describe('isUnder13', () => {
  it('returns false for null DOB', () => {
    expect(isUnder13(null)).toBe(false);
  });

  it('returns true for a very young child', () => {
    const recentYear = new Date().getFullYear() - 5;
    expect(isUnder13(`${recentYear}-06-01`)).toBe(true);
  });

  it('returns false for a teenager', () => {
    expect(isUnder13('2010-01-01')).toBe(false);
  });

  it('returns false for an adult', () => {
    expect(isUnder13('2000-01-01')).toBe(false);
  });
});

describe('isMinor', () => {
  it('returns false for null DOB', () => {
    expect(isMinor(null)).toBe(false);
  });

  it('returns true for teens 13-17', () => {
    const teenYear = new Date().getFullYear() - 15;
    expect(isMinor(`${teenYear}-06-01`)).toBe(true);
  });

  it('returns false for adults', () => {
    expect(isMinor('2000-01-01')).toBe(false);
  });

  it('returns false for children under 13', () => {
    const childYear = new Date().getFullYear() - 5;
    expect(isMinor(`${childYear}-06-01`)).toBe(false);
  });
});

describe('treatAsMinor', () => {
  it('returns true when DOB is null (fail-safe)', () => {
    expect(treatAsMinor(null)).toBe(true);
  });

  it('returns true when DOB is undefined (fail-safe)', () => {
    expect(treatAsMinor(undefined)).toBe(true);
  });

  it('returns true for minors', () => {
    expect(treatAsMinor('2015-01-01')).toBe(true);
  });

  it('returns false for adults', () => {
    expect(treatAsMinor('2000-01-01')).toBe(false);
    expect(treatAsMinor('1995-12-31')).toBe(false);
  });
});
