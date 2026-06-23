import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const THINKING_PHRASES = [
  'is reflecting…',
  'is gathering thoughts…',
  'is considering…',
  'is thinking…',
];

function WavyDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-[6px] w-[6px] rounded-full bg-current opacity-60"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

export default function TypingIndicator({ companionName, isCircle }: { companionName: string; isCircle?: boolean }) {
  const phrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];

  // Circle variant — matches the glass-morphism lounge style
  if (isCircle) {
    return (
      <div className="flex justify-start gap-2">
        <div className="shrink-0 mt-1">
          <motion.div
            className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/30"
            animate={{
              boxShadow: [
                '0 0 8px 2px hsla(262, 55%, 62%, 0.15)',
                '0 0 16px 6px hsla(262, 55%, 62%, 0.3)',
                '0 0 8px 2px hsla(262, 55%, 62%, 0.15)',
              ],
              backgroundColor: [
                'hsla(262, 55%, 62%, 0.15)',
                'hsla(262, 55%, 62%, 0.25)',
                'hsla(262, 55%, 62%, 0.15)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </motion.div>
        </div>
        <div
          className="rounded-2xl rounded-bl-md px-3.5 py-2.5"
          style={{
            background: 'rgba(139, 92, 246, 0.2)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          <motion.p
            className="text-[12px] font-medium text-accent/80 italic flex items-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {companionName} {phrase}
            <WavyDots />
          </motion.p>
        </div>
      </div>
    );
  }

  // Default 1:1 chat variant — cinematic with pulsing avatar glow
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: -12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-start"
    >
      <div className="flex items-start gap-2.5">
        {/* Pulsing avatar glow orb */}
        <motion.div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, hsl(18 85% 55% / 0.3), hsl(350 80% 55% / 0.3))',
            border: '1px solid hsl(18 85% 55% / 0.3)',
          }}
          animate={{
            boxShadow: [
              '0 0 12px 4px hsl(43 72% 53% / 0.2)',
              '0 0 28px 10px hsl(43 72% 53% / 0.45)',
              '0 0 12px 4px hsl(43 72% 53% / 0.2)',
            ],
            scale: [1, 1.06, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="h-4 w-4 text-primary" />
        </motion.div>

        <div>
          <span className="mb-1 ml-1 block text-xs font-medium text-muted-foreground">
            {companionName}
          </span>
          <motion.div
            className="flex items-center gap-2 rounded-3xl rounded-bl-lg px-5 py-3.5 shadow-sm backdrop-blur-[12px]"
            style={{
              background: 'linear-gradient(135deg, hsl(222 47% 14% / 0.8), hsl(243 47% 22% / 0.6))',
              border: '1px solid hsl(0 0% 100% / 0.08)',
            }}
            animate={{
              boxShadow: [
                '0 0 0px 0px hsl(243 47% 40% / 0)',
                '0 0 16px 4px hsl(243 47% 40% / 0.15)',
                '0 0 0px 0px hsl(243 47% 40% / 0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <motion.span
              className="text-[13px] font-medium text-white/50 italic flex items-center"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {companionName} {phrase}
              <WavyDots />
            </motion.span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
