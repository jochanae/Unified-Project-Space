import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Star, Target, Coins, ArrowUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GoalGetterGameProps {
  onComplete: (score: number) => void;
  variant: "playful" | "modern";
}

interface Goal {
  id: number;
  name: string;
  emoji: string;
  target: number;
  color: string;
}

interface EarningOption {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  time: number; // time units it takes
}

const GOALS: Goal[] = [
  { id: 1, name: "New Toy", emoji: "🧸", target: 25, color: "from-pink-400 to-rose-500" },
  { id: 2, name: "Video Game", emoji: "🎮", target: 50, color: "from-purple-400 to-indigo-500" },
  { id: 3, name: "Bike", emoji: "🚲", target: 100, color: "from-green-400 to-emerald-500" },
  { id: 4, name: "Tablet", emoji: "📱", target: 200, color: "from-blue-400 to-cyan-500" },
];

const EARNING_OPTIONS: EarningOption[] = [
  { id: "chores", name: "Do Chores", emoji: "🧹", amount: 5, time: 1 },
  { id: "lemonade", name: "Lemonade Stand", emoji: "🍋", amount: 10, time: 2 },
  { id: "petcare", name: "Pet Sitting", emoji: "🐕", amount: 15, time: 2 },
  { id: "yardwork", name: "Yard Work", emoji: "🌱", amount: 20, time: 3 },
  { id: "save", name: "Save Allowance", emoji: "💰", amount: 8, time: 1 },
];

export const GoalGetterGame = ({ onComplete, variant }: GoalGetterGameProps) => {
  const isPlayful = variant === "playful";
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [savedAmount, setSavedAmount] = useState(0);
  const [timeUnits, setTimeUnits] = useState(0);
  const [score, setScore] = useState(0);
  const [goalsCompleted, setGoalsCompleted] = useState(0);
  const [showEarning, setShowEarning] = useState<EarningOption | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [phase, setPhase] = useState<"choose" | "earning" | "complete">("choose");

  const currentGoal = GOALS[currentGoalIndex];
  const progress = Math.min((savedAmount / currentGoal.target) * 100, 100);

  const handleEarn = (option: EarningOption) => {
    setShowEarning(option);
    setPhase("earning");
    
    setTimeout(() => {
      setSavedAmount(s => s + option.amount);
      setTimeUnits(t => t + option.time);
      setScore(s => s + option.amount);
      setShowEarning(null);
      setPhase("choose");
    }, 1500);
  };

  useEffect(() => {
    if (savedAmount >= currentGoal.target && phase === "choose") {
      setPhase("complete");
      const bonus = Math.max(0, 50 - timeUnits * 2); // Bonus for being efficient
      setScore(s => s + bonus + 25);
      setGoalsCompleted(g => g + 1);
      
      setTimeout(() => {
        if (currentGoalIndex < GOALS.length - 1) {
          setCurrentGoalIndex(i => i + 1);
          setSavedAmount(0);
          setTimeUnits(0);
          setPhase("choose");
        } else {
          setGameComplete(true);
          onComplete(score + bonus + 25);
        }
      }, 2500);
    }
  }, [savedAmount, currentGoal.target, phase, currentGoalIndex, score, onComplete, timeUnits]);

  const resetGame = () => {
    setCurrentGoalIndex(0);
    setSavedAmount(0);
    setTimeUnits(0);
    setScore(0);
    setGoalsCompleted(0);
    setShowEarning(null);
    setGameComplete(false);
    setPhase("choose");
  };

  if (gameComplete) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center h-full p-6"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          🏆
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Goal Getter Champion!</h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-4">
          <Star className="h-6 w-6 fill-yellow-400" />
          <span className="text-xl font-bold">{score} Points</span>
        </div>
        <p className="text-white/60 mb-2">Goals Completed: {goalsCompleted}</p>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {GOALS.slice(0, goalsCompleted).map(goal => (
            <span key={goal.id} className="text-3xl">{goal.emoji}</span>
          ))}
        </div>
        <Button onClick={resetGame} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Stats Bar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-yellow-400">
          <Trophy className="h-5 w-5" />
          <span className="font-bold">{score}</span>
        </div>
        <div className="flex items-center gap-1 text-white/60 text-sm">
          <Target className="h-4 w-4" />
          {currentGoalIndex + 1}/{GOALS.length}
        </div>
      </div>

      {/* Goal Card */}
      <motion.div
        className={`rounded-2xl p-4 bg-gradient-to-br ${currentGoal.color} mb-4`}
        layout
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.span
            className="text-4xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {currentGoal.emoji}
          </motion.span>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">{currentGoal.name}</h3>
            <p className="text-white/80 text-sm">Target: ${currentGoal.target}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">${savedAmount}</p>
            <p className="text-white/60 text-xs">saved</p>
          </div>
        </div>
        <Progress value={progress} className="h-3 bg-white/20" />
        <p className="text-white/80 text-xs mt-1 text-center">
          ${currentGoal.target - savedAmount} to go!
        </p>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-center py-8"
            >
              <motion.span
                className="text-7xl block mb-4"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 0.5 }}
              >
                🎉
              </motion.span>
              <h3 className="text-xl font-bold text-white">Goal Reached!</h3>
              <p className="text-white/60">You saved up for the {currentGoal.name}!</p>
            </motion.div>
          )}

          {phase === "earning" && showEarning && (
            <motion.div
              key="earning"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-center py-8"
            >
              <motion.span
                className="text-6xl block mb-4"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                {showEarning.emoji}
              </motion.span>
              <h3 className="text-xl font-bold text-white mb-2">{showEarning.name}</h3>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center gap-2 text-green-400"
              >
                <ArrowUp className="h-5 w-5" />
                <span className="text-2xl font-bold">+${showEarning.amount}</span>
              </motion.div>
            </motion.div>
          )}

          {phase === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className={`text-center mb-3 ${isPlayful ? "text-purple-600" : "text-white/60"}`}>
                {isPlayful ? "How will you earn money? 💪" : "Choose how to earn"}
              </p>
              <div className="space-y-2">
                {EARNING_OPTIONS.map((option) => (
                  <motion.button
                    key={option.id}
                    onClick={() => handleEarn(option)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 ${
                      isPlayful
                        ? "bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${isPlayful ? "text-purple-700" : "text-white"}`}>
                        {option.name}
                      </p>
                      <p className={`text-xs ${isPlayful ? "text-purple-500" : "text-white/60"}`}>
                        {option.time} time unit{option.time > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-green-500 font-bold">
                      <Coins className="h-4 w-4" />
                      +${option.amount}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
