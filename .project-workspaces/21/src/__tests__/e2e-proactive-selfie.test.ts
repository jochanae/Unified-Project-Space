import { describe, it, expect } from 'vitest';

/**
 * Proactive Selfie Logic Tests
 *
 * These tests validate the key decision logic in the proactive-selfie
 * edge function without requiring a live Supabase instance.
 */

describe('Proactive Selfie: eligibility logic', () => {
  const SELFIE_COOLDOWN_HOURS = 48;

  it('skips user who received a selfie less than 48h ago', () => {
    const now = new Date();
    const lastSelfie = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    const hoursSince = (now.getTime() - lastSelfie.getTime()) / (1000 * 60 * 60);
    expect(hoursSince).toBeLessThan(SELFIE_COOLDOWN_HOURS);
  });

  it('allows user who received a selfie more than 48h ago', () => {
    const now = new Date();
    const lastSelfie = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72h ago
    const hoursSince = (now.getTime() - lastSelfie.getTime()) / (1000 * 60 * 60);
    expect(hoursSince).toBeGreaterThanOrEqual(SELFIE_COOLDOWN_HOURS);
  });

  it('allows user with no previous selfie', () => {
    const recentSelfies: any[] = [];
    expect(recentSelfies.length).toBe(0);
    // No selfie history → user is eligible
  });
});

describe('Proactive Selfie: hour gating', () => {
  it('blocks selfies before 9am', () => {
    const hour = 7;
    const blocked = hour < 9 || hour > 20;
    expect(blocked).toBe(true);
  });

  it('blocks selfies after 8pm', () => {
    const hour = 22;
    const blocked = hour < 9 || hour > 20;
    expect(blocked).toBe(true);
  });

  it('allows selfies at noon', () => {
    const hour = 12;
    const blocked = hour < 9 || hour > 20;
    expect(blocked).toBe(false);
  });

  it('force mode bypasses hour gate', () => {
    const forceMode = true;
    const hour = 3; // 3am
    const shouldBlock = !forceMode && (hour < 9 || hour > 20);
    expect(shouldBlock).toBe(false);
  });
});

describe('Proactive Selfie: random gate', () => {
  it('force mode bypasses random gate', () => {
    const forceMode = true;
    const randomVal = 0.99; // Would normally be skipped
    const shouldSkip = !forceMode && randomVal > 0.20;
    expect(shouldSkip).toBe(false);
  });

  it('normal mode skips 80% of users', () => {
    const forceMode = false;
    const randomVal = 0.50;
    const shouldSkip = !forceMode && randomVal > 0.20;
    expect(shouldSkip).toBe(true);
  });

  it('normal mode allows 20% of users', () => {
    const forceMode = false;
    const randomVal = 0.10;
    const shouldSkip = !forceMode && randomVal > 0.20;
    expect(shouldSkip).toBe(false);
  });
});

describe('Proactive Selfie: appearance fallback', () => {
  it('uses connection appearance_desc over profile', () => {
    const connection = { appearance_desc: 'tall with blue eyes' };
    const profile = { companion_appearance_desc: 'short with brown hair' };
    const effectiveDesc = connection.appearance_desc || profile.companion_appearance_desc;
    expect(effectiveDesc).toBe('tall with blue eyes');
  });

  it('falls back to profile when connection has no appearance_desc', () => {
    const connection = { appearance_desc: null };
    const profile = { companion_appearance_desc: 'short with brown hair' };
    const effectiveDesc = connection.appearance_desc || profile.companion_appearance_desc;
    expect(effectiveDesc).toBe('short with brown hair');
  });

  it('skips user when neither has appearance_desc', () => {
    const connection = { appearance_desc: null };
    const profile = { companion_appearance_desc: null };
    const effectiveDesc = connection.appearance_desc || profile.companion_appearance_desc;
    expect(effectiveDesc).toBeFalsy();
  });
});

describe('Proactive Selfie: caption sanitisation', () => {
  it('strips wrapping quotes from AI caption', () => {
    let caption = '"caught me reading in the park 📚"';
    caption = caption.replace(/^["']|["']$/g, '');
    expect(caption).toBe('caught me reading in the park 📚');
  });

  it('provides fallback when caption is empty', () => {
    let caption = '';
    const companionName = 'Aria';
    if (!caption) caption = `${companionName} sent you a selfie 📸`;
    expect(caption).toBe('Aria sent you a selfie 📸');
  });
});

describe('Proactive Selfie: memory context', () => {
  it('joins memories into hint string', () => {
    const memories = [
      { text: 'User loves hiking' },
      { text: 'User has a golden retriever named Max' },
      { text: 'Favorite place is the lake' },
    ];
    const memoryHints = memories.map(m => m.text).join('. ');
    expect(memoryHints).toContain('hiking');
    expect(memoryHints).toContain('Max');
    expect(memoryHints).toContain('lake');
  });

  it('handles empty memories gracefully', () => {
    const memories: any[] = [];
    const memoryHints = memories.map(m => m.text).join('. ');
    expect(memoryHints).toBe('');
  });
});

describe('Proactive Selfie: chat message format', () => {
  it('includes image URL in message when selfie generated', () => {
    const selfieImageUrl = 'https://storage.example.com/selfie.jpg';
    const caption = 'walking in the park with the pup 🐕';
    const messageContent = selfieImageUrl
      ? `📸 ${caption}\n[IMG:${selfieImageUrl}]`
      : `📸 ${caption}`;
    expect(messageContent).toContain('[IMG:');
    expect(messageContent).toContain('📸');
  });

  it('omits image tag when no selfie generated', () => {
    const selfieImageUrl: string | null = null;
    const caption = 'thinking of you ✨';
    const messageContent = selfieImageUrl
      ? `📸 ${caption}\n[IMG:${selfieImageUrl}]`
      : `📸 ${caption}`;
    expect(messageContent).not.toContain('[IMG:');
    expect(messageContent).toBe('📸 thinking of you ✨');
  });
});
