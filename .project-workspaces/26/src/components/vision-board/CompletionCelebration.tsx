import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Star, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { triggerFireworks } from '@/lib/confetti';

interface CompletionCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle?: string;
}

export function CompletionCelebration({ isOpen, onClose, itemTitle }: CompletionCelebrationProps) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti when modal opens
      triggerFireworks();
    }
  }, [isOpen]);

  const motivationalMessages = [
    "You're making your dreams come true!",
    "One step closer to your vision!",
    "Your dedication is paying off!",
    "Incredible achievement unlocked!",
    "Dreams do come true when you believe!",
  ];

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-3xl p-1 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-[22px] p-8 text-center relative overflow-hidden">
              {/* Background decorations */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [-20, -40, -20],
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  >
                    <Star className="h-3 w-3 text-yellow-400/60" fill="currentColor" />
                  </motion.div>
                ))}
              </motion.div>

              {/* Trophy Icon */}
              <motion.div
                className="relative z-10 mb-6"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-yellow-500/30">
                  <Trophy className="h-12 w-12 text-white" />
                </div>
                
                {/* Sparkles around trophy */}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Sparkles className="h-8 w-8 text-yellow-300" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-2 -left-2"
                  animate={{ rotate: -360, scale: [1, 1.3, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <PartyPopper className="h-7 w-7 text-pink-400" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-3xl font-bold text-white mb-3 relative z-10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                🎉 Vision Achieved! 🎉
              </motion.h2>

              {/* Item title */}
              {itemTitle && (
                <motion.p
                  className="text-xl font-semibold text-purple-200 mb-4 relative z-10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  "{itemTitle}"
                </motion.p>
              )}

              {/* Motivational message */}
              <motion.p
                className="text-lg text-white/80 mb-8 relative z-10 max-w-sm mx-auto"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {randomMessage}
              </motion.p>

              {/* Close button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-500/30"
                >
                  Continue Dreaming ✨
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
