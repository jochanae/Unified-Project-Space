import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSanctuaryTheme, type SanctuaryAtmosphere } from '@/hooks/useSanctuaryTheme';

/**
 * Sanctuary Atmosphere selector — three immersive theme options.
 * Used in Settings under Circadian Ceremonies.
 */
export default function AtmosphereSelector() {
  const { atmosphere, setAtmosphere, allThemes } = useSanctuaryTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] tracking-[0.12em] uppercase font-medium text-muted-foreground/60">
          Focus Atmosphere
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {allThemes.map((theme) => {
          const isActive = atmosphere === theme.id;
          return (
            <motion.button
              key={theme.id}
              onClick={() => setAtmosphere(theme.id)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-all duration-500 border overflow-hidden',
                isActive
                  ? 'border-primary/40 shadow-[0_0_16px_rgba(212,175,80,0.12)]'
                  : 'border-white/[0.06] hover:border-white/[0.12]'
              )}
            >
              {/* Mini atmosphere preview */}
              <div
                className="absolute inset-0 rounded-2xl opacity-60"
                style={{ background: theme.base }}
              />
              {/* Breathing mesh preview */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ opacity: [0.1, 0.25, 0.1] }}
                transition={{ duration: theme.meshLayers[0]?.duration ?? 8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ background: theme.meshLayers[0]?.gradient }}
              />

              <div className="relative z-10 flex flex-col items-center gap-1">
                <span className="text-lg">{theme.emoji}</span>
                <span className={cn(
                  'text-[11px] font-semibold tracking-wide',
                  isActive ? 'text-primary' : 'text-foreground/60'
                )}>
                  {theme.label}
                </span>
              </div>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="atmosphere-dot"
                  className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/50 italic px-1">
        {allThemes.find(t => t.id === atmosphere)?.description}
      </p>
    </div>
  );
}
