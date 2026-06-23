import { motion } from "framer-motion";
import { Sparkles, Lock } from "lucide-react";

interface KidCardDisplayProps {
  profile: {
    display_name: string;
    current_balance: number;
    avatar_emoji?: string | null;
  };
  cardTheme: {
    name: string;
    gradient_start: string;
    gradient_end: string;
    icon: string | null;
  } | null;
  variant: "playful" | "modern";
  isLocked?: boolean;
}

export const KidCardDisplay = ({ profile, cardTheme, variant, isLocked = false }: KidCardDisplayProps) => {
  const isPlayful = variant === "playful";
  
  const defaultGradient = isPlayful 
    ? { start: "#8B5CF6", end: "#EC4899" }
    : { start: "#6366F1", end: "#8B5CF6" }; // Indigo to violet for premium teen look

  const gradient = cardTheme 
    ? { start: cardTheme.gradient_start, end: cardTheme.gradient_end }
    : defaultGradient;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateX: -20 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ type: "spring", delay: 0.1 }}
      className="perspective-1000"
    >
      <div
        className="relative w-full aspect-[1.6/1] max-w-sm mx-auto rounded-2xl p-5 shadow-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradient.start}, ${gradient.end})`,
        }}
      >
        {/* Decorative elements */}
        {isPlayful && (
          <>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute top-2 right-8 w-20 h-20 bg-white/20 rounded-full blur-xl"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute bottom-4 left-4 w-24 h-24 bg-white/20 rounded-full blur-xl"
            />
          </>
        )}

        {/* Card content */}
        <div className="relative h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="text-white/80 text-sm font-medium flex items-center gap-1">
              KidsBloom
              {isPlayful && <Sparkles className="h-3 w-3" />}
            </div>
          </div>

          {/* Balance */}
          <div className="text-center">
            <p className="text-white/60 text-xs mb-1">
              {isPlayful ? "Magic Coins" : "Balance"}
            </p>
            {isLocked ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2 text-white/70">
                  <Lock className="h-5 w-5" />
                  <span className="text-xl font-bold tracking-widest">• • • •</span>
                </div>
                <p className="text-white/50 text-xs">
                  {isPlayful ? "Enter PIN to see coins!" : "Enter PIN to view"}
                </p>
              </div>
            ) : (
              <motion.p
                key={profile.current_balance}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-white text-3xl font-bold"
              >
                {isPlayful ? (
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-2xl">🪙</span>
                    {profile.current_balance.toFixed(2)}
                  </span>
                ) : (
                  `$${profile.current_balance.toFixed(2)}`
                )}
              </motion.p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end">
            <div>
              <div className="text-white/50 text-[10px] tracking-widest">
                •••• •••• •••• {Math.floor(1000 + Math.random() * 9000)}
              </div>
              <div className="text-white font-semibold text-sm mt-0.5">
                {profile.display_name.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-5 bg-yellow-300/70 rounded" />
              <div className="w-4 h-4 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
