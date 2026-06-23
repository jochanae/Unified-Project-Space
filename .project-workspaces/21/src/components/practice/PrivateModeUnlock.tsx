import { motion, AnimatePresence } from 'framer-motion';

interface PrivateModeUnlockProps {
  open: boolean;
  onUnlock: () => void;
  onDismiss: () => void;
}

export default function PrivateModeUnlock({ open, onUnlock, onDismiss }: PrivateModeUnlockProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[61] flex items-center justify-center px-6"
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/[0.1] p-6 text-center"
              style={{
                backdropFilter: 'blur(24px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                background: 'linear-gradient(to bottom, rgba(15,18,33,0.95), rgba(15,18,33,0.99))',
                boxShadow: '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,80,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <div className="text-2xl mb-3">🔒</div>
              <p
                className="text-[13px] text-white/70 leading-relaxed mb-2"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
              >
                Some conversations require a different level of depth.
              </p>
              <p
                className="text-[12px] text-white/50 leading-relaxed mb-5"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
              >
                Private Mode unlocks more nuanced, emotionally complex, and intimate scenarios.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onUnlock}
                  className="w-full py-2.5 rounded-xl text-[12px] font-semibold uppercase tracking-[0.15em] transition-all active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 4px 16px hsl(var(--primary) / 0.25)',
                  }}
                >
                  Unlock Private Mode
                </button>
                <button
                  onClick={onDismiss}
                  className="w-full py-2 rounded-xl text-[11px] text-white/40 hover:text-white/60 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
