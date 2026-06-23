import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Star } from "lucide-react";

interface CoinMatchGameProps {
  onComplete: (score: number) => void;
  variant: "playful" | "modern";
}

const COINS = [
  { id: "penny", value: 1, emoji: "🪙", name: "Penny", color: "bg-amber-600" },
  { id: "nickel", value: 5, emoji: "⚪", name: "Nickel", color: "bg-gray-400" },
  { id: "dime", value: 10, emoji: "⚫", name: "Dime", color: "bg-gray-300" },
  { id: "quarter", value: 25, emoji: "🔵", name: "Quarter", color: "bg-gray-500" },
];

export const CoinMatchGame = ({ onComplete, variant }: CoinMatchGameProps) => {
  const isPlayful = variant === "playful";
  const [cards, setCards] = useState<{ id: string; coinId: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  const initGame = () => {
    const gameCards = [...COINS, ...COINS]
      .sort(() => Math.random() - 0.5)
      .map((coin, index) => ({
        id: `${coin.id}-${index}`,
        coinId: coin.id,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(gameCards);
    setFlippedCards([]);
    setScore(0);
    setMoves(0);
    setGameComplete(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (index: number) => {
    if (flippedCards.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].coinId === cards[second].coinId) {
        // Match!
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setScore(s => s + 10);
          setFlippedCards([]);

          // Check if game complete
          if (matchedCards.every(c => c.isMatched)) {
            setGameComplete(true);
            onComplete(score + 10);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const getCoin = (coinId: string) => COINS.find(c => c.id === coinId);

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
          🏆
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-3">Great Job!</h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-4">
          <Star className="h-8 w-8 fill-yellow-400" />
          <span className="text-2xl font-bold">{score} Points</span>
        </div>
        <p className="text-white/60 text-lg mb-8">Completed in {moves} moves</p>
        <Button onClick={initGame} size="lg" className="gap-2 text-lg px-8 py-6 h-auto">
          <RotateCcw className="h-5 w-5" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col max-w-2xl mx-auto w-full">
      {/* Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 text-yellow-400">
          <Trophy className="h-6 w-6" />
          <span className="font-bold text-xl">{score}</span>
        </div>
        <span className="text-white/60 text-lg">Moves: {moves}</span>
      </div>

      {/* Game Grid */}
      <div className="flex-1 grid grid-cols-4 gap-3 content-center">
        {cards.map((card, index) => {
          const coin = getCoin(card.coinId);
          return (
            <motion.button
              key={card.id}
              onClick={() => handleCardClick(index)}
              whileHover={{ scale: card.isMatched ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`aspect-square rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all ${
                card.isMatched
                  ? "bg-green-500/30 border-2 border-green-400"
                  : card.isFlipped
                  ? `${coin?.color} border-2 border-white/50`
                  : isPlayful
                  ? "bg-gradient-to-br from-purple-500 to-pink-500"
                  : "bg-gradient-to-br from-indigo-600 to-violet-600"
              }`}
            >
              <AnimatePresence mode="wait">
                {card.isFlipped || card.isMatched ? (
                  <motion.span
                    key="front"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                  >
                    {coin?.emoji}
                  </motion.span>
                ) : (
                  <motion.span
                    key="back"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: -90 }}
                  >
                    ❓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-white/50 text-base mt-6">
        Match the coins to learn their values!
      </p>
    </div>
  );
};
