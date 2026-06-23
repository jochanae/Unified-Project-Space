import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface SanctuaryPulseWidgetProps {
  userId: string;
  onOpenThinkFreely?: () => void;
  embedded?: boolean;
}

export default function SanctuaryPulseWidget({ userId, onOpenThinkFreely, embedded = false }: SanctuaryPulseWidgetProps) {
  const { data: minutes = 0 } = useQuery({
    queryKey: ['sanctuary-minutes', userId],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('usage_tracking')
        .select('sanctuary_minutes')
        .eq('user_id', userId)
        .eq('usage_date', todayStart.toISOString().split('T')[0])
        .maybeSingle();
      return (data as any)?.sanctuary_minutes ?? 0;
    },
    staleTime: 30_000,
  });

  // Ring progress — cap at 30 min for a full ring
  const pct = Math.min(minutes / 30, 1) * 100;
  const circumference = 2 * Math.PI * 15.9155;
  const dashArray = `${(pct / 100) * circumference}, ${circumference}`;

  return (
    <button
      onClick={() => onOpenThinkFreely?.()}
      className={
        embedded
          ? 'w-full flex items-center gap-4 px-4 py-3 text-left active:scale-[0.98] transition-transform'
          : 'w-full flex items-center gap-4 rounded-2xl px-4 py-3 mb-2 bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 text-left active:scale-[0.98] transition-transform animate-fade-in'
      }
      style={embedded ? undefined : {
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 0 0.5px rgba(212,175,80,0.2), 0 0 12px rgba(212,175,80,0.06)',
        animationDelay: '0.06s',
        animationFillMode: 'both',
      }}
    >
      {/* SVG Ring */}
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="18" cy="18" r="15.9155"
            fill="none"
            stroke="hsl(var(--primary) / 0.12)"
            strokeWidth="2.5"
          />
          {/* Progress ring */}
          {minutes > 0 && (
            <motion.circle
              cx="18" cy="18" r="15.9155"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              initial={{ strokeDasharray: `0, ${circumference}` }}
              animate={{ strokeDasharray: dashArray }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary tabular-nums">
            {minutes > 0 ? `${minutes}m` : '—'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary/70 mb-0.5"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          🕊️ Think Freely Time
        </p>
        <p className="text-xs text-white/50 leading-relaxed">
          {minutes > 0
            ? `${minutes} minute${minutes !== 1 ? 's' : ''} in your space today`
            : 'Your private space awaits'}
        </p>
      </div>
    </button>
  );
}
