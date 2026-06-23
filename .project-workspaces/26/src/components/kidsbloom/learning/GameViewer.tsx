import { useState } from "react";
import { motion } from "framer-motion";
import { X, Lock, Gamepad2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoinMatchGame } from "./games/CoinMatchGame";
import { BudgetBuilderGame } from "./games/BudgetBuilderGame";
import { SaveOrSpendGame } from "./games/SaveOrSpendGame";
import { MoneyMathGame } from "./games/MoneyMathGame";
import { GoalGetterGame } from "./games/GoalGetterGame";
import { AllowanceSplitterGame } from "./games/AllowanceSplitterGame";
import { toast } from "sonner";

interface GameViewerProps {
  game: {
    id: string;
    title: string;
    description: string | null;
    content_url: string | null;
    category: string;
    is_premium: boolean;
  };
  variant: "playful" | "modern";
  onClose: () => void;
}

// Map game titles to built-in games
const BUILT_IN_GAMES: Record<string, string> = {
  // Coin Match variations
  "coin match": "coin-match",
  "coin master": "coin-match",
  "coin counter": "coin-match",
  "coin sorting": "coin-match",
  "money match": "coin-match",
  // Budget Builder variations
  "budget builder": "budget-builder",
  "shop smart": "budget-builder",
  // Save or Spend variations
  "save or spend": "save-or-spend",
  "piggy bank": "save-or-spend",
  "piggy bank stacker": "save-or-spend",
  // Money Math variations
  "money math": "money-math",
  "math quiz": "money-math",
  "money math quiz": "money-math",
  "coin calculator": "money-math",
  // Goal Getter variations
  "goal getter": "goal-getter",
  "goal tracker": "goal-getter",
  "savings goal": "goal-getter",
  "dream saver": "goal-getter",
  // Allowance Splitter variations
  "allowance splitter": "allowance-splitter",
  "split it up": "allowance-splitter",
  "bucket boss": "allowance-splitter",
};

const getBuiltInGameType = (title: string): string | null => {
  const lowerTitle = title.toLowerCase();
  for (const [key, value] of Object.entries(BUILT_IN_GAMES)) {
    if (lowerTitle.includes(key)) {
      return value;
    }
  }
  return null;
};

export const GameViewer = ({ game, variant, onClose }: GameViewerProps) => {
  const isPlayful = variant === "playful";
  const builtInGameType = getBuiltInGameType(game.title);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Check if it's an embeddable game URL
  const isEmbeddable = game.content_url && (
    game.content_url.includes('scratch.mit.edu') ||
    game.content_url.includes('itch.io') ||
    game.content_url.includes('codepen.io') ||
    game.content_url.includes('embed')
  );

  const getGameColor = (category: string) => {
    switch (category) {
      case "basics": return "from-blue-400 to-indigo-500";
      case "budgeting": return "from-green-400 to-emerald-500";
      case "saving": return "from-pink-400 to-rose-500";
      case "spending": return "from-purple-400 to-violet-500";
      case "earning": return "from-yellow-400 to-orange-500";
      default: return "from-cyan-400 to-blue-500";
    }
  };

  const getGameEmoji = (category: string) => {
    switch (category) {
      case "basics": return "🪙";
      case "budgeting": return "📊";
      case "saving": return "🐷";
      case "spending": return "🛒";
      case "earning": return "💼";
      default: return "🎮";
    }
  };

  const handleGameComplete = (score: number) => {
    toast.success(`Game complete! You earned ${score} points! 🎉`);
  };

  const renderGameContent = () => {
    if (game.is_premium) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 p-8">
          <Lock className="h-20 w-20 text-white mb-6" />
          <p className="text-white font-bold text-2xl">Premium Game</p>
          <p className="text-white/80 text-lg mt-3">Complete more lessons to unlock!</p>
        </div>
      );
    }

    if (isEmbeddable && game.content_url) {
      return (
        <iframe
          src={game.content_url}
          title={game.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen
        />
      );
    }

    // Built-in games - show the actual game
    if (builtInGameType && gameStarted) {
      return (
        <div className="w-full h-full">
          {builtInGameType === "coin-match" && (
            <CoinMatchGame onComplete={handleGameComplete} variant={variant} />
          )}
          {builtInGameType === "budget-builder" && (
            <BudgetBuilderGame onComplete={handleGameComplete} variant={variant} />
          )}
          {builtInGameType === "save-or-spend" && (
            <SaveOrSpendGame onComplete={handleGameComplete} variant={variant} />
          )}
          {builtInGameType === "money-math" && (
            <MoneyMathGame onComplete={handleGameComplete} variant={variant} />
          )}
          {builtInGameType === "goal-getter" && (
            <GoalGetterGame onComplete={handleGameComplete} variant={variant} />
          )}
          {builtInGameType === "allowance-splitter" && (
            <AllowanceSplitterGame onComplete={handleGameComplete} variant={variant} />
          )}
        </div>
      );
    }

    // Show start screen for built-in games
    if (builtInGameType) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          <motion.span 
            className="text-[120px] mb-8"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {getGameEmoji(game.category)}
          </motion.span>
          <h2 className="text-3xl font-bold text-white mb-4 text-center">{game.title}</h2>
          <p className="text-white/60 text-center text-lg mb-10 max-w-md">{game.description}</p>
          <Button
            onClick={() => setGameStarted(true)}
            size="lg"
            className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white gap-3 text-xl px-12 py-6 h-auto rounded-2xl shadow-lg shadow-green-500/30"
          >
            <Gamepad2 className="h-7 w-7" />
            Play Now!
          </Button>
        </div>
      );
    }

    // External URL game
    if (game.content_url) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          <motion.span 
            className="text-[120px] mb-8"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            🎮
          </motion.span>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Play?</h2>
          <p className="text-white/60 text-center text-lg mb-10">This game opens in a new window</p>
          <Button
            onClick={() => window.open(game.content_url!, '_blank', 'noopener,noreferrer')}
            size="lg"
            className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white gap-3 text-xl px-12 py-6 h-auto rounded-2xl shadow-lg shadow-green-500/30"
          >
            <Maximize2 className="h-6 w-6" />
            Open Game
          </Button>
        </div>
      );
    }

    // No game available
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <motion.span 
          className="text-[120px] mb-6"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🎮
        </motion.span>
        <h2 className="text-2xl font-bold text-white mb-3">Coming Soon!</h2>
        <p className="text-white/60 text-lg">Check back later for more fun!</p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      {/* Full screen container */}
      <div className={`w-full h-full flex flex-col ${
        isPlayful 
          ? "bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900" 
          : "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      }`}>
        {/* Compact Header */}
        <div className={`p-3 sm:p-4 bg-gradient-to-r ${getGameColor(game.category)} flex-shrink-0 safe-area-top`}>
          <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl sm:text-4xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {getGameEmoji(game.category)}
              </motion.span>
              <div>
                <h2 className="font-bold text-white text-lg sm:text-xl leading-tight">
                  {game.title}
                </h2>
                <p className="text-white/80 text-sm hidden sm:flex items-center gap-1">
                  <Gamepad2 className="h-4 w-4" />
                  Fun & Learn
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12"
            >
              <X className="h-6 w-6 sm:h-7 sm:w-7" />
            </Button>
          </div>
        </div>

        {/* Game Area - Takes remaining space */}
        <div className="flex-1 overflow-auto">
          <div className="h-full max-w-4xl mx-auto w-full">
            {renderGameContent()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
