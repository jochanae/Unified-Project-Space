import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Star, Calculator, CheckCircle, XCircle } from "lucide-react";

interface MoneyMathGameProps {
  onComplete: (score: number) => void;
  variant: "playful" | "modern";
}

type Operation = "+" | "-";

interface Question {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
  emoji: string;
}

const EMOJIS = ["💵", "🪙", "💰", "🐷", "🏦", "💳", "🎯", "⭐"];

const generateQuestion = (level: number): Question => {
  const maxNum = Math.min(10 + level * 5, 50);
  const operations: Operation[] = ["+", "-"];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1 = Math.floor(Math.random() * maxNum) + 1;
  let num2 = Math.floor(Math.random() * maxNum) + 1;
  
  // Ensure subtraction doesn't go negative for younger kids
  if (operation === "-" && num2 > num1) {
    [num1, num2] = [num2, num1];
  }
  
  const answer = operation === "+" ? num1 + num2 : num1 - num2;
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  
  return { num1, num2, operation, answer, emoji };
};

const generateOptions = (correctAnswer: number): number[] => {
  const options = [correctAnswer];
  while (options.length < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const option = Math.max(0, correctAnswer + offset);
    if (!options.includes(option) && option !== correctAnswer) {
      options.push(option);
    }
  }
  return options.sort(() => Math.random() - 0.5);
};

export const MoneyMathGame = ({ onComplete, variant }: MoneyMathGameProps) => {
  const isPlayful = variant === "playful";
  const [question, setQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean } | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const TOTAL_QUESTIONS = 10;

  const nextQuestion = () => {
    const newQuestion = generateQuestion(level);
    setQuestion(newQuestion);
    setOptions(generateOptions(newQuestion.answer));
    setFeedback(null);
  };

  useEffect(() => {
    nextQuestion();
  }, []);

  useEffect(() => {
    if (gameComplete || feedback?.show) return;
    
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameComplete(true);
          onComplete(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameComplete, feedback?.show, score, onComplete]);

  const handleAnswer = (selectedAnswer: number) => {
    if (feedback?.show || !question) return;

    const isCorrect = selectedAnswer === question.answer;
    
    if (isCorrect) {
      const points = 10 + streak * 2;
      setScore(s => s + points);
      setStreak(s => s + 1);
      if (streak > 0 && streak % 3 === 0) {
        setLevel(l => Math.min(l + 1, 5));
      }
    } else {
      setStreak(0);
    }

    setFeedback({ show: true, correct: isCorrect });
    setQuestionsAnswered(q => q + 1);

    setTimeout(() => {
      if (questionsAnswered + 1 >= TOTAL_QUESTIONS) {
        setGameComplete(true);
        onComplete(score + (isCorrect ? 10 + streak * 2 : 0));
      } else {
        nextQuestion();
      }
    }, 1000);
  };

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    setLevel(1);
    setQuestionsAnswered(0);
    setTimeLeft(60);
    setGameComplete(false);
    nextQuestion();
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
          {score >= 80 ? "🏆" : score >= 50 ? "🌟" : "💪"}
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {score >= 80 ? "Math Master!" : score >= 50 ? "Great Job!" : "Keep Practicing!"}
        </h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-4">
          <Star className="h-6 w-6 fill-yellow-400" />
          <span className="text-xl font-bold">{score} Points</span>
        </div>
        <p className="text-white/60 mb-2">Level Reached: {level}</p>
        <p className="text-white/60 mb-6">Best Streak: {streak}</p>
        <Button onClick={resetGame} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  if (!question) return null;

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Stats Bar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-yellow-400">
            <Trophy className="h-5 w-5" />
            <span className="font-bold">{score}</span>
          </div>
          <div className="text-white/60 text-sm">
            🔥 {streak}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">Lv.{level}</span>
          <div className={`px-2 py-1 rounded-full text-sm font-bold ${
            timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"
          }`}>
            ⏱️ {timeLeft}s
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${(questionsAnswered / TOTAL_QUESTIONS) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionsAnswered}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className={`flex-1 rounded-2xl p-6 flex flex-col items-center justify-center ${
            feedback?.show
              ? feedback.correct
                ? "bg-green-500/20"
                : "bg-red-500/20"
              : isPlayful
              ? "bg-gradient-to-br from-purple-500 to-pink-500"
              : "bg-gradient-to-br from-indigo-600 to-violet-600"
          }`}
        >
          {feedback?.show ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              {feedback.correct ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-2" />
                  <p className="text-xl text-white font-bold">Correct! 🎉</p>
                </>
              ) : (
                <>
                  <XCircle className="h-16 w-16 text-red-400 mx-auto mb-2" />
                  <p className="text-xl text-white font-bold">The answer was {question.answer}</p>
                </>
              )}
            </motion.div>
          ) : (
            <>
              <motion.span
                className="text-5xl mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {question.emoji}
              </motion.span>
              <div className="flex items-center gap-3 text-4xl font-bold text-white mb-2">
                <span>${question.num1}</span>
                <span className="text-yellow-300">{question.operation}</span>
                <span>${question.num2}</span>
                <span>=</span>
                <span className="text-yellow-300">?</span>
              </div>
              <p className="text-white/60 text-sm">
                {question.operation === "+" ? "Add the amounts!" : "Find the difference!"}
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {options.map((option, index) => (
          <Button
            key={`${questionsAnswered}-${index}`}
            onClick={() => handleAnswer(option)}
            disabled={feedback?.show}
            className={`h-14 text-xl font-bold ${
              isPlayful
                ? "bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500"
                : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600"
            }`}
          >
            ${option}
          </Button>
        ))}
      </div>
    </div>
  );
};
