import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface AchievementBadgesProps {
  totalEarned: number;
  totalSaved: number;
  streakDays: number;
  variant?: "playful" | "modern";
}

interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export function AchievementBadges({
  totalEarned,
  totalSaved,
  streakDays,
  variant = "playful",
}: AchievementBadgesProps) {
  const isPlayful = variant === "playful";

  const badges: Badge[] = [
    {
      id: "first_save",
      emoji: "🐷",
      title: isPlayful ? "Piggy Pal" : "First Save",
      description: isPlayful ? "Save your first dollar!" : "Make your first deposit",
      unlocked: totalSaved >= 1,
      progress: Math.min(totalSaved, 1),
      maxProgress: 1,
    },
    {
      id: "super_saver",
      emoji: "🦸",
      title: isPlayful ? "Super Saver" : "Savings Hero",
      description: isPlayful ? "Save $50 total!" : "Save $50",
      unlocked: totalSaved >= 50,
      progress: Math.min(totalSaved, 50),
      maxProgress: 50,
    },
    {
      id: "money_master",
      emoji: "💰",
      title: isPlayful ? "Money Master" : "Earnings Champion",
      description: isPlayful ? "Earn $100 total!" : "Earn $100",
      unlocked: totalEarned >= 100,
      progress: Math.min(totalEarned, 100),
      maxProgress: 100,
    },
    {
      id: "streak_star",
      emoji: "🔥",
      title: isPlayful ? "Streak Star" : "7 Day Streak",
      description: isPlayful ? "Log in 7 days in a row!" : "Maintain a 7-day streak",
      unlocked: streakDays >= 7,
      progress: Math.min(streakDays, 7),
      maxProgress: 7,
    },
    {
      id: "dedication",
      emoji: "⭐",
      title: isPlayful ? "Super Star" : "30 Day Champion",
      description: isPlayful ? "30 day streak! Wow!" : "30-day activity streak",
      unlocked: streakDays >= 30,
      progress: Math.min(streakDays, 30),
      maxProgress: 30,
    },
    {
      id: "wealthy",
      emoji: "👑",
      title: isPlayful ? "Money King" : "Financial Master",
      description: isPlayful ? "Save $200 total!" : "Save $200",
      unlocked: totalSaved >= 200,
      progress: Math.min(totalSaved, 200),
      maxProgress: 200,
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${
        isPlayful
          ? "bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-300"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold ${isPlayful ? "text-orange-600" : "text-white"}`}>
          {isPlayful ? "🏆 My Badges" : "Achievements"}
        </h3>
        <span
          className={`text-sm px-2 py-0.5 rounded-full ${
            isPlayful ? "bg-orange-200 text-orange-700" : "bg-white/10 text-white/70"
          }`}
        >
          {unlockedCount}/{badges.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
              badge.unlocked
                ? isPlayful
                  ? "bg-white shadow-lg"
                  : "bg-violet-600/30"
                : isPlayful
                ? "bg-gray-100"
                : "bg-white/5"
            }`}
          >
            <div className="relative">
              <span
                className={`text-2xl ${badge.unlocked ? "" : "grayscale opacity-40"}`}
              >
                {badge.emoji}
              </span>
              {!badge.unlocked && (
                <Lock
                  className={`absolute -bottom-1 -right-1 h-3 w-3 ${
                    isPlayful ? "text-gray-400" : "text-white/30"
                  }`}
                />
              )}
            </div>
            <p
              className={`text-[10px] font-medium text-center mt-1 leading-tight ${
                badge.unlocked
                  ? isPlayful
                    ? "text-orange-600"
                    : "text-white"
                  : isPlayful
                  ? "text-gray-400"
                  : "text-white/30"
              }`}
            >
              {badge.title}
            </p>
            {!badge.unlocked && badge.progress !== undefined && badge.maxProgress && (
              <div className="w-full mt-1.5">
                <div
                  className={`h-1 rounded-full ${
                    isPlayful ? "bg-gray-200" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${
                      isPlayful ? "bg-orange-400" : "bg-violet-500"
                    }`}
                    style={{
                      width: `${(badge.progress / badge.maxProgress) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
