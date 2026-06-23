import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Play, Pause, ChevronDown } from 'lucide-react';
import { useSoundscapeSafe } from '@/contexts/SoundscapeContext';
import type { SoundDeckId } from '@/hooks/useAmbientSoundscape';
import { cn } from '@/lib/utils';

const DECKS: { id: SoundDeckId; emoji: string; label: string }[] = [
  { id: 'brown', emoji: '🌿', label: 'Brown Noise' },
  { id: 'rain', emoji: '🌧️', label: 'Soft Rain' },
  { id: 'synth', emoji: '🌌', label: 'Synth Pads' },
  { id: 'lofi', emoji: '🎧', label: 'Lo-Fi' },
  { id: 'none', emoji: '🔇', label: 'Silent' },
];

export default function SoundscapeMiniPlayer() {
  const soundscape = useSoundscapeSafe();
  const [expanded, setExpanded] = useState(false);

  if (!soundscape) return null;

  const { activeDeck, switchDeck, volume, setVolume, isPlaying } = soundscape;
  const activeDeckMeta = DECKS.find(d => d.id === activeDeck) || DECKS[4];

  return (
    <div className="fixed bottom-28 right-3 z-50">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="mb-3 w-56"
          >
            {/* Outer glow */}
            <div className="relative group">
              <div
                className={cn(
                  'absolute -inset-0.5 rounded-2xl blur transition-opacity duration-1000',
                  isPlaying
                    ? 'bg-gradient-to-r from-primary/50 to-accent/40 opacity-40 group-hover:opacity-60'
                    : 'bg-gradient-to-r from-muted/30 to-muted/20 opacity-20'
                )}
              />

              <div className="relative rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-2xl shadow-2xl overflow-hidden">
                {/* Deck selector grid */}
                <div className="p-3 space-y-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-semibold px-0.5">
                    Ambient Soundscape
                  </p>
                  <div className="grid grid-cols-5 gap-1">
                    {DECKS.map(deck => (
                      <button
                        key={deck.id}
                        onClick={() => switchDeck(deck.id)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-300',
                          activeDeck === deck.id
                            ? 'bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
                            : 'hover:bg-white/[0.06] active:scale-95'
                        )}
                      >
                        <span className="text-sm leading-none">{deck.emoji}</span>
                        <span
                          className={cn(
                            'text-[7px] font-bold uppercase tracking-[0.12em] leading-tight',
                            activeDeck === deck.id
                              ? 'text-primary'
                              : 'text-muted-foreground/40'
                          )}
                        >
                          {deck.label.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume strip */}
                <div className="flex items-center gap-2.5 px-3 pb-3 pt-1">
                  <button
                    onClick={() => setVolume(Math.max(0, volume - 10))}
                    className="text-muted-foreground/30 hover:text-primary transition-colors"
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                  </button>

                  <div className="relative flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary"
                      style={{ width: `${volume}%` }}
                      layout
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={volume}
                      onChange={e => setVolume(Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => setVolume(Math.min(100, volume + 10))}
                    className="text-muted-foreground/30 hover:text-primary transition-colors"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating pill trigger ── */}
      <div className="relative group">
        {/* Ambient glow behind pill */}
        <div
          className={cn(
            'absolute -inset-0.5 rounded-2xl blur transition-opacity duration-1000',
            isPlaying
              ? 'bg-gradient-to-r from-primary/50 to-accent/40 opacity-30 group-hover:opacity-50'
              : 'opacity-0'
          )}
        />

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setExpanded(e => !e)}
          className={cn(
            'relative flex items-center gap-2.5 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-300',
            isPlaying
              ? 'border-primary/20 bg-white/[0.08] pl-2.5 pr-3.5 py-2'
              : 'border-white/[0.1] bg-white/[0.05] px-2.5 py-2'
          )}
        >
          {/* Play / Pause orb */}
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
              isPlaying
                ? 'bg-primary shadow-[0_0_15px_hsl(var(--primary)/0.5)]'
                : 'bg-white/[0.08]'
            )}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 text-primary-foreground" fill="currentColor" />
            ) : (
              <Play className="h-3.5 w-3.5 text-primary ml-0.5" fill="currentColor" />
            )}
          </div>

          {/* Label — only when playing */}
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-[8px] uppercase tracking-[0.18em] text-primary/70 font-semibold leading-none">
                Soundscape
              </span>
              <span className="text-[11px] text-foreground/80 font-light leading-tight truncate max-w-[80px]">
                {activeDeckMeta.label}
              </span>
            </motion.div>
          )}

          {/* Expand chevron */}
          <ChevronDown
            className={cn(
              'h-3 w-3 text-muted-foreground/30 transition-transform duration-300',
              expanded && 'rotate-180'
            )}
          />

          {/* Active ping */}
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}
