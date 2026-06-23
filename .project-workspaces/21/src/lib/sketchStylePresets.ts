/**
 * Sketch style presets — user-facing styles selectable when generating a
 * work visual. Each preset maps to an underlying WorkVisualKind used by the
 * generate-work-image edge function for style-hint selection.
 *
 * The chosen preset is persisted alongside sketch metadata so refinements
 * and reloads preserve the original visual intent.
 */

import type { WorkVisualKind } from '@/hooks/useWorkImage';

export type SketchStylePreset = 'concept' | 'wireframe' | 'moodboard' | 'photoreal';

export const SKETCH_STYLE_PRESETS: SketchStylePreset[] = [
  'concept',
  'wireframe',
  'moodboard',
  'photoreal',
];

export const SKETCH_STYLE_LABEL: Record<SketchStylePreset, string> = {
  concept: 'Concept',
  wireframe: 'Wireframe',
  moodboard: 'Mood board',
  photoreal: 'Photoreal',
};

export const SKETCH_STYLE_HINT: Record<SketchStylePreset, string> = {
  concept: 'Loose hand-drawn whiteboard sketch, dark marker on light background, casual but legible.',
  wireframe: 'Clean low-fidelity UI wireframe, light background, generous whitespace, grayscale blocks.',
  moodboard: 'Editorial mood board collage, balanced composition, cohesive palette, magazine-quality.',
  photoreal: 'Photorealistic product render, studio lighting, crisp materials, clean dark background.',
};

export function presetToVisualKind(preset: SketchStylePreset): WorkVisualKind {
  switch (preset) {
    case 'concept': return 'sketch';
    case 'wireframe': return 'wireframe';
    case 'moodboard': return 'moodboard';
    case 'photoreal': return 'reference';
  }
}

export function visualKindToPreset(kind: WorkVisualKind): SketchStylePreset {
  switch (kind) {
    case 'wireframe': return 'wireframe';
    case 'moodboard': return 'moodboard';
    case 'reference': return 'photoreal';
    case 'mockup': return 'wireframe';
    default: return 'concept';
  }
}

export function isSketchStylePreset(v: unknown): v is SketchStylePreset {
  return typeof v === 'string' && (SKETCH_STYLE_PRESETS as string[]).includes(v);
}
