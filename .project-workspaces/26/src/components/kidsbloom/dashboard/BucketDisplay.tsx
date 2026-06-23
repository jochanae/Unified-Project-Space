import { motion } from "framer-motion";
import { CreditCard, PiggyBank, Heart } from "lucide-react";

interface BucketDisplayProps {
  spendBalance: number;
  saveBalance: number;
  giveBalance: number;
  variant: "playful" | "modern";
  isDarkMode?: boolean;
}

export const BucketDisplay = ({ spendBalance, saveBalance, giveBalance, variant, isDarkMode = false }: BucketDisplayProps) => {
  const isPlayful = variant === "playful";

  const buckets = [
    {
      label: isPlayful ? "Spend 💳" : "Spend",
      value: spendBalance,
      icon: CreditCard,
      color: isPlayful ? "text-purple-500" : "text-purple-400",
      bg: isPlayful ? "bg-purple-100" : "bg-purple-500/20",
      emoji: "💳",
      description: isPlayful ? "Ready to use!" : "Available to spend",
    },
    {
      label: isPlayful ? "Save 🐷" : "Save",
      value: saveBalance,
      icon: PiggyBank,
      color: isPlayful ? "text-emerald-500" : "text-emerald-400",
      bg: isPlayful ? "bg-emerald-100" : "bg-emerald-500/20",
      emoji: "🐷",
      description: isPlayful ? "Safe & sound!" : "Locked savings",
    },
    {
      label: isPlayful ? "Give 💝" : "Give",
      value: giveBalance,
      icon: Heart,
      color: isPlayful ? "text-pink-500" : "text-pink-400",
      bg: isPlayful ? "bg-pink-100" : "bg-pink-500/20",
      emoji: "💝",
      description: isPlayful ? "For sharing!" : "For charity",
    },
  ];

  const getContainerStyle = () => {
    if (isPlayful) return "bg-white/80 backdrop-blur-sm shadow-lg";
    if (isDarkMode) return "bg-white/5 backdrop-blur-sm border border-white/10";
    return "bg-white/90 backdrop-blur-sm shadow-lg border border-emerald-100";
  };

  const getHeaderTextStyle = () => {
    if (isPlayful) return "text-gray-600";
    if (isDarkMode) return "text-white/70";
    return "text-emerald-700";
  };

  const getCardStyle = () => {
    if (isPlayful) return "bg-white shadow-sm";
    if (isDarkMode) return "bg-white/5";
    return "bg-white shadow-sm";
  };

  const getLabelStyle = () => {
    if (isPlayful) return "text-gray-600";
    if (isDarkMode) return "text-white/70";
    return "text-slate-700";
  };

  const getDescriptionStyle = () => {
    if (isPlayful) return "text-gray-500";
    if (isDarkMode) return "text-white/50";
    return "text-slate-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${getContainerStyle()}`}
    >
      <h3 className={`text-sm font-semibold mb-3 ${getHeaderTextStyle()}`}>
        {isPlayful ? "My Money Buckets 🪣" : "Money Buckets"}
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {buckets.map((bucket, index) => (
          <motion.div
            key={bucket.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.1 }}
            className={`text-center p-3 rounded-xl ${getCardStyle()}`}
          >
            <div className={`w-12 h-12 rounded-xl ${bucket.bg} flex items-center justify-center mx-auto mb-2`}>
              {isPlayful ? (
                <span className="text-2xl">{bucket.emoji}</span>
              ) : (
                <bucket.icon className={`h-6 w-6 ${bucket.color}`} />
              )}
            </div>
            <p className={`text-xs font-medium ${getLabelStyle()}`}>
              {bucket.label}
            </p>
            <p className={`text-xl font-bold ${bucket.color}`}>
              ${bucket.value.toFixed(2)}
            </p>
            <p className={`text-[10px] mt-1 ${getDescriptionStyle()}`}>
              {bucket.description}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
