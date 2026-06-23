/**
 * visualIntentDetection — scans assistant text for spatial/aesthetic/structural
 * cues that suggest a visual sketch would help the conversation.
 *
 * Surfaces a small "✨ Sketch this" affordance under the bubble.
 * Universal — works for any user. Generation itself is gated upstream.
 */

import type { WorkVisualKind } from '@/hooks/useWorkImage';

interface KindSignal {
  kind: WorkVisualKind;
  pattern: RegExp;
  weight: number;
}

// Strong, deliberate phrases — high false-positive cost, so keep narrow.
const SIGNALS: KindSignal[] = [
  // mockups / UI visuals
  { kind: 'mockup',    pattern: /\b(landing page|dashboard|app screen|ui|interface|hero section|onboarding screen|signup screen|button layout|navigation|nav bar)\b/i, weight: 1.5 },
  { kind: 'mockup',    pattern: /\b(dark[- ]mode|light[- ]mode|frosted glass|glassmorphism|gradient|cinematic|premium look)\b/i, weight: 1.0 },
  // diagrams / flows
  { kind: 'flowchart', pattern: /\b(user flow|funnel|pipeline|step[- ]by[- ]step|sequence|workflow|state machine)\b/i, weight: 1.5 },
  { kind: 'diagram',   pattern: /\b(architecture|diagram|system map|data flow|component tree|relationship)\b/i, weight: 1.5 },
  // charts
  { kind: 'chart',     pattern: /\b(chart|graph|trend line|bar chart|distribution|over time|growth curve)\b/i, weight: 1.5 },
  // sketches / mood
  { kind: 'moodboard', pattern: /\b(aesthetic|vibe|mood|palette|tone|feel of|reference image|inspiration)\b/i, weight: 1.0 },
  { kind: 'sketch',    pattern: /\b(rough sketch|napkin sketch|whiteboard|brainstorm)\b/i, weight: 1.5 },
];

// Generic visualization-invitation phrases — any of these alone triggers offer.
const INVITE_PATTERN = /\b(picture (this|that|it)|imagine (a|the|how)|envision|visualize|see it as|here'?s what (it|that) (would|could) look like|the layout (would|could)|the design (would|could)|looks like|looks a bit like|something like)\b/i;

// Skip if the assistant is asking a question or making a refusal
const SKIP_PATTERN = /\b(can'?t|cannot|unable to|won'?t be able|i'?ll need more|tell me more)\b/i;

export interface VisualIntentResult {
  /** Whether we should show the "Sketch this" affordance under this message */
  shouldOffer: boolean;
  /** Best-guess visual kind based on signals */
  suggestedKind: WorkVisualKind;
  /** Confidence score (0-3+) */
  score: number;
  /** Which signal categories fired (debug/telemetry) */
  hits: string[];
}

export function detectVisualIntent(text: string): VisualIntentResult {
  if (!text || text.length < 20) {
    return { shouldOffer: false, suggestedKind: 'sketch', score: 0, hits: [] };
  }

  if (SKIP_PATTERN.test(text)) {
    return { shouldOffer: false, suggestedKind: 'sketch', score: 0, hits: ['skip'] };
  }

  let score = 0;
  const hits: string[] = [];
  const kindScores = new Map<WorkVisualKind, number>();

  if (INVITE_PATTERN.test(text)) {
    score += 1.5;
    hits.push('invite');
  }

  for (const sig of SIGNALS) {
    if (sig.pattern.test(text)) {
      score += sig.weight;
      hits.push(sig.kind);
      kindScores.set(sig.kind, (kindScores.get(sig.kind) ?? 0) + sig.weight);
    }
  }

  // Pick the highest-scoring kind, default to 'sketch'
  let suggestedKind: WorkVisualKind = 'sketch';
  let best = 0;
  for (const [k, v] of kindScores) {
    if (v > best) { best = v; suggestedKind = k; }
  }

  // Threshold: needs invite phrase OR ≥2.0 in kind signals
  const shouldOffer = score >= 2.0;

  return { shouldOffer, suggestedKind, score, hits };
}
