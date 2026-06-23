import { describe, it, expect } from 'vitest';
import { getAmbientStyles } from '../ambientBackgrounds';

describe('getAmbientStyles', () => {
  it('returns YOUTH styles for minors', () => {
    const styles = getAmbientStyles(true);
    expect(styles.base).toContain('hsl(220');
    expect(styles.leaks).toContain('hsl(185');
  });

  it('returns ADULT styles for adults', () => {
    const styles = getAmbientStyles(false);
    expect(styles.base).toContain('hsl(225');
    expect(styles.leaks).toContain('hsl(350');
  });

  it('returns an object with base and leaks properties', () => {
    const styles = getAmbientStyles(true);
    expect(styles).toHaveProperty('base');
    expect(styles).toHaveProperty('leaks');
    expect(typeof styles.base).toBe('string');
    expect(typeof styles.leaks).toBe('string');
  });
});
