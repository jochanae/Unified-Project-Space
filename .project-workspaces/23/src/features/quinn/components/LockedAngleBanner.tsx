import { Lock, Target } from 'lucide-react';
import type { LockedAngle } from './PreFlightChecklist';

const INTENT_LABEL: Record<LockedAngle['intentMode'], string> = {
  conversion: 'Conversion-first',
  differentiation: 'Differentiation-first',
  premium: 'Premium-first',
};

export function LockedAngleBanner({ locked }: { locked: LockedAngle }) {
  return (
    <div className="glass rounded-xl border border-primary/30 px-4 py-3 flex items-center gap-3 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Lock className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary/80 font-semibold">
          <Target className="h-3 w-3" />
          Locked Angle · {INTENT_LABEL[locked.intentMode]}
        </div>
        <p className="text-sm font-serif truncate">{locked.angle.name}</p>
        <p className="text-xs text-muted-foreground truncate italic">"{locked.angle.hook}"</p>
      </div>
    </div>
  );
}
