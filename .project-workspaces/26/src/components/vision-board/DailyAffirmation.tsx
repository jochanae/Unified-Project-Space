import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const AFFIRMATIONS = [
  "I am worthy of financial abundance and prosperity.",
  "My money works for me, growing every single day.",
  "I attract wealth and success effortlessly.",
  "I am building the life of my dreams, one step at a time.",
  "Every dollar I save brings me closer to my goals.",
  "I deserve the good things that money can provide.",
  "My financial future is bright and full of possibility.",
  "I am grateful for the abundance flowing into my life.",
  "I make wise decisions that grow my wealth.",
  "Today I choose to invest in my dreams.",
  "I am capable of achieving any financial goal I set.",
  "Abundance is my birthright and I claim it now.",
  "I release all fear around money and embrace prosperity.",
  "My vision board is a roadmap to my best life.",
  "I celebrate every step forward, no matter how small.",
];

function getDailyIndex(): number {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return dayOfYear % AFFIRMATIONS.length;
}

export function DailyAffirmation() {
  const [index, setIndex] = useState(getDailyIndex);
  const [shuffleKey, setShuffleKey] = useState(0);

  const affirmation = AFFIRMATIONS[index];

  const shuffle = () => {
    let next: number;
    do {
      next = Math.floor(Math.random() * AFFIRMATIONS.length);
    } while (next === index);
    setIndex(next);
    setShuffleKey(k => k + 1);
  };

  return (
    <div className="mt-4 flex items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.p
          key={shuffleKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="text-white text-sm md:text-base font-light tracking-wide italic"
          style={{
            textShadow:
              '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
          }}
        >
          "{affirmation}"
        </motion.p>
      </AnimatePresence>
      <button
        onClick={shuffle}
        className="text-white/50 hover:text-white/80 transition-colors shrink-0"
        title="New affirmation"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
