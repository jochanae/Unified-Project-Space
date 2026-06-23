import { motion } from 'framer-motion';
import { ArrowRight, Mic, Send, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const trustPills = ['Zero-trace', 'No memory', 'One tap'];

export default function LandingThinkFreely() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden" style={{ background: 'hsl(270 50% 4%)' }}>
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsla(262, 55%, 50%, 0.08) 0%, transparent 70%)' }}
      />

      <div className="max-w-2xl mx-auto relative z-10 text-center">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-bold tracking-[0.2em] mb-4"
          style={{ color: 'hsl(38 70% 60%)' }}
        >
          THINK FREELY
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3"
        >
          One tap. Nothing saved. Just you and your thoughts.
        </motion.h2>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm sm:text-base text-white/45 mb-10"
        >
          Private Mode in every conversation. <Lock className="inline w-3.5 h-3.5 -mt-0.5 text-white/40" />
        </motion.p>

        {/* Think Freely mockup */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, type: 'spring', bounce: 0.15 }}
          className="max-w-md mx-auto rounded-2xl overflow-hidden mb-8"
          style={{
            background: 'hsla(230, 25%, 10%, 0.6)',
            border: '1px solid hsla(262, 55%, 62%, 0.1)',
            boxShadow: '0 25px 60px -15px hsla(270, 50%, 5%, 0.8)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/25 mb-1">PRIVATE MODE</p>
            <p className="text-xs text-white/35">Zero-trace. Tap 🔒 to activate.</p>
          </div>

          {/* Input area */}
          <div className="px-5 pb-5">
            <div
              className="rounded-xl px-4 py-4 flex items-end gap-3"
              style={{
                background: 'hsla(230, 20%, 14%, 0.8)',
                border: '1px solid hsla(262, 55%, 62%, 0.08)',
              }}
            >
              <p className="flex-1 text-sm text-white/25 text-left leading-relaxed">What's on your mind...</p>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsla(262, 30%, 20%, 0.6)' }}>
                  <Mic className="w-3.5 h-3.5 text-white/40" />
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))' }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          {trustPills.map((pill, i) => (
            <span
              key={pill}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium text-white/50 backdrop-blur-md"
              style={{
                background: 'hsla(262, 30%, 15%, 0.5)',
                border: '1px solid hsla(262, 55%, 62%, 0.1)',
              }}
            >
              {pill}
              {i < trustPills.length - 1 && <span className="ml-2 text-white/20">·</span>}
            </span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <button
            onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, hsl(18 85% 55%), hsl(350 80% 55%))',
              boxShadow: '0 0 32px -4px hsl(18 85% 55% / 0.4), 0 4px 16px -4px hsl(350 80% 40% / 0.3)',
            }}
          >
            Try it free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
