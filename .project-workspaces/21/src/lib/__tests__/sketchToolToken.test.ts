import { describe, expect, it } from 'vitest';
import { decodeSketchPrefix, encodeSketchPrefix } from '@/lib/sketchEncoding';
import { extractSketchToolCall, stripSketchToolCallForDisplay } from '@/lib/sketchToolToken';

describe('sketch tool tokens', () => {
  it('extracts the canonical SKETCH token and hides it from display', () => {
    const raw = 'On it.\n\n[SKETCH: draw a clean routing diagram]';

    expect(stripSketchToolCallForDisplay(raw)).toBe('On it.');
    expect(extractSketchToolCall(raw)).toEqual({
      cleanText: 'On it.',
      prompt: 'draw a clean routing diagram',
      source: 'SKETCH',
    });
  });

  it('supports legacy IMAGE_GEN tokens from older prompts', () => {
    const raw = 'Generating now.\n\n[IMAGE_GEN: photorealistic obsidian quantum-link device]';

    expect(extractSketchToolCall(raw)).toEqual({
      cleanText: 'Generating now.',
      prompt: 'photorealistic obsidian quantum-link device',
      source: 'IMAGE_GEN',
    });
  });

  it('round-trips prompt metadata for refinement history', () => {
    const encoded = encodeSketchPrefix(
      { artifactId: 'a1', visualKind: 'reference', title: 'Quantum link', parentArtifactId: 'p1', prompt: 'obsidian body | amber sphere' },
      'Quantum link [IMG:https://example.com/image.png]',
    );

    const decoded = decodeSketchPrefix(encoded);
    expect(decoded.sketch?.prompt).toBe('obsidian body | amber sphere');
    expect(decoded.sketch?.parentArtifactId).toBe('p1');
    expect(decoded.body).toContain('[IMG:https://example.com/image.png]');
  });

  it('round-trips the chosen style preset', () => {
    const encoded = encodeSketchPrefix(
      {
        artifactId: 'a2',
        visualKind: 'reference',
        title: 'Product render',
        prompt: 'obsidian device',
        stylePreset: 'photoreal',
      },
      'Product render [IMG:https://example.com/p.png]',
    );

    const decoded = decodeSketchPrefix(encoded);
    expect(decoded.sketch?.stylePreset).toBe('photoreal');
    expect(decoded.sketch?.visualKind).toBe('reference');
  });

  it('decodes legacy rows that omit the style preset segment', () => {
    const legacy = '__SKETCH__|a3|sketch|Legacy||\nLegacy body';
    const decoded = decodeSketchPrefix(legacy);
    expect(decoded.sketch?.stylePreset).toBeUndefined();
    expect(decoded.body).toBe('Legacy body');
  });
});