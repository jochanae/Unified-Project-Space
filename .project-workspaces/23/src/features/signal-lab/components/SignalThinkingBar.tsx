import { cn } from '@/lib/utils';
import { type BarState, useAnalysisPhase } from '../hooks/use-signal-lab';

interface Props {
  barState: BarState;
}

export default function SignalThinkingBar({ barState }: Props) {
  const analysisLabel = useAnalysisPhase(barState === 'analyzing');

  const barText = (() => {
    switch (barState) {
      case 'idle':
        return "Ready when you are. Don't overthink it — just give me the raw vision.";
      case 'typing':
        return "I'm listening...";
      case 'analyzing':
        return analysisLabel;
      case 'complete':
        return 'Signal Found. Let\u2019s see the result.';
    }
  })();

  return (
    <div
      className={cn(
        'relative z-10 w-full border-t transition-all duration-500',
        barState === 'analyzing'
          ? 'border-primary/40 bg-card/80'
          : 'border-border/20 bg-card/40',
        'backdrop-blur-xl',
      )}
    >
      <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-h-[1.5rem]">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full transition-colors duration-500',
              barState === 'idle' && 'bg-primary/50',
              barState === 'typing' && 'bg-primary animate-pulse',
              barState === 'analyzing' && 'bg-primary animate-pulse',
              barState === 'complete' && 'bg-green-400',
            )}
          />
          <p
            key={barText}
            className={cn(
              'text-xs animate-in fade-in-0 duration-300',
              barState === 'analyzing' ? 'text-primary' : 'text-muted-foreground',
            )}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {barText}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground/30 hidden sm:inline">
          From Into Innovations — Intelligence First.
        </span>
      </div>

      {barState === 'analyzing' && (
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}
