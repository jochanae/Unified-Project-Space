import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { AllowanceRequest } from "./AllowanceRequest";

interface BalanceOverviewProps {
  balance: number;
  earned: number;
  spent: number;
  saved: number;
  variant: "playful" | "modern";
  kidId: string;
}

export const BalanceOverview = ({ balance, earned, spent, saved, variant, kidId }: BalanceOverviewProps) => {
  const isPlayful = variant === "playful";

  const stats = [
    {
      label: isPlayful ? "Earned 🌟" : "Total Earned",
      value: earned,
      icon: TrendingUp,
      color: isPlayful ? "text-green-500" : "text-emerald-400",
      bg: isPlayful ? "bg-green-100" : "bg-emerald-500/20",
      emoji: "💰",
    },
    {
      label: isPlayful ? "Spent 🛍️" : "Total Spent",
      value: spent,
      icon: TrendingDown,
      color: isPlayful ? "text-pink-500" : "text-rose-400",
      bg: isPlayful ? "bg-pink-100" : "bg-rose-500/20",
      emoji: "🛒",
    },
    {
      label: isPlayful ? "Saved 🐷" : "Total Saved",
      value: saved,
      icon: PiggyBank,
      color: isPlayful ? "text-blue-500" : "text-blue-400",
      bg: isPlayful ? "bg-blue-100" : "bg-blue-500/20",
      emoji: "🏦",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${
        isPlayful 
          ? "bg-white/80 backdrop-blur-sm shadow-lg" 
          : "bg-white/5 backdrop-blur-sm border border-white/10"
      }`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="text-center"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
              {isPlayful ? (
                <span className="text-xl">{stat.emoji}</span>
              ) : (
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              )}
            </div>
            <p className={`text-xs font-medium ${isPlayful ? "text-gray-600" : "text-white/70"}`}>
              {stat.label}
            </p>
            <p className={`text-lg font-bold ${isPlayful ? stat.color : "text-white"}`}>
              {isPlayful ? stat.value.toFixed(0) : `$${stat.value.toFixed(2)}`}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Allowance Row */}
      <AllowanceRequest kidId={kidId} variant={variant} />
    </motion.div>
  );
};
