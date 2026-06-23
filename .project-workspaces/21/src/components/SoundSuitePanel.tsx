// Sound Suite: The Sanctuary Soundscape — luxury ambient sound + haptic control panel
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Minus, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// ── Haptic Modes ──
export type HapticMode = 'silent' | 'whisper' | 'deep';

const HAPTIC_MODES: { id: HapticMode; label: string; subtitle: string; description: string }[] = [
  { id: 'silent', label: 'Silent Space', subtitle: 'Visual only', description: 'Total stillness. Just the golden dissolve.' },
  { id: 'whisper', label: 'Soft Whisper', subtitle: 'Light touch', description: 'A delicate, high-frequency tick on send.' },
  { id: 'deep', label: 'Deep Connection', subtitle: 'Heartbeat', description: 'The signature double-pulse heartbeat.' },
];

// ── Soundscape Decks ──
interface SoundDeck {
  id: string;
  label: string;
  subtitle: string;
  waveform: 'brown' | 'rain' | 'synth' | 'lofi' | 'silent';
}

const SOUND_DECKS: SoundDeck[] = [
  { id: 'brown', label: 'Brown Noise', subtitle: '& Stillness', waveform: 'brown' },
  { id: 'rain', label: 'Soft Rain', subtitle: '& Vinyl Crackle', waveform: 'rain' },
  { id: 'synth', label: 'Synth Pads', subtitle: '& Cosmos', waveform: 'synth' },
  { id: 'lofi', label: 'Lo-Fi Beats', subtitle: '& Chill', waveform: 'lofi' },
  { id: 'none', label: 'Silent', subtitle: 'Mode', waveform: 'silent' },
];

