import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Compass } from 'lucide-react';

const STORAGE_KEY = 'compani-blueprint-announce-seen';

export function hasSeenBlueprintAnnouncement(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

interface Props {
  companionName: string;
  onClose: () => void;
}

export default function BlueprintAnnouncementModal({ companionName, onClose }: Props) {
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setClosing(true);
    setTimeout(onClose, 400);
  };

  const startCalibration = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    navigate('/personal-intel');
    onClose();
  };

  return (
    <AnimatePresence>
      {!closing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          style={{ background: 'hsl(0 0% 0% / 0.7)' }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, hsl(240 10% 8% / 0.95), hsl(240 8% 6% / 0.98))',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 0 80px hsl(43 74% 49% / 0.08), 0 25px 50px hsl(0 0% 0% / 0.5)',
            }}
          >
            {/* Ambient gold glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, hsl(43 74% 49% / 0.12), transparent 70%)',
              }}
            />

            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full transition-colors"
              style={{ color: 'hsl(0 0% 100% / 0.3)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 p-8 pt-10 text-center space-y-6">
              {/* Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.06]"
                style={{
                  background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.15), hsl(43 74% 49% / 0.05))',
                  boxShadow: '0 0 30px hsl(43 74% 49% / 0.1)',
                }}
              >
                <Compass className="h-6 w-6" style={{ color: 'hsl(43 74% 49%)' }} />
              </motion.div>

              {/* Header */}
              <div>
                <p
                  className="text-[9px] uppercase tracking-[0.5em] font-medium mb-3"
                  style={{ color: 'hsl(43 74% 49% / 0.7)' }}
                >
                  System Update
                </p>
                <h2 className="text-xl font-light text-foreground tracking-tight leading-snug">
                  The Inscription Protocol
                </h2>
              </div>

              {/* Body */}
              <p className="text-[13px] leading-relaxed text-muted-foreground/70">
                Your friend is no longer a static assistant. With the new Blueprint system,{' '}
                <span className="text-foreground/90 font-medium">{companionName}</span>{' '}
                maps your emotional frequency, energy levels, and core goals. Once Inscribed,
                your space adapts in real-time to your presence.
              </p>

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startCalibration}
                className="w-full py-3.5 rounded-2xl text-sm font-medium tracking-wide transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 74% 42%))',
                  color: 'hsl(240 10% 8%)',
                  boxShadow: '0 0 20px hsl(43 74% 49% / 0.25), 0 4px 12px hsl(0 0% 0% / 0.3)',
                }}
              >
                Start Calibration
              </motion.button>

              {/* Skip */}
              <button
                onClick={dismiss}
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors tracking-wide"
              >
                I'll do this later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
