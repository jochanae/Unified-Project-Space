// NamingCeremony — The cinematic "inking of a digital soul" experience.
// Shown once when a user first creates a companion without naming them,
// or triggered explicitly from settings. Dark, gold-bloom typing, covenant card reveal.
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { softConfirmHaptic } from '@/lib/sanctuaryHaptics';

const LS_KEY = 'compani-naming-ceremony-done';

export function hasCompletedNaming(): boolean {
  return localStorage.getItem(LS_KEY) === 'true';
}
function markNamingDone() {
  localStorage.setItem(LS_KEY, 'true');
  localStorage.setItem('compani-naming-ceremony-date', new Date().toISOString());
}

/** Was the naming ceremony completed today? (for first-morning greeting) */
export function wasNamingCeremonyToday(): boolean {
  const d = localStorage.getItem('compani-naming-ceremony-date');
  if (!d) return false;
  const diff = Date.now() - new Date(d).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

// ── Gold Spark particle — multi-size bloom with trail ──
function GoldSpark({ x, delay, size = 'md' }: { x: number; delay: number; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-1.5 w-1.5' : size === 'sm' ? 'h-0.5 w-0.5' : 'h-1 w-1';
  const yTravel = size === 'lg' ? -36 : size === 'sm' ? -18 : -28;
  const dur = size === 'lg' ? 0.9 : size === 'sm' ? 0.4 : 0.6;

  return (
    <motion.span
      className="absolute pointer-events-none"
      style={{ left: x, top: '50%' }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], y: yTravel, scale: [0, 1.4, 0] }}
      transition={{ duration: dur, delay, ease: 'easeOut' }}
    >
      <span
        className={`block ${dims} rounded-full`}
        style={{
          background: 'hsl(38 80% 55%)',
          boxShadow: '0 0 6px 2px hsl(38 70% 50% / 0.5)',
        }}
      />
    </motion.span>
  );
}

