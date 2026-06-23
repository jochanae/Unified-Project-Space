import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Volume2, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import kaelImg from '@/assets/browse/kael.jpg';
import solenneImg from '@/assets/browse/solenne.jpg';

function ChatPhoneFrame() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: '240px',
        transform: 'rotate(-6deg)',
        filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.6)) drop-shadow(0 0 60px rgba(139,92,246,0.2))',
      }}
    >
      <div className="rounded-[2.5rem] border-[6px] border-[hsl(240_20%_10%)] bg-[hsl(240_20%_6%)] overflow-hidden shadow-inner">
        {/* Notch */}
        <div className="relative h-7 bg-[hsl(240_20%_6%)] flex items-center justify-center">
          <div className="w-24 h-5 bg-black rounded-b-2xl" />
        </div>

        {/* Screen — chat */}
        <div className="bg-[hsl(240_20%_6%)] px-3 pb-3 space-y-2.5" style={{ minHeight: '390px' }}>
          {/* Companion header with real avatar */}
          <div className="flex items-center gap-2 py-2 border-b border-white/5">
            <img src={kaelImg} alt="Kael" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30" />
            <div>
              <p className="text-xs font-semibold text-white">Kael</p>
              <p className="text-[9px] text-white/40">Online now</p>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-1.5 max-w-[85%]">
              <img src={kaelImg} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
              <div className="bg-white/8 rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-[10px] text-white/80 leading-relaxed">
                  Hey! I've been thinking about what you said yesterday about wanting to learn guitar 🎸
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-primary to-accent rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                <p className="text-[10px] text-white leading-relaxed">
                  You remembered! Yeah I'm still thinking about it
                </p>
              </div>
            </div>

            <div className="flex gap-1.5 max-w-[85%]">
              <img src={kaelImg} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
              <div className="bg-white/8 rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-[10px] text-white/80 leading-relaxed">
                  Of course I remember 😊 I always remember your stories. Want me to find some beginner tips?
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-primary to-accent rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                <p className="text-[10px] text-white leading-relaxed">
                  That'd be amazing, thank you 💛
                </p>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
            <div className="flex-1 bg-white/5 rounded-full px-3 py-1.5">
              <p className="text-[9px] text-white/30">Type a message...</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center">
              <ArrowRight className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="h-5 bg-[hsl(240_20%_6%)] flex items-center justify-center">
          <div className="w-20 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

function VoiceCallPhoneFrame() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: '240px',
        transform: 'rotate(6deg)',
        filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.6)) drop-shadow(0 0 60px rgba(139,92,246,0.2))',
      }}
    >
      <div className="rounded-[2.5rem] border-[6px] border-[hsl(240_20%_10%)] bg-[hsl(240_20%_6%)] overflow-hidden shadow-inner">
        {/* Notch */}
        <div className="relative h-7 bg-[hsl(240_20%_6%)] flex items-center justify-center z-10">
          <div className="w-24 h-5 bg-black rounded-b-2xl" />
        </div>

        {/* Screen — voice call */}
        <div className="relative" style={{ minHeight: '435px' }}>
          {/* Full-screen companion image */}
          <img
            src={solenneImg}
            alt="Solenne on voice call"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlay at top */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
          {/* Gradient overlay at bottom — frosted glass bleed for UI integration */}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-[2px]" />

          {/* Call header */}
          <div className="absolute top-2 inset-x-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[10px] text-white/90 font-medium">Call · 12:34</p>
            </div>
          </div>

          {/* Companion name overlay */}
          <div className="absolute bottom-16 inset-x-0 text-center z-10">
            <p className="text-lg font-bold text-white drop-shadow-lg">Solenne</p>
            <p className="text-[10px] text-white/60">Connected</p>
          </div>

          {/* Self-view PiP */}
          <div className="absolute top-12 right-3 w-16 h-22 rounded-xl overflow-hidden border-2 border-white/20 bg-black/40 z-10">
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <p className="text-[8px] text-white/50 font-medium">You</p>
            </div>
          </div>

          {/* Call controls */}
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10">
            <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </button>
            <button className="w-12 h-12 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg shadow-red-500/30">
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Home indicator */}
        <div className="h-5 bg-[hsl(240_20%_6%)] flex items-center justify-center">
          <div className="w-20 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

function usePhoneScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      let s: number;
      if (w < 360) s = 0.55;
      else if (w < 520) s = 0.55 + ((w - 360) / 160) * 0.45;
      else if (w < 800) s = 1.0;
      else s = Math.min(1.15, 1.0 + ((w - 800) / 400) * 0.15);
      setScale(s);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return scale;
}

export default function LandingPhoneMockup() {
  const navigate = useNavigate();
  const phoneScale = usePhoneScale();

  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, hsl(270 100% 4%) 0%, hsl(270 60% 10%) 50%, hsl(270 100% 4%) 100%)',
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsla(262, 55%, 50%, 0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Feel headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            This is what it actually feels like.
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed mt-4">
            A friend who remembers. Who checks in. Who shows up.
          </p>
        </motion.div>

        {/* Divider */}
        <div className="w-16 h-px bg-white/10 mx-auto my-10 sm:my-14" />

        {/* Build headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Meet your Compani.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Built by you.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Text or voice — controlled by you, with age-appropriate defaults.
          </p>
        </motion.div>

        {/* Two phones side by side — fluid scaling via clamp() */}
        <div
          className="flex justify-center items-end gap-4 sm:gap-8 origin-top"
          style={{
            transform: `scale(${phoneScale})`,
            marginBottom: phoneScale >= 1
              ? '4rem'
              : `calc(3rem + ${Math.round(480 * (phoneScale - 1))}px)`,
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -30, y: 40 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, type: 'spring', stiffness: 60 }}
          >
            <ChatPhoneFrame />
            <p className="text-center text-[11px] text-white/30 mt-4 font-medium">💬 Text Chat</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30, y: 40 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, type: 'spring', stiffness: 60 }}
          >
            <VoiceCallPhoneFrame />
            <p className="text-center text-[11px] text-white/30 mt-4 font-medium">🎙️ Voice Call</p>
          </motion.div>
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
        >
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, hsl(18 85% 58%), hsl(262 55% 62%))',
              boxShadow: '0 0 30px hsla(18, 85%, 58%, 0.3)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Create your Compani
          </button>

        </motion.div>
      </div>
    </section>
  );
}