// ── Waveform SVGs ──
function WaveformIcon({ type, active }: { type: SoundDeck['waveform']; active: boolean }) {
  const color = active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)';
  const glow = active ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6))' : 'none';

  if (type === 'silent') {
    return (
      <svg width="56" height="36" viewBox="0 0 56 36" fill="none" style={{ filter: glow }}>
        <line x1="8" y1="18" x2="36" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="11" x2="44" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="44" y1="11" x2="30" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Animated waveform paths — each deck gets a unique shape
  const paths: Record<string, string[]> = {
    brown: [
      'M2 18 Q4 10 6 18 Q8 26 10 18 Q12 10 14 18 Q16 26 18 18 Q20 10 22 18 Q24 26 26 18 Q28 10 30 18 Q32 26 34 18 Q36 10 38 18 Q40 26 42 18 Q44 10 46 18 Q48 26 50 18 Q52 10 54 18',
      'M2 18 Q4 12 6 18 Q8 24 10 18 Q12 12 14 18 Q16 24 18 18 Q20 12 22 18 Q24 24 26 18 Q28 12 30 18 Q32 24 34 18 Q36 12 38 18 Q40 24 42 18 Q44 12 46 18 Q48 24 50 18 Q52 12 54 18',
    ],
    rain: [
      'M2 18 Q10 4 20 18 Q30 32 40 18 Q48 6 54 18',
      'M2 18 Q10 8 20 18 Q30 28 40 18 Q48 10 54 18',
    ],
    synth: [
      'M2 18 Q14 2 28 18 Q42 34 54 18',
      'M2 18 Q14 6 28 18 Q42 30 54 18',
    ],
    lofi: [
      'M2 18 L6 8 L10 24 L16 6 L22 26 L28 10 L34 22 L40 6 L46 28 L50 10 L54 18',
      'M2 18 L6 12 L10 20 L16 10 L22 22 L28 14 L34 18 L40 10 L46 24 L50 14 L54 18',
    ],
  };

  const deckPaths = paths[type] || paths.brown;

  return (
    <svg width="56" height="36" viewBox="0 0 56 36" fill="none" style={{ filter: glow }}>
      <motion.path
        d={deckPaths[0]}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={active ? {
          d: deckPaths,
        } : {}}
        transition={active ? {
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        } : {}}
      />
      {active && (
        <circle cx="28" cy="32" r="2.5" fill={color} opacity={0.6}>
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

// ── Haptic preview functions ──
function previewHaptic(mode: HapticMode) {
  try {
    if (!navigator.vibrate) return;
    switch (mode) {
      case 'silent': break;
      case 'whisper': navigator.vibrate(10); break;
      case 'deep': navigator.vibrate([40, 80, 40]); break;
    }
  } catch { /* non-critical */ }
}

export function getHapticMode(): HapticMode {
  return (localStorage.getItem('compani-haptic-mode') as HapticMode) || 'whisper';
}

export function getSfxEnabled(): boolean {
  return localStorage.getItem('compani-sfx-enabled') !== 'false';
}

interface SoundSuitePanelProps {
  companionName?: string;
  onSoundDeckChange?: (deckId: string) => void;
  activeSoundDeck?: string;
  volume?: number;
  onVolumeChange?: (v: number) => void;
}

export default function SoundSuitePanel({
  companionName = 'Marcus',
  onSoundDeckChange,
  activeSoundDeck = 'none',
  volume = 50,
  onVolumeChange,
}: SoundSuitePanelProps) {
  const [hapticMode, setHapticMode] = useState<HapticMode>(getHapticMode);
  const [sfxOn, setSfxOn] = useState(getSfxEnabled);
  const [hapticIntensity, setHapticIntensity] = useState(() => {
    const v = localStorage.getItem('compani-haptic-intensity');
    return v ? Number(v) : 70;
  });
  const hapticIndex = HAPTIC_MODES.findIndex(m => m.id === hapticMode);

  const handleHapticChange = useCallback((vals: number[]) => {
    const idx = Math.round(vals[0]);
    const mode = HAPTIC_MODES[idx];
    if (!mode) return;
    setHapticMode(mode.id);
    localStorage.setItem('compani-haptic-mode', mode.id);
    // Also update legacy keys for backward compat
    localStorage.setItem('compani-haptic-enabled', mode.id === 'silent' ? 'false' : 'true');
    previewHaptic(mode.id);
  }, []);

  const handleSfxToggle = useCallback(() => {
    const next = !sfxOn;
    setSfxOn(next);
    localStorage.setItem('compani-sfx-enabled', next ? 'true' : 'false');
  }, [sfxOn]);

  const currentHaptic = HAPTIC_MODES[hapticIndex] || HAPTIC_MODES[1];

  return (
    <div className="space-y-6">
      {/* ── SOUND SUITE ── */}
      <section className="rounded-3xl overflow-hidden border border-primary/20 bg-black/60 backdrop-blur-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <h3
            className="text-sm font-semibold tracking-[0.2em] uppercase"
            style={{ fontFamily: 'Georgia, serif', color: 'hsl(var(--primary))' }}
          >
            Sound Suite
          </h3>
          <p
            className="text-[10px] tracking-[0.15em] uppercase mt-0.5"
            style={{ color: 'hsl(var(--primary) / 0.6)' }}
          >
            Your Soundscape
          </p>
        </div>

        {/* Soundscape Deck Selector */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-end justify-between gap-1">
            {SOUND_DECKS.map(deck => {
              const isActive = activeSoundDeck === deck.id;
              return (
                <button
                  key={deck.id}
                  onClick={() => onSoundDeckChange?.(deck.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all duration-300',
                    isActive
                      ? 'bg-primary/10'
                      : 'hover:bg-primary/5'
                  )}
                >
                  <motion.div
                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <WaveformIcon type={deck.waveform} active={isActive} />
                  </motion.div>
                  <span
                    className={cn(
                      'text-[9px] font-semibold uppercase tracking-[0.1em] leading-tight text-center',
                      isActive ? 'text-primary' : 'text-muted-foreground/50'
                    )}
                  >
                    {deck.label}
                  </span>
                  <span
                    className={cn(
                      'text-[8px] uppercase tracking-[0.08em] leading-tight text-center',
                      isActive ? 'text-primary/70' : 'text-muted-foreground/30'
                    )}
                  >
                    {deck.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume Slider */}
        <div className="px-6 pb-2 pt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => onVolumeChange?.(Math.max(0, volume - 10))} className="text-muted-foreground/40 hover:text-primary transition-colors">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={vals => onVolumeChange?.(vals[0])}
              className="flex-1 [&_[data-radix-slider-track]]:h-[2px] [&_[data-radix-slider-track]]:bg-primary/20 [&_[data-radix-slider-range]]:bg-primary [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:border-primary [&_[data-radix-slider-thumb]]:bg-primary [&_[data-radix-slider-thumb]]:shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
            />
            <button onClick={() => onVolumeChange?.(Math.min(100, volume + 10))} className="text-muted-foreground/40 hover:text-primary transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-center text-[9px] uppercase tracking-[0.15em] text-primary/50 mt-1.5">Volume</p>
        </div>

        {/* Footer attribution */}
        <div className="px-6 pb-5 pt-1">
          <p className="text-center text-[10px] text-muted-foreground/30 tracking-wide">
            Held with care • Sound design by {companionName}
          </p>
        </div>
      </section>

      {/* ── TACTILE CONNECTION ── */}
      <section className="rounded-3xl overflow-hidden border border-primary/20 bg-black/60 backdrop-blur-xl">
        <div className="px-6 pt-6 pb-2 text-center">
          <h3
            className="text-sm font-semibold tracking-[0.2em] uppercase"
            style={{ fontFamily: 'Georgia, serif', color: 'hsl(var(--primary))' }}
          >
            Tactile Connection
          </h3>
          <p
            className="text-[10px] tracking-[0.15em] uppercase mt-0.5"
            style={{ color: 'hsl(var(--primary) / 0.6)' }}
          >
            How you feel the connection
          </p>
        </div>

        {/* Mode labels */}
        <div className="px-6 pt-4 flex justify-between">
          {HAPTIC_MODES.map((mode, i) => (
            <button
              key={mode.id}
              onClick={() => handleHapticChange([i])}
              className="flex flex-col items-center gap-0.5 transition-colors"
            >
              <span
                className={cn(
                  'text-[9px] font-semibold uppercase tracking-[0.1em]',
                  hapticIndex === i ? 'text-primary' : 'text-muted-foreground/40'
                )}
              >
                {mode.label}
              </span>
              <span
                className={cn(
                  'text-[8px] uppercase tracking-[0.08em]',
                  hapticIndex === i ? 'text-primary/60' : 'text-muted-foreground/25'
                )}
              >
                {mode.subtitle}
              </span>
            </button>
          ))}
        </div>

        {/* Gold Slider */}
        <div className="px-6 pt-4 pb-1">
          <Slider
            value={[hapticIndex]}
            min={0}
            max={2}
            step={1}
            onValueChange={handleHapticChange}
            className="[&_[data-radix-slider-track]]:h-[2px] [&_[data-radix-slider-track]]:bg-primary/20 [&_[data-radix-slider-range]]:bg-primary [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:border-primary [&_[data-radix-slider-thumb]]:bg-primary [&_[data-radix-slider-thumb]]:shadow-[0_0_15px_hsl(var(--primary)/0.6)]"
          />
        </div>

        {/* Active mode description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentHaptic.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-center text-[10px] text-muted-foreground/50 px-6 pt-2 pb-1"
          >
            {currentHaptic.description}
          </motion.p>
        </AnimatePresence>

        {/* Haptic Intensity Slider */}
        {hapticMode !== 'silent' && (
          <div className="px-6 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/40 font-semibold">
                Intensity Calibration
              </span>
              <span className="text-[9px] tabular-nums text-primary/50 font-semibold">
                {hapticIntensity}%
              </span>
            </div>
            <Slider
              value={[hapticIntensity]}
              min={10}
              max={100}
              step={5}
              onValueChange={(vals) => {
                setHapticIntensity(vals[0]);
                localStorage.setItem('compani-haptic-intensity', String(vals[0]));
              }}
              className="[&_[data-radix-slider-track]]:h-[2px] [&_[data-radix-slider-track]]:bg-primary/15 [&_[data-radix-slider-range]]:bg-primary/60 [&_[data-radix-slider-thumb]]:h-3.5 [&_[data-radix-slider-thumb]]:w-3.5 [&_[data-radix-slider-thumb]]:border-primary/60 [&_[data-radix-slider-thumb]]:bg-primary/80 [&_[data-radix-slider-thumb]]:shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
            />
            <p className="text-[8px] text-muted-foreground/30 text-center mt-1.5 tracking-wide">
              Fine-tune how strong the vibration feels
            </p>
          </div>
        )}

        {/* Sound Effects toggle */}
        <div className="px-6 pb-5 pt-2">
          <button
            onClick={handleSfxToggle}
            className="flex items-center justify-between w-full group"
          >
            <span className="flex items-center gap-2">
              {sfxOn
                ? <Volume2 className="h-3.5 w-3.5 text-primary/60" />
                : <VolumeX className="h-3.5 w-3.5 text-muted-foreground/30" />
              }
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
                Sound Effects
              </span>
            </span>
            <div className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              sfxOn ? 'bg-primary/30' : 'bg-muted-foreground/10'
            )}>
              <motion.div
                animate={{ x: sfxOn ? 16 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-colors',
                  sfxOn ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]' : 'bg-muted-foreground/30'
                )}
              />
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
