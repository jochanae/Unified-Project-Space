import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Prompt regression guard.
 *
 * The Axiom handoff lives in two places inside the chat edge function:
 *   1. <axiom-handoff> block appended to the static system prompt — fires for
 *      every chat call so the AI naturally suggests "Build this in Axiom"
 *      whenever a blueprint is part of its response.
 *   2. AXIOM HANDOFF clause inside the wand-card-request blueprint instruction
 *      — guarantees the suggestion when the wand explicitly forces a card.
 *
 * If either fragment is removed or renamed, the AI silently stops mentioning
 * the Axiom handoff and the BlueprintCard's "Build this in Axiom" button
 * loses its conversational entry point. Catch that here, before deploy.
 */
describe('chat edge function prompt — Axiom handoff', () => {
  const source = readFileSync(
    resolve(__dirname, '../../supabase/functions/chat/index.ts'),
    'utf8',
  );

  it('keeps the <axiom-handoff> block in the static system prompt', () => {
    expect(source).toContain('<axiom-handoff>');
    expect(source).toContain('</axiom-handoff>');
    expect(source).toMatch(/Build this in Axiom/);
  });

  it('keeps the AXIOM HANDOFF clause in the wand blueprint instruction', () => {
    expect(source).toMatch(/AXIOM HANDOFF:/);
    // The clause must still scope itself to build-type blueprints only,
    // never to unrelated conversations (relationship plans, reflection, etc).
    expect(source).toMatch(/never mention Axiom in unrelated conversations/);
  });
});