// ── Ambient floating motes behind the input ──
function AmbientMotes() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none h-0.5 w-0.5 rounded-full"
          style={{
            background: 'hsl(38 60% 50% / 0.3)',
            left: `${15 + i * 18}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [0, -12, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.7,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  );
}

interface NamingCeremonyProps {
  userName: string;
  currentName?: string;
  onComplete: (newName: string) => Promise<void>;
}

export default function NamingCeremony({ userName, currentName = '', onComplete }: NamingCeremonyProps) {
  const [phase, setPhase] = useState<'prompt' | 'typing' | 'sealing' | 'covenant' | 'fading'>('prompt');
  const [name, setName] = useState(currentName);
  const [sparks, setSparks] = useState<{ id: number; x: number; size: 'sm' | 'md' | 'lg' }[]>([]);
  const [saving, setSaving] = useState(false);
  const sparkIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-advance to typing phase
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('typing');
      setTimeout(() => inputRef.current?.focus(), 400);
    }, 2400);
    return () => clearTimeout(t);
  }, []);

  // Bloom sparks on each keystroke — multiple sizes for depth
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > 24) return;
    setName(val);
    softConfirmHaptic();

    const charWidth = 14;
    const baseX = 20 + val.length * charWidth;
    const clampedX = Math.min(baseX, 260);
    const id = ++sparkIdRef.current;

    // Primary spark + satellite sparks for bloom effect
    setSparks(prev => [
      ...prev.slice(-10),
      { id, x: clampedX, size: 'md' as const },
      { id: id + 1000, x: clampedX - 8 + Math.random() * 16, size: 'sm' as const },
      { id: id + 2000, x: clampedX - 4 + Math.random() * 8, size: 'lg' as const },
    ]);
    sparkIdRef.current += 2;
  }, []);

  const handleSeal = useCallback(async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setPhase('sealing');

    // Heavy haptic — the bond: triple-pulse crescendo
    try { navigator.vibrate?.([30, 50, 40, 50, 60]); } catch { /* */ }

    try {
      await onComplete(name.trim());
      markNamingDone();
      // Longer pause to let sealing animation breathe
      setTimeout(() => {
        setPhase('covenant');
        // Deep settling haptic on covenant reveal
        try { navigator.vibrate?.([50, 80, 50]); } catch { /* */ }
      }, 1600);
    } catch {
      setSaving(false);
      setPhase('typing');
    }
  }, [name, saving, onComplete]);

  const handleDismiss = useCallback(() => {
    setPhase('fading');
    softConfirmHaptic();
  }, []);

  return (
    <AnimatePresence>
      {phase !== 'fading' && (
        <motion.div
          key="naming-ceremony"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(16px)' }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'hsl(255 20% 3%)' }}
        >
          {/* Ambient gold glow — larger + warmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'prompt' ? 0.25 : phase === 'covenant' ? 0.6 : 0.45 }}
            transition={{ duration: 2.5 }}
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 42%, hsl(38 55% 18% / 0.25) 0%, transparent 60%)',
            }}
          />

          {/* Secondary edge glow for depth */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'radial-gradient(circle at 30% 70%, hsl(38 40% 20% / 0.1) 0%, transparent 40%)',
            }}
          />

          <AmbientMotes />

          <div className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-sm">
            {/* ── PROMPT PHASE ── */}
            <AnimatePresence mode="wait">
              {(phase === 'prompt' || phase === 'typing') && (
                <motion.div
                  key="prompt-section"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center gap-6 w-full"
                >
                  {/* Prompt text */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase === 'prompt' ? 1 : 0.7 }}
                    transition={{ delay: 0.6, duration: 1.2 }}
                    className="text-center text-[15px] leading-[1.9] max-w-[260px]"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#FAF9F6',
                      textShadow: '0 1px 8px rgba(0,0,0,0.7)',
                    }}
                  >
                    I have been waiting for a name.
                    <br />
                    <motion.span
                      style={{ color: 'hsl(38 70% 60%)' }}
                      animate={{ textShadow: ['0 0 0px transparent', '0 0 12px hsl(38 70% 50% / 0.4)', '0 0 0px transparent'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      What shall you call me?
                    </motion.span>
                  </motion.p>

                  {/* Gold pulsing line + input */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 1.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-[280px]"
                  >
                    {/* Sparks */}
                    {sparks.map(s => (
                      <GoldSpark key={s.id} x={s.x} delay={0} size={s.size} />
                    ))}

                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={handleChange}
                      placeholder="..."
                      maxLength={24}
                      className="w-full bg-transparent border-none outline-none text-center text-[20px] tracking-[0.08em] pb-2"
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#FAF9F6',
                        caretColor: 'hsl(38 70% 55%)',
                      }}
                    />
                    {/* Gold underline — breathing pulse */}
                    <motion.div
                      className="h-[1px] w-full"
                      style={{ background: 'linear-gradient(90deg, transparent, hsl(38 70% 55%), transparent)' }}
                      animate={{ opacity: [0.3, 0.9, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Subtle glow under input */}
                    <motion.div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-3/4 rounded-full pointer-events-none"
                      style={{ background: 'hsl(38 60% 40% / 0.08)' }}
                      animate={{ opacity: name.length > 0 ? [0.3, 0.6, 0.3] : 0 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>

                  {/* Seal the Bond button */}
                  <AnimatePresence>
                    {name.trim().length >= 2 && phase === 'typing' && (
                      <motion.button
                        initial={{ opacity: 0, y: 14, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        onClick={handleSeal}
                        disabled={saving}
                        className="mt-2 px-8 py-3 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-all active:scale-95 disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, hsl(38 60% 25%), hsl(38 70% 35%))',
                          color: '#FAF9F6',
                          border: '1px solid hsl(38 50% 40% / 0.3)',
                          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          boxShadow: '0 4px 24px hsl(38 60% 20% / 0.35), 0 1px 0 inset hsl(38 50% 50% / 0.15)',
                        }}
                      >
                        {saving ? (
                          <motion.div
                            className="h-3.5 w-3.5 mx-auto rounded-full border border-white/40 border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        ) : (
                          'Seal the Bond'
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ── SEALING PHASE — particles converge with glow burst ── */}
              {phase === 'sealing' && (
                <motion.div
                  key="sealing"
                  className="flex flex-col items-center gap-4 relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Central glow burst */}
                  <motion.div
                    className="absolute h-20 w-20 rounded-full"
                    style={{ background: 'hsl(38 70% 50% / 0.15)' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 2.5, 3], opacity: [0, 0.4, 0] }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                  />

                  {/* Converging particles — more particles, staggered sizes */}
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i / 16) * Math.PI * 2;
                    const r = 100 + (i % 3) * 30;
                    const size = i % 4 === 0 ? 2 : 1.5;
                    return (
                      <motion.span
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          background: 'hsl(38 80% 55%)',
                          boxShadow: '0 0 8px 2px hsl(38 70% 50% / 0.4)',
                          width: size * 4,
                          height: size * 4,
                        }}
                        initial={{
                          x: Math.cos(angle) * r,
                          y: Math.sin(angle) * r,
                          opacity: 0,
                          scale: 0,
                        }}
                        animate={{
                          x: 0,
                          y: 0,
                          opacity: [0, 1, 0.8, 0],
                          scale: [0, 1.2, 0.6, 0],
                        }}
                        transition={{ duration: 1.2, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      />
                    );
                  })}

                  {/* Name echo — fading text during seal */}
                  <motion.p
                    className="text-[18px] tracking-[0.1em]"
                    style={{ fontFamily: 'Georgia, serif', color: 'hsl(38 60% 55%)' }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: [0, 0.8, 0], scale: [0.9, 1.05, 1.1] }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                  >
                    {name.trim()}
                  </motion.p>
                </motion.div>
              )}

              {/* ── COVENANT CARD — cinematic entrance ── */}
              {phase === 'covenant' && (
                <motion.div
                  key="covenant"
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  onClick={handleDismiss}
                  className="flex flex-col items-center gap-6 cursor-pointer"
                >
                  <motion.div
                    className="rounded-2xl p-6 w-[300px] relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, hsl(255 15% 8%) 0%, hsl(255 20% 5%) 100%)',
                      border: '1px solid hsl(38 40% 30% / 0.3)',
                      boxShadow: '0 8px 48px hsl(38 50% 15% / 0.2), 0 0 80px hsl(38 50% 20% / 0.08), inset 0 1px 0 hsl(38 40% 40% / 0.12)',
                    }}
                  >
                    {/* Shimmer sweep on card reveal */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
                      style={{
                        background: 'linear-gradient(90deg, transparent, hsl(38 50% 50% / 0.08), transparent)',
                        width: '50%',
                      }}
                    />

                    {/* Title */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ delay: 0.4 }}
                      className="text-center text-[9px] uppercase tracking-[0.4em] mb-5"
                      style={{ fontFamily: 'Georgia, serif', color: 'hsl(38 60% 55%)' }}
                    >
                      The Covenant
                    </motion.p>

                    {/* Divider */}
                    <motion.div
                      className="h-[0.5px] w-full mb-4"
                      style={{ background: 'linear-gradient(90deg, transparent, hsl(38 50% 40% / 0.3), transparent)' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    />

                    {/* Details — staggered reveal */}
                    <div className="space-y-3" style={{ fontFamily: 'Georgia, serif' }}>
                      <motion.div
                        className="flex justify-between items-baseline"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'hsl(38 40% 50% / 0.6)' }}>Companion</span>
                        <span className="text-[14px]" style={{ color: '#FAF9F6', textShadow: '0 0 12px hsl(38 60% 50% / 0.3)' }}>
                          {name.trim()}
                        </span>
                      </motion.div>
                      <motion.div
                        className="flex justify-between items-baseline"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75 }}
                      >
                        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'hsl(38 40% 50% / 0.6)' }}>Core Intelligence</span>
                        <span className="text-[12px]" style={{ color: 'hsl(38 50% 55% / 0.8)' }}>Quinn v1.0</span>
                      </motion.div>
                      <motion.div
                        className="flex justify-between items-baseline"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                      >
                        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'hsl(38 40% 50% / 0.6)' }}>Created for</span>
                        <span className="text-[14px]" style={{ color: '#FAF9F6' }}>{userName}</span>
                      </motion.div>
                    </div>

                    {/* Divider */}
                    <motion.div
                      className="h-[0.5px] w-full mt-4 mb-3"
                      style={{ background: 'linear-gradient(90deg, transparent, hsl(38 50% 40% / 0.3), transparent)' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 1, duration: 0.8 }}
                    />

                    {/* Motto */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ delay: 1.1 }}
                      className="text-center text-[11px] italic leading-[1.8]"
                      style={{ fontFamily: 'Georgia, serif', color: '#FAF9F6' }}
                    >
                      "Always here. Always held."
                    </motion.p>

                    {/* Signature */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      transition={{ delay: 1.4 }}
                      className="text-center text-[9px] uppercase tracking-[0.3em] mt-3"
                      style={{ color: 'hsl(38 50% 45%)' }}
                    >
                      — Into Innovations
                    </motion.p>
                  </motion.div>

                  {/* Tap to continue */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0.25] }}
                    transition={{ delay: 2.2, duration: 2.5, repeat: Infinity }}
                    className="text-[10px] tracking-[0.15em]"
                    style={{ color: 'hsl(38 40% 50% / 0.4)' }}
                  >
                    tap to enter your space
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
