import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Star, PiggyBank, ShoppingCart, Heart } from "lucide-react";

interface AllowanceSplitterGameProps {
  onComplete: (score: number) => void;
  variant: "playful" | "modern";
}

interface Scenario {
  id: number;
  amount: number;
  description: string;
  emoji: string;
  idealSplit: { save: number; spend: number; give: number };
  tip: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    amount: 10,
    description: "Birthday money from Grandma!",
    emoji: "🎂",
    idealSplit: { save: 5, spend: 4, give: 1 },
    tip: "Saving half of gifts helps build good habits!",
  },
  {
    id: 2,
    amount: 5,
    description: "Allowance for the week",
    emoji: "💵",
    idealSplit: { save: 2, spend: 2, give: 1 },
    tip: "Splitting evenly is a great strategy!",
  },
  {
    id: 3,
    amount: 20,
    description: "You earned money from chores!",
    emoji: "🧹",
    idealSplit: { save: 10, spend: 8, give: 2 },
    tip: "Saving half of what you earn builds wealth!",
  },
  {
    id: 4,
    amount: 15,
    description: "Found money in your jacket!",
    emoji: "🧥",
    idealSplit: { save: 8, spend: 5, give: 2 },
    tip: "Unexpected money is great for saving!",
  },
  {
    id: 5,
    amount: 8,
    description: "Payment for helping neighbor",
    emoji: "🏠",
    idealSplit: { save: 4, spend: 3, give: 1 },
    tip: "Hard work deserves some spending money too!",
  },
];

const BUCKETS = [
  { id: "save", label: "Save", icon: PiggyBank, color: "from-green-400 to-emerald-500", emoji: "🐷" },
  { id: "spend", label: "Spend", icon: ShoppingCart, color: "from-blue-400 to-indigo-500", emoji: "🛒" },
  { id: "give", label: "Give", icon: Heart, color: "from-pink-400 to-rose-500", emoji: "💝" },
];

