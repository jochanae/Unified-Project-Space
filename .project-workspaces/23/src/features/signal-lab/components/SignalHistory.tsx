import { History, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedSignal } from '../hooks/use-signal-lab';

interface Props {
  signals: SavedSignal[];
  currentOneLiner: string;
  open: boolean;
  onToggle: () => void;
  onLoad: (signal: SavedSignal) => void;
}

export default function SignalHistory({ signals, currentOneLiner, open, onToggle, onLoad }: Props) {
  if (signals.length <= 1) return null;

  return (
    <div className="pt-6 border-t border-border/10">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <History className="h-4 w-4" />
        My Signals ({signals.length})
        <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {signals.map((signal) => {
            const isActive = currentOneLiner === signal.outputs.oneLiner;
            const date = new Date(signal.created_at);
            const label =
              date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
              ' · ' +
              date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            return (
              <button
                key={signal.id}
                onClick={() => onLoad(signal)}
                className={cn(
                  'w-full text-left rounded-xl border p-4 transition-all',
                  isActive
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/15 bg-card/20 hover:bg-card/40',
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{label}</span>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Active</span>
                  )}
                </div>
                <p className="text-sm text-foreground line-clamp-2">{signal.outputs.oneLiner}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
