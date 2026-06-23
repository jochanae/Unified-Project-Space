/**
 * Encode/decode work-sketch metadata into the chat_messages content string,
 * alongside the existing [IMG:url] tag handled by useChatHistory.
 *
 * Stored format prefix (pipe-separated, single line, then \n + body):
 *   __SKETCH__|<artifactId>|<visualKind>|<title>|<parentArtifactId?>|<encodedPrompt?>|<stylePreset?>
 *
 * All segments after <title> are optional and backward-compatible — older
 * rows missing later segments still decode cleanly.
 */

import type { WorkVisualKind } from '@/hooks/useWorkImage';
import type { SketchStylePreset } from './sketchStylePresets';
import { isSketchStylePreset } from './sketchStylePresets';

export interface WorkSketchMeta {
  artifactId: string;
  visualKind: WorkVisualKind;
  title: string;
  parentArtifactId?: string;
  prompt?: string;
  stylePreset?: SketchStylePreset;
}

const PREFIX = '__SKETCH__|';
const SKETCH_LINE = /^__SKETCH__\|([^|]*)\|([^|]*)\|([^|]*)(?:\|([^|\n]*))?(?:\|([^|\n]*))?(?:\|([^|\n]*))?\n?/;

export function encodeSketchPrefix(meta: WorkSketchMeta, body: string): string {
  const parent = meta.parentArtifactId ?? '';
  const prompt = meta.prompt ? encodeURIComponent(meta.prompt.replace(/\s+/g, ' ').trim().slice(0, 1800)) : '';
  const safeTitle = (meta.title || '').replace(/[|\n]+/g, ' ').trim().slice(0, 120);
  const style = meta.stylePreset ?? '';
  return `${PREFIX}${meta.artifactId}|${meta.visualKind}|${safeTitle}|${parent}|${prompt}|${style}\n${body}`;
}

export function decodeSketchPrefix(content: string): { sketch?: WorkSketchMeta; body: string } {
  if (!content.startsWith(PREFIX)) return { body: content };
  const m = content.match(SKETCH_LINE);
  if (!m) return { body: content };
  const [full, artifactId, visualKind, title, parentArtifactId, encodedPrompt, stylePresetRaw] = m;
  let prompt: string | undefined;
  if (encodedPrompt) {
    try { prompt = decodeURIComponent(encodedPrompt); } catch { prompt = encodedPrompt; }
  }
  const stylePreset = isSketchStylePreset(stylePresetRaw) ? stylePresetRaw : undefined;
  return {
    sketch: {
      artifactId,
      visualKind: (visualKind as WorkVisualKind) || 'sketch',
      title: title || '',
      parentArtifactId: parentArtifactId || undefined,
      prompt,
      stylePreset,
    },
    body: content.slice(full.length),
  };
}
