import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuinnHintProps {
  hintKey: string;
  message: string;
  position?: 'top' | 'bottom';
  delay?: number;
}

const STORAGE_PREFIX = 'quinn_hint_seen_';

export function QuinnContextualHint({ hintKey, message, position = 'top', delay = 1500 }: QuinnHintProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`${STORAGE_PREFIX}${hintKey}`);
    if (seen) {
      setDismissed(true);
      return;
    }

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [hintKey, delay]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(`${STORAGE_PREFIX}${hintKey}`, 'true');
    setTimeout(() => setDismissed(true), 300);
  }, [hintKey]);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none",
        position === 'top' ? "translate-y-2" : "-translate-y-2"
      )}
    >
      <div
        className="relative flex items-start gap-3 rounded-2xl px-4 py-3 max-w-md"
        style={{
          backgroundColor: 'hsl(var(--card) / 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid hsl(var(--primary) / 0.2)',
          boxShadow: '0 8px 32px hsl(var(--background) / 0.5), 0 0 20px hsl(var(--primary) / 0.08)',
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
          <p className="text-sm text-foreground/80 leading-relaxed">
            {message}
          </p>
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

// Pre-configured hints for specific tabs
export function QuinnCRMHint() {
  return (
    <QuinnContextualHint
      hintKey="crm_first_visit"
      message="I'll track your leads here. Once you've published your first funnel, I'll show you the conversion rates."
    />
  );
}

export function QuinnABTestHint() {
  return (
    <QuinnContextualHint
      hintKey="ab_test_first_visit"
      message="Data beats guesswork. Let's run a split test — I'll show Version A to half your visitors and Version B to the rest. We'll let the market decide."
    />
  );
}

export function QuinnAnalyticsHint() {
  return (
    <QuinnContextualHint
      hintKey="analytics_first_visit"
      message="This is your command center. I'll help you interpret the numbers — not just show them."
    />
  );
}
