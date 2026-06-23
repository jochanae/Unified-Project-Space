import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/features/billing/hooks/use-subscription';

const STORAGE_KEY = 'intoiq_plan_tour_dismissed';

/**
 * One-time post-onboarding nudge that orients new free-tier users to
 * what they have today and what unlocks at the next tier. Dismisses
 * permanently after first close.
 */
export function PlanTourNudge() {
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  // Only show to free-tier users who haven't dismissed
  if (dismissed || tier !== 'free') return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* noop */ }
  };

  const goPricing = () => {
    dismiss();
    navigate('/pricing');
  };

  return (
    <div className="glass relative rounded-2xl border border-primary/30 p-4 sm:p-5 shadow-[0_0_24px_hsl(var(--primary)/0.12)]">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-medium">
            You're on Signal · Free
          </div>
          <h3 className="mt-1 text-sm font-semibold text-foreground">
            Here's what you've got — and what unlocks next
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/30 bg-muted/10 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                Active now
              </div>
              <ul className="space-y-1 text-xs text-foreground/80">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary shrink-0" /> MarQ AI co-pilot</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary shrink-0" /> Signal Lab + Funnel maps</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary shrink-0" /> Logo Generator</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-primary/80 mb-1">
                Unlocks at Operator
              </div>
              <ul className="space-y-1 text-xs text-foreground/80">
                <li className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> Publish landing pages</li>
                <li className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> Lead capture + CRM</li>
                <li className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> Email sequences + analytics</li>
              </ul>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={goPricing} className="gap-1.5 h-8 text-xs">
              See plans <ArrowRight className="h-3 w-3" />
            </Button>
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors px-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
