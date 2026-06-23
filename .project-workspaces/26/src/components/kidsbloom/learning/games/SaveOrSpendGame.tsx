import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Star, PiggyBank, ShoppingCart } from "lucide-react";

interface SaveOrSpendGameProps {
  onComplete: (score: number) => void;
  variant: "playful" | "modern";
}

const SCENARIOS = [
  { id: 1, text: "You got $10 for your birthday!", amount: 10, bestChoice: "save", emoji: "🎂" },
  { id: 2, text: "Your favorite snack is on sale!", amount: 2, bestChoice: "spend", emoji: "🍪" },
  { id: 3, text: "You found $5 on the ground!", amount: 5, bestChoice: "save", emoji: "💵" },
  { id: 4, text: "You need new school shoes.", amount: 20, bestChoice: "spend", emoji: "👟" },
  { id: 5, text: "There's a cool new toy at the store.", amount: 15, bestChoice: "save", emoji: "🧸" },
  { id: 6, text: "It's your friend's birthday tomorrow!", amount: 8, bestChoice: "spend", emoji: "🎁" },
  { id: 7, text: "You earned $5 doing chores!", amount: 5, bestChoice: "save", emoji: "🧹" },
  { id: 8, text: "The ice cream truck is here!", amount: 3, bestChoice: "save", emoji: "🍦" },
];

export const SaveOrSpendGame = ({ onComplete, variant }: SaveOrSpendGameProps) => {
  const isPlayful = variant === "playful";
  const [savings, setSavings] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({ show: false, correct: false, message: "" });
  const [gameComplete, setGameComplete] = useState(false);

  const currentScenario = SCENARIOS[currentIndex];

  const handleChoice = (choice: "save" | "spend") => {
    const isOptimal = choice === currentScenario.bestChoice;
    let message = "";
    let pointsEarned = 5; // Base points for playing

    if (choice === "save") {
      setSavings(s => s + currentScenario.amount);
      if (isOptimal) {
        pointsEarned = 15;
        message = "Smart saving! 🐷";
      } else {
        message = "Saving is always good! But sometimes spending is okay too.";
      }
    } else {
      setWallet(w => w + currentScenario.amount);
      if (isOptimal) {
        pointsEarned = 15;
        message = "Good choice! Sometimes we need to spend! 🛒";
      } else {
        message = "Hmm, you could have saved that one! 💭";
      }
    }

    setScore(s => s + pointsEarned);
    setFeedback({ show: true, correct: isOptimal, message });

    setTimeout(() => {
      setFeedback({ show: false, correct: false, message: "" });
      if (currentIndex < SCENARIOS.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setGameComplete(true);
        onComplete(score + pointsEarned);
      }
    }, 1500);
  };

  const resetGame = () => {
    setSavings(0);
    setWallet(0);
    setCurrentIndex(0);
    setScore(0);
    setFeedback({ show: false, correct: false, message: "" });
    setGameComplete(false);
  };

  if (gameComplete) {
    const savingsRatio = savings / (savings + wallet);
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
          {savingsRatio >= 0.5 ? "🐷" : "🛒"}
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {savingsRatio >= 0.6 ? "Super Saver!" : savingsRatio >= 0.4 ? "Balanced Spender!" : "Big Spender!"}
        </h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-4">
          <Star className="h-6 w-6 fill-yellow-400" />
          <span className="text-xl font-bold">{score} Points</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-green-500/20 rounded-xl">
            <PiggyBank className="h-8 w-8 text-green-400 mx-auto mb-1" />
            <p className="text-green-400 font-bold">${savings}</p>
            <p className="text-white/60 text-xs">Saved</p>
          </div>
          <div className="text-center p-3 bg-orange-500/20 rounded-xl">
            <ShoppingCart className="h-8 w-8 text-orange-400 mx-auto mb-1" />
            <p className="text-orange-400 font-bold">${wallet}</p>
            <p className="text-white/60 text-xs">Spent</p>
          </div>
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
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-green-400">
            <PiggyBank className="h-5 w-5" />
            <span className="font-bold">${savings}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-bold">${wallet}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-yellow-400">
          <Trophy className="h-5 w-5" />
          <span className="font-bold">{score}</span>
        </div>
      </div>

      <span className="text-white/60 text-sm text-center mb-2">
        {currentIndex + 1}/{SCENARIOS.length}
      </span>

      {/* Scenario Card */}
      <AnimatePresence mode="wait">
        {!feedback.show ? (
          <motion.div
            key={currentScenario.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className={`flex-1 rounded-2xl p-6 flex flex-col items-center justify-center ${
              isPlayful 
                ? "bg-gradient-to-br from-cyan-400 to-blue-500"
                : "bg-gradient-to-br from-slate-700 to-slate-800"
            }`}
          >
            <motion.span
              className="text-6xl mb-4"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {currentScenario.emoji}
            </motion.span>
            <p className="text-xl font-bold text-white text-center mb-2">{currentScenario.text}</p>
            <p className="text-3xl font-bold text-yellow-300">${currentScenario.amount}</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex-1 rounded-2xl p-6 flex flex-col items-center justify-center ${
              feedback.correct ? "bg-green-500/20" : "bg-orange-500/20"
            }`}
          >
            <motion.span
              className="text-6xl mb-4"
              animate={{ scale: [1, 1.2, 1] }}
            >
              {feedback.correct ? "✅" : "💭"}
            </motion.span>
            <p className="text-white text-center font-medium">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choice Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button
          onClick={() => handleChoice("save")}
          disabled={feedback.show}
          className="h-14 text-lg bg-green-500 hover:bg-green-600 gap-2"
        >
          <PiggyBank className="h-5 w-5" />
          SAVE
        </Button>
        <Button
          onClick={() => handleChoice("spend")}
          disabled={feedback.show}
          className="h-14 text-lg bg-orange-500 hover:bg-orange-600 gap-2"
        >
          <ShoppingCart className="h-5 w-5" />
          SPEND
        </Button>
      </div>
    </div>
  );
};
