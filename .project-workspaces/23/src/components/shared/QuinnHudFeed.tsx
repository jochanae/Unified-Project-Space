import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, X, Minus } from 'lucide-react';

/**
 * QuinnHudFeed
 * ------------
 * Fixed bottom-right terminal that streams MarQ's "real-time thoughts"
 * about the current dashboard context. Messages are derived from the props
 * passed by the host page (active project, lead count, signal hook) so the
 * feed feels alive without any backend polling.
 *
 * Behavior: dashboard-only, dismissible per session (sessionStorage).
 */

interface Props {
  projectName?: string | null;
  leadCount?: number;
  hook?: string | null;
  hasArchitecture?: boolean;
}

const SESSION_KEY = 'intoiq_hud_dismissed';

function buildLines({ projectName, leadCount, hook, hasArchitecture }: Props): string[] {
  const project = projectName || 'your active project';
  const lines: string[] = [
    `[SYSTEM] Cockpit online. Linking to ${project}.`,
  ];
  if (hook) {
    lines.push(`[MarQ] Identity Lock hook in rotation: "${truncate(hook, 48)}".`);
  } else {
    lines.push(`[MarQ] No Identity Lock yet — open Signal Lab to define one.`);
  }
  if (hasArchitecture) {
    lines.push(`[MarQ] System architecture verified: Signal → Studio → Hub.`);
  }
  if ((leadCount ?? 0) > 0) {
    lines.push(`[MarQ] Tracking ${leadCount} signal${leadCount === 1 ? '' : 's'} in the Lead Hub.`);
  } else {
    lines.push(`[MarQ] Awaiting first lead — deploy a page to start the feed.`);
  }
  lines.push(`[SYSTEM] Watching for strategy drift. Standing by.`);
  return lines;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

export function QuinnHudFeed(props: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(0);
  const lines = useMemo(() => buildLines(props), [props]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisible(0);
    if (!lines.length) return;
    const id = setInterval(() => {
      setVisible((v) => (v >= lines.length ? lines.length : v + 1));
    }, 700);
    return () => clearInterval(id);
  }, [lines]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visible]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  };

  return (
    <div
      className="fixed bottom-24 right-3 sm:bottom-28 sm:right-6 z-40 w-[300px] sm:w-[340px] rounded-2xl border border-primary/20 bg-background/85 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
      role="status"
      aria-label="MarQ HUD feed"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <Activity className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[10px] uppercase tracking-widest text-primary font-bold truncate">
            MarQ_HUD_Feed
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={minimized ? 'Expand HUD' : 'Minimize HUD'}
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss HUD"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div
          ref={containerRef}
          className="px-3 py-2.5 max-h-[160px] overflow-y-auto font-mono text-[10.5px] leading-snug space-y-1.5 text-muted-foreground/80"
        >
          {lines.slice(0, visible).map((line, idx) => {
            const isQuinn = line.startsWith('[MarQ]');
            return (
              <p
                key={`${idx}-${line}`}
                className={`animate-in fade-in slide-in-from-left-1 duration-300 ${
                  isQuinn ? 'text-foreground/90' : 'text-primary/70'
                }`}
              >
                {line}
              </p>
            );
          })}
          {visible >= lines.length && (
            <p className="text-primary/60">[SYSTEM] _</p>
          )}
        </div>
      )}
    </div>
  );
}
