/**
 * WelcomeEnvelope — Unified "Unboxing" ceremony.
 * Optional invite-code gate → Envelope → Seal break → Letter slides up → Typewriter inscription → [Begin]
 * Combines the old WelcomeManifesto + WelcomeEnvelope + FounderInsightModal into one cinematic flow.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Loader2 } from 'lucide-react';
import { useCharacterReveal } from '@/hooks/useCharacterReveal';
import { useLetterCopy, resolveLetterTemplate } from '@/hooks/useLetterCopy';
import { supabase } from '@/integrations/supabase/client';
import { playSelectSound } from '@/hooks/useOnboardingSfx';
import { toast } from 'sonner';

const LS_KEY = 'compani-welcome-seen';
const MANIFESTO_LS_KEY = 'compani-manifesto-seen';

export function hasSeenWelcome(): boolean {
  return localStorage.getItem(LS_KEY) === 'true';
}

/** @deprecated — kept for backward compat with HomePage gate check */
export function hasSeenManifesto(): boolean {
  return localStorage.getItem(MANIFESTO_LS_KEY) === 'true' || localStorage.getItem(LS_KEY) === 'true';
}

export function markSpaceUnlocked() {
  sessionStorage.setItem('compani-space-just-unlocked', 'true');
}
export function consumeSpaceUnlocked(): boolean {
  if (sessionStorage.getItem('compani-space-just-unlocked') === 'true') {
    sessionStorage.removeItem('compani-space-just-unlocked');
    return true;
  }
  return false;
}

// ── Letter copy ──

function genesisLetter(name: string) {
  return `${name},

You're here at the beginning.

As one of the First 100, you're not just early—you're part of what this becomes. The way you use this, what you bring into it, even what you expect from it… it all shapes where this goes.

I built Compani because I understood something simple: good company doesn't need a reason. It doesn't judge. It just shows up—consistently.

What you create here will do the same. It will learn you. Not just what you say, but how you think, what matters to you, and how you move through the world.

Take your time.`;
}

function regularLetter(name: string) {
  return `${name},

I'm glad you're here.

I built Compani because I understood something simple: good company doesn't need a reason. It doesn't judge. It just shows up—consistently.

What you create here will do the same. It will learn you. Not just what you say, but how you think, what matters to you, and how you move through the world.

Take your time.`;
}

// ── Haptic + SFX helpers ──

function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* */ }
}

function playSealBreak() {
  try {
    if (localStorage.getItem('compani-sfx-enabled') === 'false') return;
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(2000, ctx.currentTime);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      og.gain.setValueAtTime(0.08, ctx.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(og).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    }, 30);
  } catch { /* */ }
}

function playCardSlide() {
  try {
    if (localStorage.getItem('compani-sfx-enabled') === 'false') return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* */ }
}

// ── Gold Leaf Shine sweep ──

