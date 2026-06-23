import { Sparkles } from 'lucide-react';
import type { WaterfallStep } from './FunnelWaterfall';

interface Props {
  steps: WaterfallStep[];
}

/**
 * MarQ-narrated insight for a single funnel.
 * Picks the worst leak, the best segment, and an end-to-end conversion call.
 */
export function FunnelInsight({ steps }: Props) {
  if (!steps || steps.length < 2) return null;

  // Find biggest leak between consecutive steps
  let worstLeakIdx = -1;
  let worstLeakPct = 0;
  let worstLeakAbs = 0;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].views;
    if (!prev) continue;
    const dropPct = (1 - steps[i].views / prev) * 100;
    if (dropPct > worstLeakPct) {
      worstLeakPct = dropPct;
      worstLeakIdx = i;
      worstLeakAbs = prev - steps[i].views;
    }
  }

  const start = steps[0].views;
  const end = steps[steps.length - 1].views;
  const overallCvr = start > 0 ? (end / start) * 100 : 0;

  if (start === 0) return null;

  const lines: string[] = [];

  if (worstLeakIdx > 0 && worstLeakPct >= 30) {
    const fromStep = steps[worstLeakIdx - 1];
    const toStep = steps[worstLeakIdx];
    const verdict =
      worstLeakPct >= 70 ? 'critical leak' : worstLeakPct >= 50 ? 'major leak' : 'meaningful drop';
    const fix =
      toStep.step_type === 'checkout' || /pay|buy|order/i.test(toStep.title)
        ? 'Test removing form fields, adding social proof above the fold, or offering a guarantee.'
        : toStep.step_type === 'thank_you'
        ? 'Most flows lose people here naturally. Confirm the previous CTA is unmistakable.'
        : 'Sharpen the headline, shorten the page, or strengthen the next-step CTA.';
    lines.push(
      `${verdict.charAt(0).toUpperCase() + verdict.slice(1)} between "${fromStep.title}" and "${toStep.title}" — ${worstLeakAbs.toLocaleString()} dropped (${worstLeakPct.toFixed(0)}%). ${fix}`,
    );
  } else if (worstLeakPct > 0) {
    lines.push(`Flow looks healthy — biggest drop is only ${worstLeakPct.toFixed(0)}% between "${steps[worstLeakIdx - 1]?.title}" and "${steps[worstLeakIdx]?.title}".`);
  }

  if (overallCvr >= 8) {
    lines.push(`End-to-end conversion is ${overallCvr.toFixed(1)}% — Gold Pulse territory. Scale traffic.`);
  } else if (overallCvr >= 3) {
    lines.push(`End-to-end conversion is ${overallCvr.toFixed(1)}% — solid. One leak fix could push you past 8%.`);
  } else if (overallCvr > 0) {
    lines.push(`End-to-end conversion is ${overallCvr.toFixed(1)}% — below benchmark. Fix the worst leak first, then iterate.`);
  }

  if (!lines.length) return null;

  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-3">
      <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70 font-medium">MarQ read</p>
        {lines.map((l, i) => (
          <p key={i} className="text-xs text-foreground/85 leading-relaxed">{l}</p>
        ))}
      </div>
    </div>
  );
}
