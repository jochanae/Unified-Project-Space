import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AchievementBadge {
  name: string;
  emoji: string;
  unlocked: boolean;
  description?: string;
}

interface KidAchievementBadgeProps {
  achievement: AchievementBadge;
  index?: number;
}

export function KidAchievementBadge({ achievement, index = 0 }: KidAchievementBadgeProps) {
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);

  // Stagger animation on mount
  useEffect(() => {
    if (achievement.unlocked) {
      const timer = setTimeout(() => {
        setShowUnlockAnimation(true);
        setTimeout(() => setShowUnlockAnimation(false), 1000);
      }, index * 150);
      return () => clearTimeout(timer);
    }
  }, [achievement.unlocked, index]);

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl text-center transition-all duration-300 group',
        achievement.unlocked
          ? 'bg-gradient-to-br from-gold/20 to-gold/10 border-2 border-gold/40 hover:border-gold/60 hover:scale-105 cursor-pointer'
          : 'bg-muted/50 opacity-60 grayscale'
      )}
    >
      {/* Sparkle effects for unlocked */}
      {achievement.unlocked && showUnlockAnimation && (
        <>
          <span className="absolute top-1 left-2 text-xs animate-ping">✨</span>
          <span className="absolute top-2 right-1 text-xs animate-ping delay-100">⭐</span>
          <span className="absolute bottom-1 left-3 text-xs animate-ping delay-200">✨</span>
        </>
      )}

      {/* Locked overlay */}
      {!achievement.unlocked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-2xl opacity-50">🔒</span>
        </div>
      )}

      {/* Emoji */}
      <span 
        className={cn(
          'text-4xl block mb-2 transition-transform',
          achievement.unlocked && 'group-hover:scale-110 group-hover:animate-bounce'
        )}
      >
        {achievement.emoji}
      </span>

      {/* Name */}
      <p className="font-medium text-sm">{achievement.name}</p>

      {/* Status */}
      {achievement.unlocked ? (
        <span className="text-xs text-gain font-medium">✓ Unlocked!</span>
      ) : (
        <span className="text-xs text-muted-foreground">Keep trying!</span>
      )}

      {/* Description tooltip on hover */}
      {achievement.description && achievement.unlocked && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {achievement.description}
          </div>
        </div>
      )}
    </div>
  );
}

interface KidAchievementsGridProps {
  stats: {
    tradesCompleted: number;
    totalProfitLoss: number;
    starsEarned: number;
    winRate: number;
    closedTrades: number;
    totalReturn: number;
    portfolioValue: number;
  };
  lessonsCompleted: number;
}

export function KidAchievementsGrid({ stats, lessonsCompleted }: KidAchievementsGridProps) {
  const achievements: AchievementBadge[] = [
    { 
      name: 'First Steps', 
      emoji: '🎯', 
      unlocked: stats.tradesCompleted >= 1,
      description: 'Complete your first trade'
    },
    { 
      name: 'Getting Started', 
      emoji: '🔥', 
      unlocked: stats.tradesCompleted >= 5,
      description: 'Complete 5 trades'
    },
    { 
      name: 'Money Maker', 
      emoji: '💰', 
      unlocked: stats.totalProfitLoss > 0,
      description: 'Make your first profit'
    },
    { 
      name: 'Star Collector', 
      emoji: '⭐', 
      unlocked: stats.starsEarned >= 3,
      description: 'Earn 3 trading stars'
    },
    { 
      name: 'Winner', 
      emoji: '🏆', 
      unlocked: stats.winRate >= 50 && stats.closedTrades >= 2,
      description: 'Reach 50% win rate'
    },
    { 
      name: 'Growing Rich', 
      emoji: '🌱', 
      unlocked: stats.totalReturn > 5,
      description: 'Grow your money by 5%'
    },
    { 
      name: 'Bookworm', 
      emoji: '📚', 
      unlocked: lessonsCompleted >= 2,
      description: 'Complete 2 lessons'
    },
    { 
      name: 'Lesson Master', 
      emoji: '🎓', 
      unlocked: lessonsCompleted >= 5,
      description: 'Complete 5 lessons'
    },
    { 
      name: 'Big Investor', 
      emoji: '🦈', 
      unlocked: stats.tradesCompleted >= 10,
      description: 'Complete 10 trades'
    },
    { 
      name: 'Short Seller', 
      emoji: '📉', 
      unlocked: lessonsCompleted >= 5,
      description: 'Complete the shorting lesson'
    },
    {
      name: 'Snowball Saver',
      emoji: '⛄',
      unlocked: lessonsCompleted >= 6,
      description: 'Learn about compound interest'
    },
    {
      name: 'Early Bird',
      emoji: '🐦',
      unlocked: lessonsCompleted >= 7,
      description: 'Learn why investing early matters'
    },
    { 
      name: 'Money Wizard', 
      emoji: '🧙', 
      unlocked: stats.portfolioValue >= 1500,
      description: 'Grow to $1,500'
    },
    { 
      name: 'Diamond Hands', 
      emoji: '💎', 
      unlocked: stats.portfolioValue >= 2000,
      description: 'Grow to $2,000'
    },
    { 
      name: 'Future Warren', 
      emoji: '👴', 
      unlocked: stats.winRate >= 70 && stats.closedTrades >= 5,
      description: '70% win rate with 5+ trades'
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {unlockedCount} of {achievements.length} unlocked
        </span>
        <div className="flex gap-1">
          {achievements.map((a, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-2 rounded-full',
                a.unlocked ? 'bg-gold' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {achievements.map((achievement, i) => (
          <KidAchievementBadge
            key={achievement.name}
            achievement={achievement}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
