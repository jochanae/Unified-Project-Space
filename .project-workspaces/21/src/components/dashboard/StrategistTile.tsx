/**
 * StrategistTile — Dashboard entry point to the Wealth & Legacy
 * blueprint tier. Visible to all users; gated on tap.
 *
 * Premium / Genesis tap → /blueprints (their drafted plans + access
 * to the Wealth & Legacy templates from chat).
 *
 * Free user tap → upgrade route. The lock becomes part of the
 * aspiration — signals authority on the dashboard.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useFoundingMemberStatus } from '@/hooks/useFoundingMemberStatus';
import { markDashboardMode } from '@/hooks/useDashboardMode';

interface StrategistTileProps {
  subscribed: boolean;
  /** Where free users go to upgrade (defaults to /settings) */
  upgradeRoute?: string;
}

export default function StrategistTile({
  subscribed,
  upgradeRoute = '/settings',
}: StrategistTileProps) {
  const navigate = useNavigate();
  const { tier } = useFoundingMemberStatus();
  const isGenesis = tier === 'genesis';
  const unlocked = subscribed || isGenesis;

  const handleTap = () => {
    // Mark strategic mode so the Intent Ribbon can layer the mode-aware
    // secondary phrase ("Strategic Momentum", etc.) even after the user
    // returns to /my-world.
    markDashboardMode('strategic');
    if (unlocked) {
      navigate('/blueprints');
    } else {
      navigate(upgradeRoute);
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleTap}
      className="relative w-full overflow-hidden rounded-3xl border-[0.5px] border-primary/25 bg-[hsl(230_20%_6%/0.85)] backdrop-blur-xl px-5 py-4 text-left transition-all active:scale-[0.99] hover:border-primary/40"
      style={{
        boxShadow:
          'inset 0 1px 1px hsl(var(--primary) / 0.06), 0 0 0 1px hsl(var(--primary) / 0.18), 0 0 24px hsl(var(--primary) / 0.08)',
      }}
    >
      {/* Ambient gold glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 85% 50%, hsl(var(--primary) / 0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.04))',
          }}
        >
          <span className="text-base">🗝️</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{
                color: 'hsl(var(--primary))',
                textShadow: '0 0 12px hsl(var(--primary) / 0.25)',
              }}
            >
              Strategist
            </p>
            {!unlocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.06] px-1.5 py-0.5 text-[8.5px] font-medium uppercase tracking-wider text-primary/80">
                <Lock className="h-2 w-2" /> Premium
              </span>
            )}
            {isGenesis && (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/[0.08] px-1.5 py-0.5 text-[8.5px] font-medium uppercase tracking-wider text-primary/85">
                Genesis
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] font-medium text-foreground/90 leading-snug">
            High-stakes plans, wealth & legacy
          </p>
          <p className="mt-0.5 text-[11px] text-foreground/45 leading-relaxed">
            {unlocked
              ? 'Open your strategic blueprints'
              : 'Unlock the consultant tier — portfolio, equity, legacy'}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
