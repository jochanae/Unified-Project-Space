import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';

interface AggRow {
  result_key: string;
  result_label: string;
  count: number;
}

const INTENT_LABELS: Record<string, string> = {
  decisions: 'Clarity & Decisions',
  talk: 'Feeling Heard',
  growth: 'Growth & Accountability',
  connection: 'Deep Connection',
  fun: 'Lightness & Energy',
};

const MODE_DISPLAY: Record<string, string> = {
  mentor: 'Stoic',
  friend: 'Empathetic',
  accountability: 'Analytical',
  romantic: 'Intimate',
};

export default function BlueprintAnalyticsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-blueprint-analytics'],
    queryFn: async () => {
      // Aggregate onboarding blueprints
      const { data: rows } = await supabase
        .from('discovery_results')
        .select('result_key, result_label')
        .eq('topic', 'onboarding');

      if (!rows?.length) return { total: 0, byIntent: [] as AggRow[], dominantMode: null as string | null };

      const intentMap = new Map<string, number>();
      const modeMap = new Map<string, number>();

      for (const r of rows) {
        intentMap.set(r.result_key, (intentMap.get(r.result_key) || 0) + 1);
        modeMap.set(r.result_label, (modeMap.get(r.result_label) || 0) + 1);
      }

      const byIntent = Array.from(intentMap.entries())
        .map(([key, count]) => ({ result_key: key, result_label: '', count }))
        .sort((a, b) => b.count - a.count);

      let dominantMode: string | null = null;
      let maxMode = 0;
      for (const [mode, cnt] of modeMap) {
        if (cnt > maxMode) { maxMode = cnt; dominantMode = mode; }
      }

      return { total: rows.length, byIntent, dominantMode };
    },
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 animate-pulse h-48" />
    );
  }

  const { total, byIntent, dominantMode } = data;
  const dominantLabel = dominantMode ? (MODE_DISPLAY[dominantMode] || dominantMode) : '—';
  const topPercent = total > 0 && byIntent[0] ? Math.round((byIntent[0].count / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-2xl border border-white/[0.06] p-6 sm:p-8 backdrop-blur-2xl overflow-hidden group"
      style={{
        background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.02), hsl(0 0% 100% / 0.01))',
      }}
    >
      {/* Ambient gold glow behind dominant stat */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 opacity-30 group-hover:opacity-60"
        style={{ background: 'hsl(43 74% 49% / 0.15)' }}
      />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <h3 className="text-[10px] uppercase tracking-[0.4em] font-medium flex items-center gap-2"
          style={{ color: 'hsl(43 74% 49% / 0.7)' }}>
          <Compass className="h-3.5 w-3.5" />
          Fleet Identity Mapping
        </h3>
        <span className="text-[10px] text-muted-foreground/40">
          {total} Inscribed
        </span>
      </div>

      {total === 0 ? (
        <p className="relative z-10 text-sm text-muted-foreground/40 italic py-6 text-center">
          No Blueprints inscribed yet — awaiting tester calibrations
        </p>
      ) : (
        <div className="relative z-10 space-y-6">
          {/* Dominant Vibe */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-extralight text-foreground italic tracking-tight">
                "{dominantLabel}"
              </p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30 mt-1">
                Primary Fleet Vibe
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-light" style={{ color: 'hsl(43 74% 49%)' }}>
                {topPercent}%
              </p>
              <div className="w-24 h-[2px] bg-white/[0.08] mt-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${topPercent}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: 'hsl(43 74% 49%)',
                    boxShadow: '0 0 10px hsl(43 74% 49% / 0.5)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Intent Breakdown */}
          <div className="pt-4 border-t border-white/[0.05] space-y-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-3">
              Intent Distribution
            </p>
            {byIntent.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.result_key} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground/50 w-32 truncate">
                    {INTENT_LABELS[item.result_key] || item.result_key}
                  </span>
                  <div className="flex-1 h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, hsl(43 74% 49% / 0.6), hsl(43 74% 49%))',
                        boxShadow: '0 0 6px hsl(43 74% 49% / 0.3)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums w-8 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Inscribed count summary */}
          <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/30 text-center pt-2">
            {total < 100
              ? `${100 - total} calibrations remaining for full fleet sync`
              : '✦ Full Fleet Calibration Complete ✦'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
