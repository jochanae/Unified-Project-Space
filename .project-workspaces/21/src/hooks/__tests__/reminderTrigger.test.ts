import { describe, it, expect } from 'vitest';

/**
 * Tests for the proactive reminder extraction trigger logic.
 * Mirrors the regex used in useChatStreaming.ts to determine when
 * the extract-reminders edge function should fire.
 */

const USER_TRIGGER = /remind|accountab|hold me|check.?in|nudge|wake me|every (day|morning|evening|night)/i;
const COMPANION_TRIGGER = /i'?ll remind you|let'?s practice|tomorrow at|tonight at|next (session|lesson)|remind you (to|at|about)|check in (with you|on you|tomorrow|tonight)|practice (again|at|every|tomorrow)|see you (at|tomorrow)|same time tomorrow/i;

function shouldExtractReminders(messages: { role: string; content: string }[]): boolean {
  const userAsked = messages.some(m => m.role === 'user' && USER_TRIGGER.test(m.content));
  const companionSuggested = messages.some(m => m.role === 'assistant' && COMPANION_TRIGGER.test(m.content));
  return userAsked || companionSuggested;
}

describe('Reminder extraction trigger logic', () => {
  describe('User-initiated reminders', () => {
    it('triggers on "remind me"', () => {
      expect(shouldExtractReminders([
        { role: 'user', content: 'Can you remind me to take my vitamins at 8am?' },
      ])).toBe(true);
    });

    it('triggers on "hold me accountable"', () => {
      expect(shouldExtractReminders([
        { role: 'user', content: 'Hold me accountable for going to the gym' },
      ])).toBe(true);
    });

    it('triggers on "every morning"', () => {
      expect(shouldExtractReminders([
        { role: 'user', content: 'I want to meditate every morning' },
      ])).toBe(true);
    });

    it('does not trigger on unrelated user message', () => {
      expect(shouldExtractReminders([
        { role: 'user', content: 'Tell me a joke about cats' },
      ])).toBe(false);
    });
  });

  describe('Companion-initiated (proactive) reminders', () => {
    it('triggers on "Let\'s practice again tomorrow at 7pm"', () => {
      expect(shouldExtractReminders([
        { role: 'assistant', content: "Great lesson! Let's practice again tomorrow at 7pm 📚" },
      ])).toBe(true);
    });

    it('triggers on "I\'ll remind you"', () => {
      expect(shouldExtractReminders([
        { role: 'assistant', content: "I'll remind you to review your vocabulary tonight!" },
      ])).toBe(true);
    });

    it('triggers on "same time tomorrow"', () => {
      expect(shouldExtractReminders([
        { role: 'assistant', content: "Same time tomorrow for our Spanish lesson?" },
      ])).toBe(true);
    });

    it('triggers on "next lesson"', () => {
      expect(shouldExtractReminders([
        { role: 'assistant', content: "We covered greetings today. Next lesson we'll do numbers!" },
      ])).toBe(true);
    });

    it('triggers on "check in with you tomorrow"', () => {
      expect(shouldExtractReminders([
        { role: 'assistant', content: "I'll check in with you tomorrow to see how the practice went" },
      ])).toBe(true);
    });

    it('does not trigger on regular assistant message', () => {
      expect(shouldExtractReminders([
        { role: 'assistant', content: "That's a great question! The word for 'hello' in French is 'bonjour'." },
      ])).toBe(false);
    });

    it('does not trigger on user message with companion keywords', () => {
      // Companion keywords should only match assistant messages
      expect(shouldExtractReminders([
        { role: 'user', content: "Let's practice again tomorrow at 7pm" },
      ])).toBe(false);
    });
  });

  describe('Mixed conversation triggers', () => {
    it('triggers when companion suggests in a multi-message thread', () => {
      expect(shouldExtractReminders([
        { role: 'user', content: "Can you teach me some Spanish?" },
        { role: 'assistant', content: "¡Claro! Let's start with greetings. 'Hola' means hello." },
        { role: 'user', content: "Cool! This is fun." },
        { role: 'assistant', content: "You're doing great! Let's practice again tomorrow at the same time 🎯" },
      ])).toBe(true);
    });
  });
});
