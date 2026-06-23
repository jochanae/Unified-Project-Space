import { motion } from 'framer-motion';
import { Book, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VisionBoardHeaderProps {
  isUnlimited?: boolean;
}

export function VisionBoardHeader({ isUnlimited = true }: VisionBoardHeaderProps) {
  const { user } = useAuth();
  const rawName = user?.email?.split('@')[0] || 'Your';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-xl mx-auto px-4"
    >
      {/* Decorative stars */}
      <motion.div
        className="absolute -right-2 top-0"
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Sparkles className="h-5 w-5 text-yellow-400 drop-shadow-lg" />
      </motion.div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/20 flex items-center justify-center gap-3">
        {/* Book Icon */}
        <div className="w-7 h-7 rounded-lg bg-pink-400/30 flex items-center justify-center">
          <Book className="w-4 h-4 text-pink-300" />
        </div>

        {/* Title */}
        <h1 className="text-lg md:text-xl font-bold text-white">
          {displayName}'s Vision Board
        </h1>

        {/* Unlimited Badge */}
        {isUnlimited && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 rounded-full border border-amber-400/30">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">Unlimited</span>
          </div>
        )}

        {/* Sparkle */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-4 h-4 text-purple-300" />
        </motion.div>
      </div>
    </motion.div>
  );
}