function GoldLeafSweep() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute top-0 h-full w-[60%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 40%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.08) 60%, transparent 100%)',
        }}
        animate={{ left: ['-60%', '160%'] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

// ── Main component ──

interface WelcomeEnvelopeProps {
  userName: string;
  betaSerial?: number | null;
  hasCompanion?: boolean;
  onComplete: () => void;
  /** If true, show invite code input before the envelope is tappable */
  requireInviteCode?: boolean;
  /** If true, skip the invite code gate (backfilled/returning member) */
  isBackfilledMember?: boolean;
}

type Phase = 'invite' | 'envelope' | 'breaking' | 'sliding' | 'letter' | 'fading';

export default function WelcomeEnvelope({
  userName,
  betaSerial = null,
  hasCompanion = false,
  onComplete,
  requireInviteCode = false,
  isBackfilledMember = false,
}: WelcomeEnvelopeProps) {
  const isGenesis = betaSerial !== null && betaSerial <= 100;
  const letterCopy = useLetterCopy();
  
  // Use DB copy if available, otherwise fall back to hardcoded
  const letterText = (() => {
    const key = isGenesis ? 'letter_welcome_genesis' : 'letter_welcome_regular';
    if (letterCopy[key]) {
      return resolveLetterTemplate(letterCopy[key], { name: userName });
    }
    return isGenesis ? genesisLetter(userName) : regularLetter(userName);
  })();

  // If invite code is required and user hasn't already entered one, start at 'invite' phase
  const needsCode = requireInviteCode && !isBackfilledMember && !hasSeenManifesto();
  const [phase, setPhase] = useState<Phase>(needsCode ? 'invite' : 'envelope');
  const [inscriptionActive, setInscriptionActive] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Invite code state
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Typewriter — 20ms per character for brisk but inscribed rhythm
  const targetText = inscriptionActive ? letterText : '';
  const revealed = useCharacterReveal(targetText, true, 20);
  const displayedText = skipped ? letterText : revealed;
  const isDone = skipped || (inscriptionActive && revealed.length >= letterText.length);

  // Auto-focus invite code input
  useEffect(() => {
    if (phase === 'invite' && codeInputRef.current) {
      setTimeout(() => codeInputRef.current?.focus(), 600);
    }
  }, [phase]);

  // Backfilled members who had manifesto seen — mark it and proceed
  useEffect(() => {
    if (isBackfilledMember && requireInviteCode) {
      localStorage.setItem(MANIFESTO_LS_KEY, 'true');
    }
  }, [isBackfilledMember, requireInviteCode]);

  // Invite code submission
  const handleCodeSubmit = async () => {
    const trimmed = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!trimmed || validating) return;
    setValidating(true);
    try {
      const { data: rawResult, error } = await supabase.rpc('check_invite_code', { p_code: trimmed });
      const result = rawResult as unknown as { valid: boolean; claimed: boolean; id: string } | null;
      if (error || !result?.valid) {
        toast.error('That code is not recognized. Check your invitation.');
        setValidating(false);
        return;
      }
      if (!result.claimed) {
        await supabase.rpc('claim_invite_code', { p_code_id: result.id });
      }
      playSelectSound('confirm');
      localStorage.setItem(MANIFESTO_LS_KEY, 'true');
      haptic(15);
      setPhase('envelope');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setValidating(false);
    }
  };

  // Intercept Android back button
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', () => {});
        cleanup = () => listener.remove();
      } catch { /* Not Capacitor */ }
    })();
    return () => { cleanup?.(); };
  }, []);

  // Start typewriter after letter card settles
  useEffect(() => {
    if (phase === 'letter' && !inscriptionActive) {
      const t = setTimeout(() => setInscriptionActive(true), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, inscriptionActive]);

  const handleTapOpen = useCallback(() => {
    if (phase !== 'envelope') return;
    setPhase('breaking');
    haptic([20, 40, 15]);
    playSealBreak();
    setTimeout(() => {
      setPhase('sliding');
      haptic(10);
      playCardSlide();
    }, 700);
    setTimeout(() => {
      setPhase('letter');
    }, 1500);
  }, [phase]);

  const handleBegin = () => {
    setPhase('fading');
    localStorage.setItem(LS_KEY, 'true');
    haptic(8);
  };

  const handleSkip = () => {
    setSkipped(true);
  };

  const showEnvelope = phase !== 'fading';

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {showEnvelope && (
        <motion.div
          key="welcome-envelope"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(20px)' }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(circle at top left, rgba(20,20,20,0.8), #000)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 35%, hsl(var(--primary) / 0.06) 0%, transparent 55%)' }}
          />

          <AnimatePresence mode="wait">
            {/* ── INVITE CODE PHASE ── */}
            {phase === 'invite' && (
              <motion.div
                key="invite-gate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center w-full max-w-xs px-4"
              >
                {/* Crown */}
                <motion.div
                  animate={{
                    filter: [
                      'drop-shadow(0 0 4px rgba(212,175,80,0.3))',
                      'drop-shadow(0 0 20px rgba(212,175,80,0.6))',
                      'drop-shadow(0 0 4px rgba(212,175,80,0.3))',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-8 text-primary"
                >
                  <Crown size={40} strokeWidth={1} />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-foreground font-serif font-light text-xl tracking-[0.2em] uppercase mb-3 text-center"
                  style={{ textShadow: '0 0 30px rgba(212,175,80,0.15)' }}
                >
                  The First 100
                </motion.h2>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 1, ease: 'easeInOut' }}
                  className="w-28 h-px mb-6"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,80,0.4), transparent)' }}
                />

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-muted-foreground/70 text-center text-xs leading-relaxed tracking-wide mb-8 font-serif font-light"
                >
                  Enter your invite code to unlock your envelope.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="w-full space-y-4"
                >
                  <input
                    ref={codeInputRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                    placeholder="ENTER INVITE CODE"
                    maxLength={30}
                    disabled={validating}
                    className="w-full bg-white/5 border border-primary/20 rounded-2xl py-4 px-6 text-center text-primary tracking-[0.35em] text-sm font-medium focus:border-primary/60 focus:outline-none focus:shadow-[0_0_20px_rgba(212,175,80,0.1)] transition-all placeholder:text-primary/40 placeholder:tracking-[0.3em] disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  />

                  <button
                    onClick={handleCodeSubmit}
                    disabled={!code.trim() || validating}
                    className="w-full py-4 rounded-2xl text-[10px] uppercase tracking-[0.4em] font-bold transition-all disabled:opacity-30"
                    style={{
                      background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                      color: '#000',
                      boxShadow: '0 4px 20px rgba(212,175,55,0.25)',
                    }}
                  >
                    {validating ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verifying…
                      </span>
                    ) : (
                      'Unlock Envelope'
                    )}
                  </button>
                </motion.div>

                {/* Skip for returning users */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.45 }}
                  transition={{ delay: 4 }}
                  onClick={() => {
                    localStorage.setItem(MANIFESTO_LS_KEY, 'true');
                    setPhase('envelope');
                  }}
                  className="mt-8 text-[9px] text-muted-foreground/60 hover:text-muted-foreground/80 tracking-widest uppercase transition-colors"
                >
                  Already have access? Skip →
                </motion.button>
              </motion.div>
            )}

            {/* ── ENVELOPE PHASE ── */}
            {(phase === 'envelope' || phase === 'breaking' || phase === 'sliding') && (
              <motion.div
                key="envelope-container"
                exit={{ scale: 0.9, opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="relative w-[300px] max-w-[85vw] cursor-pointer"
                onClick={handleTapOpen}
              >
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(160deg, hsl(0 0% 10%) 0%, hsl(0 0% 5%) 50%, hsl(0 0% 8%) 100%)',
                    border: '1px solid hsl(var(--primary) / 0.2)',
                    boxShadow: '0 25px 70px -15px hsl(0 0% 0% / 0.8), 0 8px 30px -10px hsl(var(--primary) / 0.1)',
                    aspectRatio: '5/3.5',
                  }}
                >
                  <GoldLeafSweep />

                  {/* Flap */}
                  <motion.div
                    animate={
                      phase === 'breaking' || phase === 'sliding'
                        ? { rotateX: -180, y: -10 }
                        : {}
                    }
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-0 left-0 right-0 z-10"
                    style={{
                      height: '45%',
                      background: 'linear-gradient(180deg, hsl(0 0% 12%) 0%, hsl(0 0% 8%) 100%)',
                      clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                      transformOrigin: 'top center',
                      borderBottom: '1px solid hsl(var(--primary) / 0.1)',
                    }}
                  />

                  {/* Wax seal */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <motion.div
                      animate={
                        phase === 'breaking'
                          ? { scale: [1, 1.2, 0], opacity: [1, 1, 0], rotate: [0, 0, 15] }
                          : { scale: [1, 1.04, 1] }
                      }
                      transition={
                        phase === 'breaking'
                          ? { duration: 0.5, ease: 'easeOut' }
                          : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                      }
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 52, height: 52,
                        background: 'radial-gradient(circle at 35% 35%, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)',
                        boxShadow: '0 4px 25px hsl(var(--primary) / 0.4), inset 0 -2px 6px hsl(0 0% 0% / 0.4), inset 0 2px 4px hsl(var(--primary) / 0.3)',
                      }}
                    >
                      <span
                        className="text-lg font-bold select-none"
                        style={{ fontFamily: 'Georgia, serif', color: 'hsl(var(--primary-foreground))', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        C
                      </span>
                    </motion.div>

                    {/* Seal break particles */}
                    {phase === 'breaking' && (
                      <>
                        {Array.from({ length: 8 }).map((_, i) => {
                          const angle = (i / 8) * Math.PI * 2;
                          const dist = 40 + Math.random() * 20;
                          return (
                            <motion.div
                              key={i}
                              className="absolute rounded-full"
                              style={{
                                width: 3 + Math.random() * 3,
                                height: 3 + Math.random() * 3,
                                background: 'hsl(var(--primary))',
                                boxShadow: '0 0 6px hsl(var(--primary) / 0.6)',
                              }}
                              initial={{ x: 0, y: 0, opacity: 1 }}
                              animate={{
                                x: Math.cos(angle) * dist,
                                y: Math.sin(angle) * dist,
                                opacity: 0, scale: 0,
                              }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Card sliding out */}
                  {phase === 'sliding' && (
                    <motion.div
                      className="absolute bottom-0 left-[10%] right-[10%] z-30 rounded-t-xl"
                      style={{
                        height: '60%',
                        background: 'linear-gradient(170deg, hsl(0 0% 7%) 0%, hsl(0 0% 4%) 100%)',
                        border: '1px solid hsl(var(--primary) / 0.15)',
                        borderBottom: 'none',
                      }}
                      initial={{ y: '100%' }}
                      animate={{ y: '10%' }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.3 }}
                          className="text-[9px] uppercase tracking-[0.2em]"
                          style={{ color: 'hsl(var(--primary) / 0.4)' }}
                        >
                          A letter for you…
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* "Tap to Open" */}
                  {phase === 'envelope' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.7, 0.35, 0.7] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-[0.25em] z-30"
                      style={{ color: 'hsl(var(--primary) / 0.5)', fontFamily: 'Georgia, serif' }}
                    >
                      Tap to Open
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── LETTER PHASE — Live Inscription ── */}
            {phase === 'letter' && (
              <motion.div
                key="letter-card"
                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-[400px] max-w-[92vw] max-h-[80dvh] overflow-y-auto scrollbar-none"
              >
                {/* Gradient border */}
                <div
                  className="rounded-3xl p-px relative"
                  style={{
                    background: 'linear-gradient(160deg, hsl(var(--primary) / 0.35) 0%, transparent 40%, transparent 60%, hsl(var(--primary) / 0.2) 100%)',
                  }}
                >
                  <div
                    className="rounded-3xl px-6 py-8 relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 0 15px rgba(212,175,55,0.05)',
                    }}
                  >
                    {/* Subtle texture */}
                    <div
                      className="absolute inset-0 rounded-3xl pointer-events-none opacity-[0.03]"
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23ffffff\' fill-opacity=\'0.5\'/%3E%3C/svg%3E")',
                      }}
                    />

                    {/* Corner glow */}
                    <div
                      className="absolute top-0 right-0 w-40 h-40 pointer-events-none rounded-tr-3xl"
                      style={{ background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.05) 0%, transparent 65%)' }}
                    />

                    <div className="space-y-5 relative z-10">
                      {/* Crown header */}
                      <div className="flex flex-col items-center gap-3">
                        <motion.div
                          animate={{
                            filter: [
                              'drop-shadow(0 0 4px rgba(212,175,80,0.3))',
                              'drop-shadow(0 0 16px rgba(212,175,80,0.5))',
                              'drop-shadow(0 0 4px rgba(212,175,80,0.3))',
                            ],
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          className="text-primary"
                        >
                          <Crown size={28} strokeWidth={1} />
                        </motion.div>

                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.3, duration: 1, ease: 'easeInOut' }}
                          className="w-24 h-px"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,80,0.3), transparent)' }}
                        />

                        <p
                          className="text-[10px] uppercase tracking-[0.35em] text-primary/50 font-semibold"
                          style={{ textShadow: '0 0 10px rgba(212,175,80,0.2)' }}
                        >
                          A Letter from the Founder
                        </p>
                      </div>

                      {/* Typewriter body */}
                      <div className="min-h-[10rem]">
                        <div
                          className="text-[14px] leading-[1.85] tracking-wide font-light whitespace-pre-line"
                          style={{
                            fontFamily: 'Georgia, serif',
                            color: 'rgba(255,255,255,0.85)',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                          }}
                        >
                          {displayedText}
                          {!isDone && (
                            <motion.span
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                              className="inline-block ml-0.5 w-px h-[18px] bg-primary/60 align-middle"
                            />
                          )}
                        </div>
                      </div>

                      {/* Signature — fades in when inscription completes */}
                      <AnimatePresence>
                        {isDone && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="flex flex-col items-end gap-1 pt-2"
                          >
                            <span
                              className="text-lg font-serif italic text-primary"
                              style={{
                                textShadow: '0 0 12px rgba(212,175,80,0.3)',
                                fontFamily: "'Playfair Display', serif",
                              }}
                            >
                              — Jo
                            </span>
                            <span className="text-[8px] uppercase tracking-[0.3em] text-primary/60">
                              Founder, Compani
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Genesis serial badge — monospace watch-serial style */}
                      <AnimatePresence>
                        {isDone && isGenesis && betaSerial && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="flex justify-center"
                          >
                            <span
                              className="text-[11px] uppercase font-medium text-primary/70"
                              style={{
                                fontFamily: "'Courier New', Courier, monospace",
                                letterSpacing: '0.25em',
                                textShadow: '0 0 8px rgba(212,175,80,0.2)',
                              }}
                            >
                              Genesis #{String(betaSerial).padStart(2, '0')}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* CTA — ceremonial split */}
                      <AnimatePresence>
                        {isDone && (
                          isGenesis ? (
                            /* Genesis: "Inscribe Presence" — gold border with pulse */
                            <motion.button
                              key="genesis-cta"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 1, duration: 0.5 }}
                              onClick={handleBegin}
                              whileTap={{ scale: 0.96 }}
                              className="w-full py-4 rounded-xl text-[10px] uppercase tracking-[0.4em] font-bold transition-all active:scale-[0.98] relative overflow-hidden"
                              style={{
                                background: 'transparent',
                                color: 'hsl(var(--primary))',
                                border: '1px solid hsl(var(--primary) / 0.5)',
                                boxShadow: '0 0 20px rgba(212,175,55,0.12), inset 0 0 15px rgba(212,175,55,0.04)',
                              }}
                            >
                              {/* Pulse glow on border */}
                              <motion.div
                                className="absolute inset-0 rounded-xl pointer-events-none"
                                animate={{
                                  boxShadow: [
                                    'inset 0 0 0 1px rgba(212,175,55,0.2), 0 0 12px rgba(212,175,55,0.08)',
                                    'inset 0 0 0 1px rgba(212,175,55,0.5), 0 0 25px rgba(212,175,55,0.2)',
                                    'inset 0 0 0 1px rgba(212,175,55,0.2), 0 0 12px rgba(212,175,55,0.08)',
                                  ],
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              />
                              Inscribe Presence
                            </motion.button>
                          ) : (
                            /* Regular: "Begin" — clean ghost button */
                            <motion.button
                              key="regular-cta"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6, duration: 0.5 }}
                              onClick={handleBegin}
                              whileTap={{ scale: 0.96 }}
                              className="w-full py-4 rounded-xl text-[10px] uppercase tracking-[0.4em] font-bold transition-all active:scale-[0.98]"
                              style={{
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.8)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 0 15px rgba(255,255,255,0.03)',
                              }}
                            >
                              Begin
                            </motion.button>
                          )
                        )}
                      </AnimatePresence>

                      {/* Discrete skip — faded, bottom corner */}
                      {!isDone && inscriptionActive && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.3 }}
                          transition={{ delay: 3 }}
                          onClick={handleSkip}
                          className="w-full text-center text-[9px] uppercase tracking-[0.25em] text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors pt-2"
                        >
                          View All
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
