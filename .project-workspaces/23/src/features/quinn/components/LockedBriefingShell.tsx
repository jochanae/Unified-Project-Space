import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, Sun } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface LockedBriefingShellProps {
  /**
   * Optional real briefing component to render *behind* the blur.
   * Renders honest "ghosted" intel rather than lorem ipsum.
   * If omitted, falls back to a faint placeholder pattern.
   */
  children?: React.ReactNode;
}

/**
 * LockedBriefingShell
 * -------------------
 * The "Strategic Signal: Encrypted" surface for non-Innovation tiers.
 * Wraps the real MorningBriefing under a gold-tinted glass + slow shimmer.
 * Whole card is a hot-spot that opens a side sheet with MarQ's voice.
 */
export function LockedBriefingShell({ children }: LockedBriefingShellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Strategic Signal — Locked. Open upgrade briefing."
        className="group relative w-full overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.35)] bg-card/30 backdrop-blur-xl text-left transition-all hover:border-[hsl(var(--gold)/0.55)] hover:shadow-[0_0_40px_hsl(var(--gold)/0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]"
      >
        {/* Real briefing ghosted underneath */}
        <div className="pointer-events-none select-none p-5 opacity-60 blur-md saturate-50">
          {children ?? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[hsl(var(--gold)/0.15)]" />
                <div className="space-y-1.5">
                  <div className="h-2 w-32 rounded-full bg-foreground/15" />
                  <div className="h-3 w-56 rounded-full bg-foreground/25" />
                </div>
              </div>
              <div className="h-3 w-3/4 rounded-full bg-foreground/15" />
              <div className="h-3 w-2/3 rounded-full bg-foreground/15" />
            </div>
          )}
        </div>

        {/* Gold-tinted glass overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--gold) / 0.08) 0%, hsl(var(--background) / 0.55) 45%, hsl(var(--gold) / 0.05) 100%)',
          }}
        />

        {/* Slow shimmer sweep — every 30s */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-y-0 -left-1/3 w-1/3 animate-encrypted-shimmer"
            style={{
              background:
                'linear-gradient(115deg, transparent 0%, hsl(var(--gold) / 0.18) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* Centered "Encrypted" message */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.1)] text-[hsl(var(--gold))] shadow-[0_0_20px_hsl(var(--gold)/0.2)]">
            <Lock className="h-4 w-4" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--gold))] font-semibold">
            Strategic Signal · Encrypted
          </p>
          <p className="max-w-md text-xs text-foreground/70 leading-relaxed">
            The Innovation Tier receives daily narrative adjustments and
            market-sync briefings. Tap to see today's move.
          </p>
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]">
                <Sun className="h-4 w-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--gold))] font-semibold">
                MarQ Briefing
              </p>
            </div>
            <SheetTitle className="text-2xl font-serif tracking-tight">
              Your daily Strategic Signal is encrypted.
            </SheetTitle>
            <SheetDescription className="text-foreground/75 text-sm leading-relaxed">
              Every morning, the Innovation engine reads the last 24 hours of
              your funnel — traffic deltas, conversion shifts, lead surges,
              silent pages — and delivers a single, decisive move for the day.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--gold))] font-semibold mb-2">
                What unlocks
              </p>
              <ul className="space-y-2 text-sm text-foreground/85">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--gold))]" />
                  <span>24-hour traffic & conversion delta analysis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--gold))]" />
                  <span>Friction, fatigue, and sweet-spot intelligence triggers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--gold))]" />
                  <span>One contextual landing — MarQ pre-loads your refinement mission.</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground italic leading-relaxed">
              "You're already generating signal. The Briefing just makes sure
              you act on the right one before noon." — MarQ
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  navigate('/pricing');
                }}
                className="gap-2"
              >
                Upgrade for full access
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Not yet
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
