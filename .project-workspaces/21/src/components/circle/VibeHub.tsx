import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Palette, X } from 'lucide-react';

interface VibeHubProps {
  onFireflyColorChange: (hue: number) => void;
  onSoundDeckChange: (deckId: string) => void;
  activeSoundDeck: string;
  activeFireflyHue: number;
}

const FIREFLY_PALETTES = [
  { label: 'Gold Rush', hue: 45, color: 'hsl(45 85% 55%)' },
  { label: 'Neon Purple', hue: 280, color: 'hsl(280 70% 60%)' },
  { label: 'Electric Blue', hue: 210, color: 'hsl(210 80% 55%)' },
  { label: 'Hot Pink', hue: 330, color: 'hsl(330 75% 55%)' },
  { label: 'Lime', hue: 120, color: 'hsl(120 65% 50%)' },
  { label: 'Sunset', hue: 25, color: 'hsl(25 90% 55%)' },
];

const MUSIC_OPTIONS = [
  { id: 'lo-fi', label: 'Lo-Fi', emoji: '🎧' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'rain', label: 'Rain', emoji: '🌧️' },
  { id: 'none', label: 'Off', emoji: '🔇' },
];

export default function VibeHub({
  onFireflyColorChange,
  onSoundDeckChange,
  activeSoundDeck,
  activeFireflyHue,
}: VibeHubProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-40">
      {/* Collapsed: glowing orb button */}
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          className="relative flex items-center gap-2 rounded-full px-5 py-3 glass-card border border-border/50 text-sm font-bold text-foreground shadow-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              `0 0 20px 5px hsl(${activeFireflyHue} 60% 50% / 0.2)`,
              `0 0 30px 10px hsl(${activeFireflyHue} 60% 50% / 0.35)`,
              `0 0 20px 5px hsl(${activeFireflyHue} 60% 50% / 0.2)`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-lg">🎛️</span>
          <span>Vibe Hub</span>
        </motion.button>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            className="w-72 rounded-2xl p-4 glass-card border border-border/50 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="text-lg">🎛️</span> Vibe Hub
              </span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Firefly Colors */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Palette className="h-3 w-3" /> Firefly Color
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FIREFLY_PALETTES.map(p => (
                  <button
                    key={p.hue}
                    onClick={() => onFireflyColorChange(p.hue)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                      activeFireflyHue === p.hue
                        ? 'bg-secondary border border-primary/40'
                        : 'hover:bg-secondary/60 border border-transparent'
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-full shadow-lg"
                      style={{
                        background: p.color,
                        boxShadow: `0 0 12px 3px ${p.color}`,
                      }}
                    />
                    <span className="text-[9px] font-medium text-muted-foreground">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Music */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Music className="h-3 w-3" /> Background Music
              </p>
              <div className="flex gap-1.5">
                {MUSIC_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => onSoundDeckChange(m.id)}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                      activeSoundDeck === m.id
                        ? 'bg-accent/15 border border-accent/40 text-accent'
                        : 'bg-secondary/60 border border-transparent text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span className="text-[9px] font-semibold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
