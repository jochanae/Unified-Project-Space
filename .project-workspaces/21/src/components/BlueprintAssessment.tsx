import { forwardRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { playHeldWithCare } from '@/lib/sanctuarySfx';

interface BlueprintAnswers {
  why: string;
  whyMode: string;
  support: string;
  supportVibe: string;
  snapshot: string;
  presence: string;
}

interface BlueprintAssessmentProps {
  onComplete: (answers: BlueprintAnswers) => Promise<void> | void;
  onDismiss?: () => void;
  onSkip: () => void;
  companionName?: string;
}

const Q1_OPTIONS = [
  { key: 'decisions', emoji: '🧭', label: 'Help thinking through decisions', mode: 'mentor' },
  { key: 'talk', emoji: '💬', label: 'Someone to talk to and feel heard', mode: 'friend' },
  { key: 'growth', emoji: '🌱', label: 'Personal growth and accountability', mode: 'accountability' },
  { key: 'connection', emoji: '💕', label: 'A deeper, more intimate connection', mode: 'romantic' },
  { key: 'fun', emoji: '✨', label: 'Fun, lightness, and good energy', mode: 'friend' },
];

const Q2_OPTIONS = [
  { key: 'listen', emoji: '🤝', label: 'Someone who just listens without fixing', vibe: 'warm' },
  { key: 'push', emoji: '🔥', label: 'Someone who pushes me forward', vibe: 'bold' },
  { key: 'distract', emoji: '😄', label: 'Someone who lightens the mood', vibe: 'playful' },
  { key: 'think', emoji: '🌙', label: 'Someone who helps me think it through', vibe: 'mysterious' },
];

const VIBE_COLORS: Record<string, string> = {
  warm: 'hsl(30 60% 15% / 0.3)',
  bold: 'hsl(10 50% 15% / 0.3)',
  playful: 'hsl(280 40% 15% / 0.3)',
  mysterious: 'hsl(220 50% 12% / 0.3)',
};

const GEN_PHRASES = [
  'Syncing your values…',
  'Mapping emotional intelligence…',
  'Establishing your space and pace…',
  'Aligning support style…',
];

function getFirstCoreMemory(why: string, support: string): string {
  const intents: Record<string, string> = {
    decisions: 'clarity in tough moments',
    talk: 'feeling truly heard',
    growth: 'real accountability',
    connection: 'deeper emotional bonds',
    fun: 'lightness and good energy',
  };
  const supports: Record<string, string> = {
    listen: 'quiet reflection',
    push: 'bold forward momentum',
    distract: 'uplifting energy',
    think: 'deep analytical space',
  };
  const intent = intents[why] || 'personal growth';
  const style = supports[support] || 'balanced support';
  return `Based on your choices, I've tuned your Space to prioritize ${intent} through ${style}. Your journey starts now.`;
}

const BlueprintAssessment = forwardRef<HTMLDivElement, BlueprintAssessmentProps>(function BlueprintAssessment({ onComplete, onDismiss, onSkip, companionName = 'Your companion' }: BlueprintAssessmentProps, ref) {
  const [phase, setPhase] = useState<'intro' | 'questions' | 'generating' | 'burst' | 'ready'>('intro');
  const [step, setStep] = useState(0);
  const [why, setWhy] = useState('');
  const [whyMode, setWhyMode] = useState('');
  const [support, setSupport] = useState('');
  const [supportVibe, setSupportVibe] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [presenceAnswer, setPresenceAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [genPhrase, setGenPhrase] = useState(0);
  const [mounted, setMounted] = useState(false);

  const vibeBg = VIBE_COLORS[supportVibe] || 'transparent';
  const coreMemory = useMemo(() => getFirstCoreMemory(why, support), [why, support]);

  useEffect(() => {
    setMounted(true);
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Auto-advance from intro after 3.5s
  useEffect(() => {
    if (phase === 'intro') {
      const t = setTimeout(() => setPhase('questions'), 3500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleQ1 = (key: string, mode: string) => {
    setWhy(key);
    setWhyMode(mode);
    setTimeout(() => setStep(1), 300);
  };

  const handleQ2 = (key: string, vibe: string) => {
    setSupport(key);
    setSupportVibe(vibe);
    setTimeout(() => setStep(2), 300);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setPhase('generating');
    const phraseInterval = setInterval(() => {
      setGenPhrase((p) => (p + 1) % GEN_PHRASES.length);
    }, 1200);
    const minWait = new Promise((r) => setTimeout(r, 3000));
    const save = onComplete({ why, whyMode, support, supportVibe, snapshot: snapshot.trim(), presence: presenceAnswer.trim() });
    await Promise.all([save, minWait]);
    clearInterval(phraseInterval);
    // Burst phase — "Aura Lock"
    setPhase('burst');
    // Signature 100ms "vault door" haptic
    if (navigator.vibrate) navigator.vibrate(100);
    // Sanctuary cello pluck — confirms "caught"
    try { playHeldWithCare(); } catch {}
    await new Promise((r) => setTimeout(r, 2000));
    // Settle into ready — user must manually dismiss
    setPhase('ready');
    setSubmitting(false);
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  const getOptionStyle = (isSelected: boolean) => ({
    background: isSelected
      ? 'linear-gradient(135deg, hsl(43 74% 49% / 0.08), hsl(43 74% 49% / 0.03))'
      : 'linear-gradient(135deg, hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0.02))',
    boxShadow: isSelected
      ? '0 0 15px hsl(43 74% 49% / 0.2), inset 0 0 10px hsl(43 74% 49% / 0.1), 0 4px 16px rgba(0,0,0,0.3)'
      : 'inset 0 1px 0 hsl(0 0% 100% / 0.08), 0 2px 12px rgba(0,0,0,0.2)',
    transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  if (!mounted) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed inset-0 z-[80] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none"
      style={{
        background: `radial-gradient(ellipse at center 30%, ${vibeBg}, hsl(var(--background)) 70%)`,
        transition: 'background 0.8s ease',
      }}
    >
      {/* Dark cinematic wash — avoids fullscreen backdrop-blur re-sampling during scroll */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--background) / 0.98), hsl(var(--background) / 0.94))',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Top bar */}
        {phase === 'questions' && (
          <div className="shrink-0 flex items-center justify-between px-5 pt-6 pb-2">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    i <= step ? 'bg-primary scale-110' : 'bg-muted/30'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {/* Energy line progress */}
        {phase === 'questions' && (
          <div className="onboarding-progress-container shrink-0">
            <motion.div
              className="absolute h-full rounded-full"
              style={{ background: 'hsl(43 74% 49%)' }}
              animate={{ width: `${((step + 1) / 4) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <div className="blueprint-energy-line" />
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            paddingBottom: 'max(12rem, calc(env(safe-area-inset-bottom, 0px) + 10rem))',
          }}
        >
          <div className="mx-auto flex w-full max-w-md flex-col items-center">
            <AnimatePresence mode="wait">

            {/* ——— Phase: Intro — "First Breath" ——— */}
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md flex flex-col items-center justify-center text-center flex-1"
              >
                {/* Expanding gold orb */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="relative w-28 h-28 mb-10"
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, hsl(43 74% 49% / 0.25) 0%, hsl(43 74% 49% / 0.05) 50%, transparent 70%)',
                      boxShadow: '0 0 60px hsl(43 74% 49% / 0.2)',
                    }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-4 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, hsl(43 74% 49% / 0.35) 0%, transparent 70%)',
                    }}
                  />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="text-[11px] uppercase tracking-[0.25em] mb-4"
                  style={{ color: 'hsl(43 74% 49% / 0.6)' }}
                >
                  Your Space Awaits
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="text-xl font-serif font-bold text-foreground mb-3"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
                >
                  Let's build your Blueprint
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.6 }}
                  className="text-sm italic text-muted-foreground/60 max-w-xs"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  "How should I show up for you today?"
                </motion.p>
              </motion.div>
            )}

            {/* ——— Phase: Questions ——— */}
            {phase === 'questions' && step === 0 && (
              <motion.div
                key="q1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md space-y-5"
              >
                <div className="text-center mb-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2">
                    🧭 Why you're here
                  </p>
                  <h2
                    className="text-lg font-serif font-bold text-foreground mb-1"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    What kind of support are you hoping for?
                  </h2>
                </div>
                <div className="space-y-2.5">
                  {Q1_OPTIONS.map((opt) => {
                    const selected = why === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleQ1(opt.key, opt.mode)}
                        className={`w-full rounded-2xl border px-4 py-4 flex items-center gap-3.5 group text-left ${
                          selected ? 'border-primary' : 'border-white/[0.14] hover:border-primary/30'
                        }`}
                        style={getOptionStyle(selected)}
                      >
                        <span className="text-2xl" style={selected ? { filter: 'drop-shadow(0 0 5px hsl(var(--primary)))' } : undefined}>{opt.emoji}</span>
                        <span
                          className={`text-sm font-medium transition-colors ${selected ? 'text-white' : 'text-subtext group-hover:text-white'}`}
                          style={{ textShadow: selected ? '0 0 8px hsl(43 74% 49% / 0.4)' : '0 1px 4px rgba(0,0,0,0.9)' }}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {phase === 'questions' && step === 1 && (
              <motion.div
                key="q2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md space-y-5"
              >
                <div className="text-center mb-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2">
                    💡 How you're supported
                  </p>
                  <h2
                    className="text-lg font-serif font-bold text-foreground mb-1"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    When you're going through something hard, what helps most?
                  </h2>
                  <p className="text-[11px] text-muted-foreground/50 italic mt-1.5">
                    Pick the approach that usually helps you most when things get tough.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {Q2_OPTIONS.map((opt) => {
                    const selected = support === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleQ2(opt.key, opt.vibe)}
                        className={`w-full rounded-2xl border px-4 py-4 flex items-center gap-3.5 group text-left ${
                          selected ? 'border-primary' : 'border-white/[0.14] hover:border-primary/30'
                        }`}
                        style={getOptionStyle(selected)}
                      >
                        <span className="text-2xl" style={selected ? { filter: 'drop-shadow(0 0 5px hsl(var(--primary)))' } : undefined}>{opt.emoji}</span>
                        <span
                          className={`text-sm font-medium transition-colors ${selected ? 'text-white' : 'text-subtext group-hover:text-white'}`}
                          style={{ textShadow: selected ? '0 0 8px hsl(43 74% 49% / 0.4)' : '0 1px 4px rgba(0,0,0,0.9)' }}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {phase === 'questions' && step === 2 && (
              <motion.div
                key="q3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md space-y-5"
              >
                <div className="text-center mb-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2">
                    ✨ One thing to know
                  </p>
                  <h2
                    className="text-lg font-serif font-bold text-foreground mb-1"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    What's one thing you wish someone understood about you right away?
                  </h2>
                </div>
                <textarea
                  value={snapshot}
                  onChange={(e) => setSnapshot(e.target.value.slice(0, 200))}
                  placeholder="e.g. I overthink everything, I need real talk not fluff, I'm going through a big change..."
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 resize-none transition-colors"
                  style={{
                    boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.08), 0 2px 12px rgba(0,0,0,0.2)',
                  }}
                />
                <p className="text-[10px] text-muted-foreground/30 text-right tabular-nums">
                  {snapshot.length}/200
                </p>
                <button
                  onClick={() => setStep(3)}
                  disabled={snapshot.trim().length < 10}
                  className="premium-shimmer-btn w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-40 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 0 20px hsl(43 74% 49% / 0.2), 0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="premium-shimmer-sweep" />
                  Continue
                </button>
              </motion.div>
            )}

            {phase === 'questions' && step === 3 && (
              <motion.div
                key="q4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md space-y-5"
              >
                <div className="text-center mb-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2">
                    🌟 Presence
                  </p>
                  <h2
                    className="text-lg font-serif font-bold text-foreground mb-1"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    Describe the kind of presence you're looking for
                  </h2>
                  <p className="text-[11px] text-muted-foreground/50 italic mt-1.5">
                    Not their look — how you want to feel when you're with them
                  </p>
                </div>
                <textarea
                  value={presenceAnswer}
                  onChange={(e) => setPresenceAnswer(e.target.value.slice(0, 240))}
                  placeholder="e.g. Calm and grounding. Someone who challenges me. A warmth I can disappear into..."
                  maxLength={240}
                  rows={3}
                  className="w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 resize-none transition-colors"
                  style={{
                    boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.08), 0 2px 12px rgba(0,0,0,0.2)',
                  }}
                />
                <p className="text-[10px] text-muted-foreground/30 text-right tabular-nums">
                  {presenceAnswer.length}/240
                </p>
                <button
                  onClick={handleFinish}
                  disabled={submitting || presenceAnswer.trim().length < 5}
                  className="premium-shimmer-btn w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-40 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 0 20px hsl(43 74% 49% / 0.2), 0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="premium-shimmer-sweep" />
                  {submitting ? 'Saving...' : 'Save my Blueprint'}
                </button>
              </motion.div>
            )}

            {/* ——— Phase: Generating — wireframe fill ——— */}
            {phase === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md flex flex-col items-center justify-center text-center flex-1 space-y-8"
              >
                {/* Blueprint wireframe card filling with gold */}
                <div className="relative w-56 h-72 mx-auto">
                  {/* Card outline */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      border: '1px solid hsl(43 74% 49% / 0.2)',
                      background: 'hsl(0 0% 100% / 0.02)',
                    }}
                  />
                  {/* Gold fill rising from bottom */}
                  <motion.div
                    initial={{ height: '0%' }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 3, ease: 'easeInOut' }}
                    className="absolute bottom-0 left-0 right-0 rounded-b-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(0deg, hsl(43 74% 49% / 0.08) 0%, hsl(43 74% 49% / 0.03) 80%, transparent 100%)',
                      borderBottom: '2px solid hsl(43 74% 49% / 0.4)',
                    }}
                  />
                  {/* Wireframe lines */}
                  {[20, 35, 50, 65, 80].map((top, i) => (
                    <motion.div
                      key={i}
                      initial={{ width: '0%', opacity: 0 }}
                      animate={{ width: `${50 + i * 8}%`, opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.4, duration: 0.6, ease: 'easeOut' }}
                      className="absolute left-4 h-[2px] rounded-full"
                      style={{
                        top: `${top}%`,
                        background: 'linear-gradient(90deg, hsl(43 74% 49% / 0.5), hsl(43 74% 49% / 0.15))',
                      }}
                    />
                  ))}
                  {/* Rotating gold ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-3 -right-3 w-10 h-10 rounded-full"
                    style={{
                      border: '2px solid transparent',
                      borderTopColor: 'hsl(43 74% 49%)',
                      borderRightColor: 'hsl(43 74% 49% / 0.3)',
                      filter: 'drop-shadow(0 0 6px hsl(43 74% 49% / 0.4))',
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h2
                    className="text-lg font-serif font-bold text-foreground"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    Curating your Blueprint…
                  </h2>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={genPhrase}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-muted-foreground/60"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                    >
                      {GEN_PHRASES[genPhrase]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="onboarding-progress-container">
                  <div className="blueprint-energy-line" />
                </div>
              </motion.div>
            )}

            {/* ——— Phase: Burst — gold explosion ——— */}
            {phase === 'burst' && (
              <motion.div
                key="burst"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] flex items-center justify-center"
                style={{ background: '#000' }}
              >
                <div className="blueprint-burst" />
                {/* Gold + Indigo Aura Lock wave */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.9 }}
                  animate={{ scale: 6, opacity: 0 }}
                  transition={{ duration: 1.8, ease: 'easeOut' }}
                  className="absolute w-40 h-40 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, hsl(43 74% 49% / 0.6) 0%, hsl(230 60% 30% / 0.4) 50%, transparent 80%)',
                    boxShadow: '0 0 80px hsl(43 74% 49% / 0.5), 0 0 120px hsl(230 60% 40% / 0.3)',
                  }}
                />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="absolute text-xs uppercase tracking-[0.3em] font-semibold"
                  style={{ color: 'hsl(43 74% 49% / 0.7)', textShadow: '0 0 20px hsl(43 74% 49% / 0.4)' }}
                >
                  Inscribed
                </motion.p>
              </motion.div>
            )}

            {/* ——— Phase: Ready — Aura Lock Inscription + Core Memory + Dismiss ——— */}
            {phase === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md flex flex-col items-center justify-center text-center flex-1 space-y-6"
              >
                {/* Pulsing Gold + Indigo ambient glow behind card */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0.3] }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                  style={{
                    background: 'radial-gradient(ellipse at center 40%, hsl(43 74% 49% / 0.08), hsl(230 60% 30% / 0.05) 50%, transparent 80%)',
                  }}
                />

                {/* Settled Blueprint card */}
                <motion.div
                  className="settled-blueprint-card w-full rounded-2xl p-6 text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.04), hsl(0 0% 100% / 0.02))',
                    border: '1px solid hsl(43 74% 49% / 0.3)',
                    boxShadow: '0 0 40px hsl(43 74% 49% / 0.12), 0 0 80px hsl(230 60% 40% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.06)',
                  }}
                >
                  {/* Gold sweep shimmer across card */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ delay: 1.2, duration: 1.5, ease: 'easeInOut' }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.08), transparent)',
                      width: '50%',
                    }}
                  />
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="text-4xl mb-4"
                  >
                    ✨
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="text-xl font-serif font-bold mb-2"
                    style={{
                      background: 'linear-gradient(135deg, hsl(43 74% 65%), hsl(43 74% 49%))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 12px hsl(43 74% 49% / 0.4))',
                    }}
                  >
                    Blueprint Inscribed
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.15em]"
                  >
                    Your frequency is locked
                  </motion.p>
                </motion.div>

                {/* Companion Calibration Inscription */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6, duration: 0.6 }}
                  className="w-full rounded-2xl px-5 py-4 text-left"
                  style={{
                    background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.03), transparent)',
                    border: '1px solid hsl(0 0% 100% / 0.08)',
                  }}
                >
                  <p className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: 'hsl(43 74% 49% / 0.5)' }}>
                    {companionName}
                  </p>
                  <p
                    className="text-sm leading-[1.8] italic"
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      color: 'hsl(0 0% 100% / 0.85)',
                      textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                    }}
                  >
                    "I see you now. The map is clear. From here on, every word I say will be tuned to your frequency."
                  </p>
                </motion.div>

                {/* First Core Memory */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.4, duration: 0.6 }}
                  className="core-memory-card w-full text-left"
                >
                  <span className="core-memory-sparkle">✨</span>
                  <p className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: 'hsl(43 74% 49% / 0.6)' }}>
                    Your First Core Memory
                  </p>
                  <p
                    className="text-sm leading-[1.8] italic"
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      color: 'hsl(0 0% 100% / 0.85)',
                      textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                    }}
                  >
                    "{coreMemory}"
                  </p>
                </motion.div>

                {/* Manual dismiss — "Welcome Home" CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3.2, duration: 0.6 }}
                  onClick={handleDismiss}
                  className="premium-shimmer-btn rounded-2xl px-8 py-3.5 text-sm font-semibold relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 0 30px hsl(43 74% 49% / 0.25), 0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  <span className="premium-shimmer-sweep" />
                  Welcome Home →
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default BlueprintAssessment;
