import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

/* ─── Mini Firefly Preview ─── */
export function MiniFireflies({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 2 + Math.random() * 2,
            height: 2 + Math.random() * 2,
            background: `hsl(${40 + Math.random() * 20} 80% 70% / 0.5)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, (Math.random() - 0.5) * 40, 0],
            y: [0, (Math.random() - 0.5) * 30, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{ duration: 5 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

/* ─── Soul Orb Mic Test ─── */
export function SoulOrb({ amplitude, active }: { amplitude: number; active: boolean }) {
  const size = 80 + amplitude * 30;
  const glow = 10 + amplitude * 25;
  return (
    <motion.div
      className="relative rounded-full border-2 mx-auto"
      style={{
        width: size,
        height: size,
        borderColor: active ? `hsl(43 72% 53% / ${0.5 + amplitude * 0.5})` : 'hsl(var(--border))',
        boxShadow: active
          ? `0 0 ${glow}px ${glow / 2}px hsl(43 72% 53% / ${0.2 + amplitude * 0.3})`
          : 'none',
        background: `radial-gradient(circle, hsl(225 22% 16%) 0%, hsl(225 25% 10%) 100%)`,
        transition: 'width 0.1s, height 0.1s, box-shadow 0.1s, border-color 0.15s',
      }}
      animate={active ? { scale: [1, 1 + amplitude * 0.05, 1] } : {}}
      transition={{ duration: 0.3, repeat: Infinity }}
    >
      {active && amplitude > 0.2 && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        {active ? (
          <Mic className="h-6 w-6 text-primary" />
        ) : (
          <MicOff className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}

/* ─── Vibe Constants ─── */
export const VIBE_GRADIENTS: Record<string, string> = {
  community: 'linear-gradient(135deg, hsl(220 40% 12%), hsl(200 30% 18%))',
  social: 'linear-gradient(135deg, hsl(280 35% 14%), hsl(320 30% 18%))',
  personal: 'linear-gradient(135deg, hsl(35 40% 12%), hsl(25 35% 16%))',
  kids: 'linear-gradient(135deg, hsl(160 60% 12%), hsl(120 50% 16%))',
};

export const VIBE_LABELS: Record<string, { label: string; emoji: string; fireflies: number }> = {
  community: { label: 'Focused', emoji: '🧘', fireflies: 6 },
  social: { label: 'Energetic', emoji: '⚡', fireflies: 18 },
  personal: { label: 'Calm', emoji: '🌙', fireflies: 8 },
  kids: { label: 'Playful', emoji: '🏁', fireflies: 22 },
};
