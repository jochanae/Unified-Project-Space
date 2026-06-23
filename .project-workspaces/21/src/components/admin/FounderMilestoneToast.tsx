/**
 * FounderMilestoneToast — Premium gold glassmorphism notification
 * that slides in when a new tester joins the First 100.
 * Uses Supabase Realtime for instant detection (no polling).
 */
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MilestoneData {
  count: number;
  testerName: string;
}

function playGoldChime() {
  try {
    const ctx = new AudioContext();
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5 → C6 ascending

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.15 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 1.5);
    });

    // Haptic: low-frequency hum
    navigator.vibrate?.([30, 40, 20, 40, 30, 60, 40]);
  } catch { /* audio context may fail silently */ }
}

export default function FounderMilestoneToast() {
  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [visible, setVisible] = useState(false);
  const baseCountRef = useRef<number>(0);

  useEffect(() => {
    // Get initial count
    const init = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });
      baseCountRef.current = count || 0;
    };
    init();

    // Subscribe to realtime INSERT on profiles
    const channel = supabase
      .channel('founder-milestone')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        async (payload) => {
          baseCountRef.current += 1;
          const currentCount = baseCountRef.current;

          if (currentCount <= 100) {
            const newUser = payload.new as { user_name?: string };
            setMilestone({
              count: currentCount,
              testerName: newUser.user_name || 'New Explorer',
            });
            setVisible(true);
            playGoldChime();
            setTimeout(() => setVisible(false), 8000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && milestone && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, duration: 1.2 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md"
        >
          <div className="relative rounded-2xl border border-primary/20 bg-[hsl(var(--card))]/95 backdrop-blur-2xl p-5 shadow-[0_8px_40px_hsl(var(--primary)/0.15)]">
            {/* Gold glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

            <button
              onClick={() => setVisible(false)}
              className="absolute top-3 right-3 text-muted-foreground/40 hover:text-foreground transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 flex items-start gap-4">
              {/* Shield counter */}
              <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex flex-col items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                <Shield className="h-4 w-4 text-primary mb-0.5" />
                <span className="text-[9px] font-mono text-primary font-bold tabular-nums">
                  {milestone.count}/100
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[8px] uppercase tracking-[0.4em] text-primary/60 font-medium mb-1">
                  New Space Inscribed
                </p>
                <p className="text-sm text-foreground font-light leading-relaxed">
                  <span className="text-primary font-medium">{milestone.testerName}</span>{' '}
                  has entered the architecture.
                </p>
                <p className="text-[9px] text-muted-foreground/40 mt-2 font-mono tabular-nums">
                  Founding Member #{String(milestone.count).padStart(3, '0')}
                </p>
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="relative mt-4 h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: `${((milestone.count - 1) / 100) * 100}%` }}
                animate={{ width: `${(milestone.count / 100) * 100}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-foreground/60 shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