export const AllowanceSplitterGame = ({ onComplete, variant }: AllowanceSplitterGameProps) => {
  const isPlayful = variant === "playful";
  const [currentScenario, setCurrentScenario] = useState(0);
  const [allocations, setAllocations] = useState({ save: 0, spend: 0, give: 0 });
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [gameComplete, setGameComplete] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    // Shuffle and pick 5 scenarios
    const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 5);
    setScenarios(shuffled);
  }, []);

  const scenario = scenarios[currentScenario];
  const remaining = scenario ? scenario.amount - allocations.save - allocations.spend - allocations.give : 0;

  const adjustAllocation = (bucket: "save" | "spend" | "give", delta: number) => {
    if (!scenario) return;
    
    const newValue = allocations[bucket] + delta;
    if (newValue < 0) return;
    
    const otherBuckets = Object.entries(allocations)
      .filter(([key]) => key !== bucket)
      .reduce((sum, [, val]) => sum + val, 0);
    
    if (newValue + otherBuckets > scenario.amount) return;
    
    setAllocations({ ...allocations, [bucket]: newValue });
  };

  const submitAllocation = () => {
    if (!scenario || remaining > 0) return;
    
    // Calculate score based on how close to ideal split
    const ideal = scenario.idealSplit;
    const saveDiff = Math.abs(allocations.save - ideal.save);
    const spendDiff = Math.abs(allocations.spend - ideal.spend);
    const giveDiff = Math.abs(allocations.give - ideal.give);
    const totalDiff = saveDiff + spendDiff + giveDiff;
    
    let pointsEarned = 0;
    let message = "";
    
    if (totalDiff === 0) {
      pointsEarned = 20;
      message = "Perfect split! 🌟";
    } else if (totalDiff <= 2) {
      pointsEarned = 15;
      message = "Great job! 👏";
    } else if (totalDiff <= 4) {
      pointsEarned = 10;
      message = "Good thinking! 💪";
    } else {
      pointsEarned = 5;
      message = "Nice try! " + scenario.tip;
    }
    
    // Bonus for saving at least 40%
    if (allocations.save >= scenario.amount * 0.4) {
      pointsEarned += 5;
      message += " Bonus for saving!";
    }
    
    // Bonus for giving something
    if (allocations.give > 0) {
      pointsEarned += 3;
    }
    
    setScore(s => s + pointsEarned);
    setFeedbackMessage(message);
    setShowFeedback(true);
    
    setTimeout(() => {
      setShowFeedback(false);
      if (currentScenario < scenarios.length - 1) {
        setCurrentScenario(c => c + 1);
        setAllocations({ save: 0, spend: 0, give: 0 });
      } else {
        setGameComplete(true);
        onComplete(score + pointsEarned);
      }
    }, 2000);
  };

  const resetGame = () => {
    const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 5);
    setScenarios(shuffled);
    setCurrentScenario(0);
    setAllocations({ save: 0, spend: 0, give: 0 });
    setScore(0);
    setShowFeedback(false);
    setGameComplete(false);
  };

  if (scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin text-6xl">💰</div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center h-full p-8"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-[100px] mb-6"
        >
          {score >= 80 ? "🏆" : score >= 50 ? "⭐" : "💪"}
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-3">
          {score >= 80 ? "Money Master!" : score >= 50 ? "Great Saver!" : "Keep Learning!"}
        </h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-6">
          <Star className="h-8 w-8 fill-yellow-400" />
          <span className="text-2xl font-bold">{score} Points</span>
        </div>
        <p className="text-white/60 text-center text-lg mb-8 max-w-sm">
          Remember: Save some, spend some, give some!
        </p>
        <Button onClick={resetGame} size="lg" className="gap-2 text-lg px-8 py-6 h-auto">
          <RotateCcw className="h-5 w-5" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  if (!scenario) return null;

  return (
    <div className="p-6 h-full flex flex-col max-w-lg mx-auto w-full">
      {/* Stats */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 text-yellow-400">
          <Trophy className="h-6 w-6" />
          <span className="font-bold text-xl">{score}</span>
        </div>
        <span className="text-white/60 text-lg">
          {currentScenario + 1}/{scenarios.length}
        </span>
      </div>

      {/* Scenario Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scenario.id}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className={`rounded-2xl p-5 mb-5 ${
            isPlayful
              ? "bg-gradient-to-br from-yellow-400 to-orange-400"
              : "bg-gradient-to-br from-amber-500 to-orange-500"
          }`}
        >
          <div className="flex items-center gap-4">
            <motion.span
              className="text-5xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {scenario.emoji}
            </motion.span>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">{scenario.description}</p>
              <p className="text-white/90 text-3xl font-bold">${scenario.amount}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Remaining indicator */}
      <div className={`text-center mb-5 py-3 rounded-xl text-lg ${
        remaining === 0 
          ? "bg-green-500/20 text-green-400" 
          : "bg-white/10 text-white/80"
      }`}>
        <span className="font-bold">
          {remaining === 0 ? "✓ All money allocated!" : `$${remaining} left to split`}
        </span>
      </div>

      {/* Buckets */}
      <div className="flex-1 space-y-4">
        {BUCKETS.map((bucket) => {
          const value = allocations[bucket.id as keyof typeof allocations];
          
          return (
            <motion.div
              key={bucket.id}
              className={`p-4 rounded-2xl bg-gradient-to-r ${bucket.color}`}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{bucket.emoji}</span>
                  <span className="font-bold text-white text-lg">{bucket.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustAllocation(bucket.id as any, -1)}
                    disabled={value <= 0 || showFeedback}
                    className="h-10 w-10 p-0 text-white hover:bg-white/20 text-xl font-bold rounded-xl"
                  >
                    -
                  </Button>
                  <span className="text-2xl font-bold text-white min-w-[4rem] text-center">
                    ${value}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustAllocation(bucket.id as any, 1)}
                    disabled={remaining <= 0 || showFeedback}
                    className="h-10 w-10 p-0 text-white hover:bg-white/20 text-xl font-bold rounded-xl"
                  >
                    +
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-4 bg-green-500/20 rounded-xl text-green-400 font-bold text-lg mb-4"
          >
            {feedbackMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <Button
        onClick={submitAllocation}
        disabled={remaining > 0 || showFeedback}
        className={`w-full h-14 text-xl font-bold rounded-2xl ${
          remaining === 0
            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            : "bg-gray-500"
        }`}
      >
        {remaining > 0 ? `Split $${remaining} more` : "Submit Split! ✓"}
      </Button>
    </div>
  );
};
