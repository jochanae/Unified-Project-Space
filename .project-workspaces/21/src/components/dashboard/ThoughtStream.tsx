/**
 * ThoughtStream — "Razor-Gold Horizon" ambient line behind the hero avatar.
 *
 * Design spec:
 *  - 1px core ("glass-cutter" precision) — never thicker
 *  - Tight vertical glow, wide horizontal bloom
 *  - 4s cinematic "glint" sweep (cubic-bezier, not linear)
 *  - Circadian palette: Gold (day), Amber (morning), Indigo (night)
 *  - Base opacity 60%; only the travelling glint reaches 100%
 *
 * States:
 *  - idle: dim horizon with slow glint
 *  - processing: brighter with faster glint + task tooltip on tap
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNightMode } from '@/hooks/useNightMode';

interface ThoughtStreamProps {
  userId?: string;
  companionName?: string;
}

type StreamState = 'idle' | 'processing';

/* ── Circadian palette ── */
const PALETTE = {
  day: {
    core: 'hsl(43 74% 49%)',        // #D4AF37 metallic gold
    glow: 'rgba(212, 175, 55, 0.35)',
    glowTight: 'rgba(212, 175, 55, 0.6)',
    glint: 'hsl(48 100% 88%)',       // #FFF5D6 bright highlight
  },
  morning: {
    core: 'hsl(30 70% 55%)',
    glow: 'rgba(200, 150, 60, 0.3)',
    glowTight: 'rgba(200, 150, 60, 0.5)',
    glint: 'hsl(35 100% 85%)',
  },
  night: {
    core: 'hsl(230 76% 72%)',        // #818CF8 soft indigo
    glow: 'rgba(129, 140, 248, 0.25)', // less bloom — blue looks sharper
    glowTight: 'rgba(129, 140, 248, 0.45)',
    glint: 'hsl(230 100% 90%)',
  },
} as const;

export default function ThoughtStream({ userId, companionName }: ThoughtStreamProps) {
  const [state, setState] = useState<StreamState>('idle');
  const [taskLabel, setTaskLabel] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const phase = useNightMode();

  const colors = PALETTE[phase];
  const isActive = state === 'processing';

  // ── Monitor background activity ──
  useEffect(() => {
    if (!userId) return;

    const checkActivity = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const [vaultResult, travelResult] = await Promise.all([
        supabase
          .from('knowledge_documents' as any)
          .select('title, updated_at')
          .eq('user_id', userId)
          .gte('updated_at', fiveMinAgo)
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase
          .from('travel_log')
          .select('city_name, visited_at')
          .eq('user_id', userId)
          .gte('visited_at', fiveMinAgo)
          .order('visited_at', { ascending: false })
          .limit(1),
      ]);

      const recentVault = (vaultResult.data as any[])?.[0];
      const recentTravel = travelResult.data?.[0];

      if (recentVault) {
        setState('processing');
        setTaskLabel(`Analyzing: ${recentVault.title}`);
      } else if (recentTravel) {
        setState('processing');
        setTaskLabel(`Inscribing: ${recentTravel.city_name}`);
      } else {
        setState('idle');
        setTaskLabel('');
      }
    };

    checkActivity();
    const interval = setInterval(checkActivity, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleTap = useCallback(() => {
    if (isActive && taskLabel) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
    }
  }, [isActive, taskLabel]);

  // Glint speed: processing=2.5s, day idle=4s, morning=5s, night=6s
  const glintDuration = isActive ? 2.5 : phase === 'night' ? 6 : phase === 'morning' ? 5 : 4;
  const glintDelay = isActive ? 1.5 : phase === 'night' ? 3 : 1.5;

  return (
    <div className="relative w-[90%] mx-auto mt-3" onClick={handleTap}>
      {/* ── 1px Razor Core with integrated glint shimmer ── */}
      <div
        className="relative w-full h-px rounded-full"
        style={{
          background: `linear-gradient(90deg, rgba(${phase === 'night' ? '129,140,248' : '212,175,55'}, 0) 0%, rgba(${phase === 'night' ? '129,140,248' : '212,175,55'}, 0.8) 45%, ${colors.glint} 50%, rgba(${phase === 'night' ? '129,140,248' : '212,175,55'}, 0.8) 55%, rgba(${phase === 'night' ? '129,140,248' : '212,175,55'}, 0) 100%)`,
          backgroundSize: '200% 100%',
          animation: `horizonShimmer ${glintDuration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          boxShadow: `0 0 10px 0px ${colors.glow}`,
        }}
      />

      {/* ── Tap tooltip ── */}
      <AnimatePresence>
        {showTooltip && taskLabel && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
          >
            <span
              className="text-[10px] font-medium text-primary/80 tracking-wide"
              style={{ textShadow: '0 0 8px hsla(var(--primary) / 0.3)' }}
            >
              {taskLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
