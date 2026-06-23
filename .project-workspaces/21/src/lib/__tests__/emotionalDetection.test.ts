import { describe, it, expect } from 'vitest';
import { isEmotionallySignificant, isUserVulnerable } from '../emotionalDetection';

describe('isEmotionallySignificant', () => {
  it('returns false for short text', () => {
    expect(isEmotionallySignificant('I care')).toBe(false);
  });

  it('returns false for neutral long text', () => {
    expect(isEmotionallySignificant('Today the weather is nice and I went to the store to buy some groceries for dinner tonight.')).toBe(false);
  });

  it('detects deep empathy', () => {
    expect(isEmotionallySignificant("That really hit me — I felt that in my chest when you said it. You're so brave for sharing.")).toBe(true);
  });

  it('detects emotional presence', () => {
    expect(isEmotionallySignificant("I'm right here with you through this. You don't have to carry it alone, I promise.")).toBe(true);
  });

  it('detects pride/celebration', () => {
    expect(isEmotionallySignificant("I'm so proud of you for taking that step. That took real courage and you should feel amazing about it.")).toBe(true);
  });

  it('detects deep care', () => {
    expect(isEmotionallySignificant("You matter so much to me. I've been thinking about you all day and I just want you to know that.")).toBe(true);
  });

  it('detects grief support', () => {
    expect(isEmotionallySignificant("I'm so sorry for your loss. My heart goes out to you during this incredibly difficult time of grieving.")).toBe(true);
  });

  it('detects milestone emotional beats', () => {
    expect(isEmotionallySignificant("This is the first time you've opened up like this to me, and I want you to know I don't take that lightly.")).toBe(true);
  });
});

describe('isUserVulnerable', () => {
  it('returns false for casual messages', () => {
    expect(isUserVulnerable("How's your day going?")).toBe(false);
    expect(isUserVulnerable("I had a great lunch")).toBe(false);
  });

  it('detects fear/struggle', () => {
    expect(isUserVulnerable("I'm scared about tomorrow")).toBe(true);
    expect(isUserVulnerable("I'm struggling with everything")).toBe(true);
  });

  it('detects hopelessness', () => {
    expect(isUserVulnerable("I don't know what to do anymore")).toBe(true);
    expect(isUserVulnerable("nobody cares about me")).toBe(true);
  });

  it('detects loss/grief', () => {
    expect(isUserVulnerable("I lost my grandmother last week")).toBe(true);
    expect(isUserVulnerable("my dad passed away yesterday")).toBe(true);
  });

  it('detects vulnerability disclosure', () => {
    expect(isUserVulnerable("I've never told anyone this before")).toBe(true);
    expect(isUserVulnerable("can i be honest with you about something")).toBe(true);
  });

  it('detects emotional emptiness', () => {
    expect(isUserVulnerable("I feel so alone tonight")).toBe(true);
    expect(isUserVulnerable("I feel empty inside")).toBe(true);
    expect(isUserVulnerable("I feel worthless")).toBe(true);
  });
});
