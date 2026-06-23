import { useState, useRef, useEffect } from 'react';
import { Waves, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSoundscapeSafe } from '@/contexts/SoundscapeContext';
import { cn } from '@/lib/utils';
import type { SoundDeckId } from '@/hooks/useAmbientSoundscape';

const DECKS: { id: SoundDeckId; emoji: string; label: string; short: string }[] = [
  { id: 'brown', emoji: '🌿', label: 'Brown Noise', short: 'Brown' },
  { id: 'rain', emoji: '🌧️', label: 'Soft Rain', short: 'Rain' },
  { id: 'synth', emoji: '🌌', label: 'Synth Pads', short: 'Synth' },
  { id: 'lofi', emoji: '🎧', label: 'Lo-Fi', short: 'Lo-Fi' },
  { id: 'fire', emoji: '🔥', label: 'Fireplace', short: 'Fire' },
  { id: 'none', emoji: '🔇', label: 'Silent', short: 'Off' },
];

export default function SoundscapeQuickToggle({ openDirection = 'up' }: { openDirection?: 'up' | 'down' }) {
  const soundscape = useSoundscapeSafe();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!soundscape) return null;

  const { sfxEnabled, toggleSfx, isPlaying, activeDeck, switchDeck, volume, setVolume } = soundscape;
  const isActive = sfxEnabled || isPlaying;

  return (
    <div ref={wrapperRef} className="relative">
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => setOpen(o => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground transition-colors hover:bg-muted active:scale-95"
        aria-label={isActive ? 'Sound controls' : 'Sound controls'}
      >
        {isActive ? (
          <Waves
            className={`h-4 w-4 text-primary/70 ${isPlaying ? 'animate-pulse' : ''}`}
            style={isPlaying ? { filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' } : undefined}
          />
        ) : (
          <VolumeX className="h-4.5 w-4.5 text-muted-foreground/50" />
        )}
        {isPlaying && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]">
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
          </span>
        )}
      </motion.button>

      {open && (
        <div
          className={cn(
            "absolute z-[200] w-52 rounded-2xl border border-white/[0.12] bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden p-3",
            openDirection === 'down' ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'
          )}
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        >
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-semibold mb-2">
            Your Soundscape
          </p>

          {/* Deck grid */}
          <div className="grid grid-cols-6 gap-1 mb-3">
            {DECKS.map(deck => (
              <button
                key={deck.id}
                onClick={() => {
                  if (deck.id !== 'none' && !localStorage.getItem('compani-soundscape-hint')) {
                    localStorage.setItem('compani-soundscape-hint', 'true');
                    toast('🔊 For best sound, turn your volume all the way up', { duration: 3000 });
                  }
                  switchDeck(deck.id);
                }}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all',
                  activeDeck === deck.id
                    ? 'bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
                    : 'hover:bg-white/[0.06]'
                )}
              >
                <span className="text-sm">{deck.emoji}</span>
                <span className={cn(
                  'text-[7px] font-bold uppercase tracking-[0.1em]',
                  activeDeck === deck.id
                    ? 'text-primary'
                    : 'text-muted-foreground/40'
                )}>
                  {deck.short}
                </span>
              </button>
            ))}
          </div>

          {/* Volume strip */}
          <div className="flex items-center gap-2">
            <VolumeX className="h-3 w-3 text-muted-foreground/30" />
            <input
              type="range" min={0} max={100} step={1}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="flex-1 accent-primary h-1 rounded-full"
            />
            <Waves className="h-3 w-3 text-muted-foreground/30" />
          </div>
        </div>
      )}
    </div>
  );
}
