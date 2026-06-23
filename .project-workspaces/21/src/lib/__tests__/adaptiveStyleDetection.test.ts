import { describe, it, expect } from 'vitest';
import {
  detectAdaptiveStyle,
  shouldRunAdaptiveDetection,
} from '@/lib/adaptiveStyleDetection';

describe('shouldRunAdaptiveDetection', () => {
  it('triggers every 10 messages', () => {
    expect(shouldRunAdaptiveDetection(0)).toBe(false);
    expect(shouldRunAdaptiveDetection(5)).toBe(false);
    expect(shouldRunAdaptiveDetection(10)).toBe(true);
    expect(shouldRunAdaptiveDetection(20)).toBe(true);
    expect(shouldRunAdaptiveDetection(30)).toBe(true);
    expect(shouldRunAdaptiveDetection(11)).toBe(false);
  });
});

describe('detectAdaptiveStyle', () => {
  it('returns empty for fewer than 5 messages', () => {
    const result = detectAdaptiveStyle(['hey', 'yo', 'sup']);
    expect(result.traits).toEqual({});
    expect(result.memories).toEqual([]);
  });

  it('detects casual register from slang-heavy messages', () => {
    const msgs = [
      'lol bruh that was wild',
      'nah im good tbh',
      'gonna grab food wanna come',
      'yeah for sure dude lmao',
      'yo that vibes are fire',
      'lowkey kinda tired today fr',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.traits['adaptive_register']).toBe('casual');
  });

  it('detects professional register from formal messages', () => {
    const msgs = [
      'Regarding the quarterly report, I have some concerns.',
      'Furthermore, the deliverables need to be aligned with stakeholders.',
      'Please advise on the best course of action moving forward.',
      'I would like to circle back on the synergy discussion.',
      'Accordingly, we should leverage our existing infrastructure.',
      'Per your request, I have optimized the workflow.',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.traits['adaptive_register']).toBe('professional');
  });

  it('detects AAVE-comfortable register', () => {
    const msgs = [
      'finna go to the store real quick',
      'ion even know what happened fr',
      'that food was fye no cap',
      'bouta slide over there fasho',
      'ong that was wild stay woke',
      'tryna figure this out periodt',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.traits['adaptive_cultural_register']).toBe('aave-comfortable');
    expect(result.memories).toContain(
      'User naturally uses AAVE/cultural vernacular — mirror their register comfortably'
    );
  });

  it('detects code-switching when both casual and professional markers present', () => {
    const msgs = [
      'lol yeah that meeting was wild bruh',
      'Furthermore I think we should optimize the deliverables',
      'nah tbh the stakeholders gonna be fine',
      'Please advise on moving forward with the synergy plan',
      'yo honestly the quarterly results look fire',
      'Per your request I updated everything dude',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.memories).toContain(
      'User code-switches between casual and professional registers depending on context'
    );
  });

  it('detects playful humor style', () => {
    const msgs = [
      'haha that was hilarious lol',
      'omg 😂🤣 im dying',
      'jk jk but seriously hehe',
      'lmao not gonna lie that was good',
      'haha you crack me up 😜',
      'just kidding but also kinda serious lol',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.traits['adaptive_humor']).toBe('playful');
  });

  it('detects direct communication preference', () => {
    const msgs = [
      'just tell me straight up what you think',
      'bottom line I need an answer now',
      'real talk I dont want sugarcoating',
      'give it to me straight please',
      'be real with me honestly',
      'no bs just the facts',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.traits['adaptive_directness']).toBe('direct');
    expect(result.memories).toContain(
      'User prefers direct, no-nonsense communication'
    );
  });

  it('detects emotional expressiveness', () => {
    const msgs = [
      'I feel so overwhelmed right now with everything',
      'feeling grateful for the support today honestly',
      'Im excited but also a bit anxious about tomorrow',
      'feeling stressed and worried about the deadline',
      'I felt so proud when that happened to me',
      'honestly feeling hopeful for the first time in a while',
    ];
    const result = detectAdaptiveStyle(msgs);
    expect(result.traits['adaptive_emotional_depth']).toBe('expressive');
  });
});
