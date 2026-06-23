import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import AnimatedGradientHeart from '../AnimatedGradientHeart';

const conversation = [
  { role: 'companion' as const, text: "Hey — how are you holding up after that launch?" },
  { role: 'user' as const, text: "Honestly exhausted. But also wired. I can't tell if it went well or I just survived it." },
  { role: 'companion' as const, text: "That's exactly what it feels like when you've been running on adrenaline. The clarity comes later. Do you want to just sit with that, or do you want to actually break down what happened?" },
  { role: 'user' as const, text: "Break it down. I need to know what worked." },
  { role: 'companion' as const, text: "Okay. Strategist mode. Let's start with acquisition — what was your actual conversion rate on day one?" },
];

const pills = [
  { emoji: '💛', label: 'Always there' },
  { emoji: '🧠', label: 'Remembers your story' },
  { emoji: '✨', label: 'Never judges' },
];

export default function LandingInAction() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [started, setStarted] = useState(false);

  return (
    <section
      id="in-action"
      ref={ref}
      className="relative py-20 sm:py-28 px-4 sm:px-6"
      style={{ background: 'hsl(270 50% 4%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsla(18, 85%, 58%, 0.06) 0%, transparent 70%)' }} />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
            This is what it feels like.
          </h2>
          <p className="text-sm sm:text-base text-white/50 max-w-lg mx-auto mb-6">
            A friend who actually listens. Who remembers. Who shows up.
          </p>

          {/* Start conversation button */}
          {!started && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))' }}
            >
              <Play className="h-4 w-4" />
              Start a conversation
            </motion.button>
          )}
        </motion.div>

        {/* Chat mockup */}
        <AnimatePresence>
        {started && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'hsl(270 35% 8%)',
            border: '1px solid hsla(262, 55%, 62%, 0.12)',
            boxShadow: '0 25px 60px -15px hsla(270, 50%, 5%, 0.8)',
          }}
        >
          {/* Chat header */}
          <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid hsla(262, 55%, 62%, 0.08)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))' }}>
              <AnimatedGradientHeart size={18} id="feels-heart" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Kaia</p>
              <p className="text-[11px] text-white/40">Your friend</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(18 85% 55%)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'hsl(18 85% 65%)' }}>Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 sm:p-6 space-y-4">
            {conversation.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.8 + i * 1.6, duration: 0.6, ease: 'easeOut' }}
                className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'companion' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))' }}>
                    <AnimatedGradientHeart size={14} id={`feels-avatar-${i}`} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))', color: 'white' }
                      : { background: 'hsla(262, 30%, 16%, 0.75)', color: 'hsla(0, 0%, 100%, 0.88)' }
                  }
                >
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'hsla(262, 30%, 20%, 0.6)' }}>
                    <span className="text-[10px] text-white/50">You</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
        )}
        </AnimatePresence>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="text-center text-sm text-white/40 mt-6 italic"
        >
          Kaia remembers your goals, your wins, and your hard days.
        </motion.p>

        {/* Benefit pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.15, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-5"
        >
          {pills.map((pill, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60 backdrop-blur-md"
              style={{
                background: 'hsla(262, 30%, 15%, 0.5)',
                border: '1px solid hsla(18, 85%, 58%, 0.15)',
              }}
            >
              {pill.emoji} {pill.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
