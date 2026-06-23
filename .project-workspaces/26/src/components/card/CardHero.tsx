import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardHeroProps {
  balance: number;
  cardNumber: string;
  cardHolder: string;
  gradientStart: string;
  gradientEnd: string;
  isLocked: boolean;
  showBalance: boolean;
  onToggleBalance: () => void;
}

export const CardHero = ({
  balance,
  cardNumber,
  cardHolder,
  gradientStart,
  gradientEnd,
  isLocked,
  showBalance,
  onToggleBalance,
}: CardHeroProps) => {
  return (
    <div className="space-y-4">
      {/* Balance Display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <div className="flex items-center gap-2">
            <h2 className="text-4xl font-bold">
              {showBalance ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "••••••"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleBalance}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Card Visual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, rotateY: 5 }}
        transition={{ duration: 0.3 }}
        className="relative w-full aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
          filter: isLocked ? "grayscale(0.5)" : "none",
        }}
      >
        {/* Locked Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-white/20 backdrop-blur rounded-full p-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
        )}

        {/* Card chip */}
        <div className="absolute top-8 left-6">
          <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-inner" />
        </div>

        {/* Contactless icon */}
        <div className="absolute top-8 left-20">
          <svg className="w-8 h-8 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8.5 14.5A4 4 0 0 1 8 12c0-1.5.5-2.5 1.5-3.5" />
            <path d="M12 18a8 8 0 0 1-2-5c0-2 1-4 3-6" />
            <path d="M16 20c-1-2-2-5-2-8 0-2.5 1-5 3-7" />
          </svg>
        </div>

        {/* Card number */}
        <div className="absolute bottom-20 left-6 right-6">
          <div className="flex gap-4 text-white/90 font-mono text-lg tracking-wider">
            <span>••••</span>
            <span>••••</span>
            <span>••••</span>
            <span>{cardNumber}</span>
          </div>
        </div>

        {/* Card holder name */}
        <div className="absolute bottom-8 left-6">
          <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Card Holder</p>
          <p className="text-white font-medium tracking-wide uppercase">
            {cardHolder || "CARD HOLDER"}
          </p>
        </div>

        {/* Logo */}
        <div className="absolute bottom-8 right-6">
          <div className="text-white font-display font-bold text-lg">
            CoinsBloom
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-white/5" />
      </motion.div>
    </div>
  );
};
