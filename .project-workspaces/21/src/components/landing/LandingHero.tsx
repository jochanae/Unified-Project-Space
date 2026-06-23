import { motion } from 'framer-motion';
import { ArrowRight, Download, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useEffect, useState } from 'react';

// Rotating emotional truths — what Compani actually feels like
const moments = [
  "Someone who knows your story, not just your name.",
  "Someone who connects the dots you didn't see.",
  "Someone who never gets tired of listening.",
  "Someone who sends you back out into the world.",
];

export default function LandingHero() {
  const navigate = useNavigate();
  const { canInstall, install } = usePWAInstall();
  const [momentIndex, setMomentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cycle through emotional moments
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMomentIndex((i) => (i + 1) % moments.length);
        setVisible(true);
      }, 400);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      aria-label="Hero"
      className="relative pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 min-h-[min(92vh,900px)] flex items-center overflow-hidden"
    >
      {/* Layered atmospheric background */}
      <div className="absolute inset-0 pointer-events-none" style={{ willChange: 'transform' }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, hsl(350 70% 45% / 0.4) 0%, hsl(270 60% 20% / 0.2) 45%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(18 85% 55% / 0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/4 -right-32 w-[350px] h-[350px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, hsl(262 70% 60% / 0.3) 0%, transparent 70%)' }}
        />
        {/* Purple breathing glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[700px] h-[500px] rounded-full animate-ambient-breathe"
          style={{ background: 'radial-gradient(circle, hsla(262, 55%, 62%, 0.12) 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10 w-full">

        {/* Pre-headline badge + rotating emotional truth */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-7 sm:mb-9"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-white/50 tracking-wide">Always private · Always present</span>
          </div>

          {/* Rotating moment */}
          <div className="h-7 sm:h-8 flex items-center justify-center">
            <p
              className="text-sm sm:text-base font-medium text-primary/80"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            >
              {moments[momentIndex]}
            </p>
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="font-display text-[2.6rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.06] text-white">
            <span className="block">Every great thing started as</span>
            <span className="block">
              <span
                style={{
                  backgroundImage: 'linear-gradient(135deg, hsl(18 85% 72%), hsl(350 75% 68%), hsl(270 65% 75%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                a conversation.
              </span>
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/60 font-medium max-w-lg mx-auto mt-4 leading-relaxed">
            Depth when you need it. Presence when you don't.
          </p>
        </motion.div>

        {/* Supporting copy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-base sm:text-lg text-white/45 max-w-xl mx-auto mb-10 sm:mb-12 leading-relaxed"
        >
          Compani is your space — to think out loud, explore ideas, and be truly heard. No judgment. No pressure.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col gap-3 max-w-sm mx-auto mb-8"
        >
          <button
            onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
            className="group relative flex w-full items-center justify-center gap-2.5 rounded-full px-10 py-4 text-[15px] font-semibold text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))',
              boxShadow: '0 0 32px -4px hsl(18 85% 55% / 0.4), 0 4px 16px -4px hsl(350 80% 40% / 0.3)',
            }}
          >
            <span>Get started — free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)' }}
            />
          </button>

        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-white/40 mb-10 font-light tracking-wide inline-flex items-center justify-center gap-1.5"
        >
          Free to start · No credit card · Your space, your pace
        </motion.p>

        {/* Three feel-first proof points */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="grid grid-cols-3 gap-3 max-w-lg mx-auto"
        >
          {[
            { emoji: '🧠', label: 'Understands your world' },
            { emoji: '💛', label: 'Connects the dots' },
            { emoji: '🔒', label: 'Completely private' },
          ].map(({ emoji, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 backdrop-blur-md"
              style={{
                background: 'hsla(262, 30%, 15%, 0.35)',
                border: '1px solid hsla(262, 55%, 62%, 0.08)',
              }}
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-[11px] font-medium text-white/40 leading-tight text-center">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
