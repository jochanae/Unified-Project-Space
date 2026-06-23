import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuinnUpgradeNudgeProps {
  nudgeKey: string;
  message: string;
  ctaLabel: string;
  tier: 'operator' | 'growth';
  delay?: number;
}

const STORAGE_PREFIX = 'quinn_nudge_seen_';

export function QuinnUpgradeNudge({ nudgeKey, message, ctaLabel, tier, delay = 2000 }: QuinnUpgradeNudgeProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`${STORAGE_PREFIX}${nudgeKey}`);
    if (seen) {
      setDismissed(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [nudgeKey, delay]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(`${STORAGE_PREFIX}${nudgeKey}`, 'true');
    setTimeout(() => setDismissed(true), 300);
  }, [nudgeKey]);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2',
      )}
    >
      <div
        className="relative flex items-start gap-3 rounded-2xl px-4 py-3.5 max-w-md"
        style={{
          backgroundColor: 'hsl(var(--card) / 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid hsl(var(--primary) / 0.25)',
          boxShadow: '0 8px 32px hsl(var(--background) / 0.5), 0 0 24px hsl(var(--primary) / 0.1)',
        }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5"
          style={{
            background: 'hsl(var(--primary) / 0.1)',
            border: '1px solid hsl(var(--primary) / 0.25)',
          }}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary/80 mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
            MarQ
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed mb-2">
            {message}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate('/pricing')}
          >
            {ctaLabel} <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        <button
          onClick={dismiss}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Pre-configured nudges with "Tactical Grace" language ──

/** After Signal sharpening — the "Moment of Clarity" nudge to Identity */
export function QuinnIdentityNudge() {
  return (
    <QuinnUpgradeNudge
      nudgeKey="identity_funnel_generic"
      message="This signal is sharp — it's actually quite brilliant. But right now, it's just words. Are you ready to give it a soul and lock in the visual DNA that matches this level of clarity?"
      ctaLabel="Lock Identity"
      tier="operator"
    />
  );
}

/** Style Signal locked preview — nudge to Identity */
export function QuinnStyleSignalNudge() {
  return (
    <QuinnUpgradeNudge
      nudgeKey="identity_style_signal"
      message="Your messaging is strong — but it could belong to any creator in your space. The Identity Lock translates your unique vibe into the visual DNA for your entire business engine."
      ctaLabel="Unlock Identity"
      tier="operator"
    />
  );
}

/** After first hooks generated — nudge to build funnel (Identity gate) */
export function QuinnHooksToFunnelNudge() {
  return (
    <QuinnUpgradeNudge
      nudgeKey="identity_hooks_funnel"
      message="These hooks will stop the scroll — but where are you sending them? Let's build the pipes so this traffic has a place to land."
      ctaLabel="Build Your Funnel"
      tier="operator"
      delay={3000}
    />
  );
}

/** After funnel publish — nudge to Innovation for analytics */
export function QuinnAnalyticsUpgradeNudge() {
  return (
    <QuinnUpgradeNudge
      nudgeKey="innovation_analytics"
      message="This funnel is live — but we're flying blind without deeper intelligence. Unlock Strategic Briefings to see exactly where the leaks are and what's actually driving results."
      ctaLabel="Unlock Mission Control"
      tier="growth"
    />
  );
}

/** Multi-funnel or A/B — nudge to Innovation */
export function QuinnInnovationNudge() {
  return (
    <QuinnUpgradeNudge
      nudgeKey="innovation_scale"
      message="Your funnel is performing — but there are high-impact improvements you're not testing yet. The Innovation tier lets MarQ run experiments and find your most profitable identity."
      ctaLabel="Scale Up"
      tier="growth"
    />
  );
}

/** Insights tab for free users — "Blind Spot" warning */
export function QuinnInsightsNudge() {
  return (
    <QuinnUpgradeNudge
      nudgeKey="innovation_insights_blind"
      message="I'm monitoring your signal, but the high-resolution intelligence is currently locked. I can see there is movement — but I cannot yet tell you where your leaks are occurring."
      ctaLabel="Unlock Strategic Briefings"
      tier="growth"
      delay={1500}
    />
  );
}
