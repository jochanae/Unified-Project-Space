import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Trophy, RotateCcw, Star } from "lucide-react";

interface BudgetBuilderGameProps {
  onComplete: (score: number) => void;
  variant: "playful" | "modern";
}

const ITEMS = [
  { id: 1, name: "New Video Game", price: 50, emoji: "🎮", isNeed: false },
  { id: 2, name: "School Lunch", price: 5, emoji: "🍎", isNeed: true },
  { id: 3, name: "Toy Car", price: 15, emoji: "🚗", isNeed: false },
  { id: 4, name: "School Supplies", price: 10, emoji: "📚", isNeed: true },
  { id: 5, name: "Ice Cream", price: 3, emoji: "🍦", isNeed: false },
  { id: 6, name: "Bus Fare", price: 2, emoji: "🚌", isNeed: true },
  { id: 7, name: "Comic Book", price: 8, emoji: "📖", isNeed: false },
  { id: 8, name: "Medicine", price: 12, emoji: "💊", isNeed: true },
];

export const BudgetBuilderGame = ({ onComplete, variant }: BudgetBuilderGameProps) => {
  const isPlayful = variant === "playful";
  const [budget] = useState(30);
  const [spent, setSpent] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; item: typeof ITEMS[0] }[]>([]);
  const [gameComplete, setGameComplete] = useState(false);

  const currentItem = ITEMS[currentIndex];

  const handleChoice = (choice: "need" | "want") => {
    const isCorrect = (choice === "need") === currentItem.isNeed;
    const canAfford = spent + currentItem.price <= budget;
    
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = 10;
      if (currentItem.isNeed && canAfford) {
        setSpent(s => s + currentItem.price);
        pointsEarned += 5;
      }
    }
    
    setScore(s => s + pointsEarned);
    setAnswers([...answers, { correct: isCorrect, item: currentItem }]);

    if (currentIndex < ITEMS.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setGameComplete(true);
      onComplete(score + pointsEarned);
    }
  };

  const resetGame = () => {
    setSpent(0);
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setGameComplete(false);
  };

  if (gameComplete) {
    const correctCount = answers.filter(a => a.correct).length;
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
          {correctCount >= 6 ? "🏆" : correctCount >= 4 ? "⭐" : "💪"}
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-3">
          {correctCount >= 6 ? "Budget Master!" : correctCount >= 4 ? "Great Job!" : "Keep Practicing!"}
        </h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-3">
          <Star className="h-8 w-8 fill-yellow-400" />
          <span className="text-2xl font-bold">{score} Points</span>
        </div>
        <p className="text-white/60 text-lg mb-2">{correctCount}/{ITEMS.length} correct answers</p>
        <p className="text-green-400 mb-8">
          Spent ${spent} of ${budget} budget
        </p>
        <Button onClick={resetGame} size="lg" className="gap-2 text-lg px-8 py-6 h-auto">
          <RotateCcw className="h-5 w-5" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col max-w-lg mx-auto w-full">
      {/* Budget Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-base mb-2">
          <span className="text-white/60">Budget</span>
          <span className="text-white font-bold text-lg">${budget - spent} left</span>
        </div>
        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
            initial={{ width: "100%" }}
            animate={{ width: `${((budget - spent) / budget) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 text-yellow-400">
          <Trophy className="h-6 w-6" />
          <span className="font-bold text-xl">{score}</span>
        </div>
        <span className="text-white/60 text-lg">
          {currentIndex + 1}/{ITEMS.length}
        </span>
      </div>

      {/* Item Card */}
      <motion.div
        key={currentItem.id}
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`flex-1 rounded-3xl p-8 flex flex-col items-center justify-center ${
          isPlayful 
            ? "bg-gradient-to-br from-purple-500 to-pink-500"
            : "bg-gradient-to-br from-indigo-600 to-violet-600"
        }`}
      >
        <motion.span
          className="text-[80px] mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {currentItem.emoji}
        </motion.span>
        <h3 className="text-2xl font-bold text-white mb-3">{currentItem.name}</h3>
        <p className="text-3xl font-bold text-yellow-300">${currentItem.price}</p>
      </motion.div>

      {/* Question */}
      <p className="text-center text-white/80 my-6 font-medium text-lg">
        Is this a NEED or a WANT?
      </p>

      {/* Choice Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => handleChoice("need")}
          className="h-16 text-xl bg-green-500 hover:bg-green-600 gap-3 rounded-2xl"
        >
          <Check className="h-6 w-6" />
          NEED
        </Button>
        <Button
          onClick={() => handleChoice("want")}
          className="h-16 text-xl bg-orange-500 hover:bg-orange-600 gap-3 rounded-2xl"
        >
          <X className="h-6 w-6" />
          WANT
        </Button>
      </div>
    </div>
  );
};
