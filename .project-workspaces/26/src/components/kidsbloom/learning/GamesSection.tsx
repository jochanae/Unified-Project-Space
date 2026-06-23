import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Star, Lock, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { GameViewer } from "./GameViewer";
import { toast } from "sonner";

interface GamesSectionProps {
  variant: "playful" | "modern";
}

interface Game {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  category: string;
  is_premium: boolean;
}

const getGameEmoji = (category: string, index: number) => {
  const emojis = {
    basics: ["🪙", "🎴", "💰"],
    budgeting: ["📊", "🏠", "💵"],
    saving: ["🐷", "🎯", "⭐"],
    spending: ["🛒", "🏪", "🛍️"],
    earning: ["💼", "🚀", "🎮"],
  };
  const categoryEmojis = emojis[category as keyof typeof emojis] || ["🎮", "🎯", "⭐"];
  return categoryEmojis[index % categoryEmojis.length];
};

const getGameColor = (category: string, index: number) => {
  const colors = [
    "from-yellow-400 to-orange-400",
    "from-pink-400 to-purple-400",
    "from-green-400 to-teal-400",
    "from-blue-400 to-indigo-400",
    "from-amber-400 to-red-400",
    "from-violet-400 to-fuchsia-400",
  ];
  return colors[index % colors.length];
};

export const GamesSection = ({ variant }: GamesSectionProps) => {
  const isPlayful = variant === "playful";
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      const { data, error } = await supabase
        .from("learning_content")
        .select("id, title, description, content_url, category, is_premium")
        .eq("type", "game")
        .in("age_group", ["kids", "teens"])
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data) {
        const uniqueGames = Array.from(new Map(data.map((g) => [g.title, g])).values());
        setGames(uniqueGames);
      }
      setIsLoading(false);
    };

    fetchGames();
  }, []);

  const handlePlayGame = (game: Game) => {
    if (game.is_premium) {
      toast.info(isPlayful ? "Keep learning to unlock! 🔓" : "Complete more lessons to unlock");
      return;
    }
    setSelectedGame(game);
  };

  const handleCloseGame = () => {
    setSelectedGame(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-2xl">🎮</div>
      </div>
    );
  }

  const unlockedCount = games.filter(g => !g.is_premium).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`font-bold ${isPlayful ? "text-orange-600" : "text-white"}`}>
          {isPlayful ? "Fun Games! 🎮" : "Learning Games"}
        </h3>
        <div className="flex items-center gap-1">
          <Trophy className={`h-4 w-4 ${isPlayful ? "text-yellow-500" : "text-yellow-400"}`} />
          <span className={`text-sm font-bold ${isPlayful ? "text-orange-600" : "text-white"}`}>
            {unlockedCount}/{games.length}
          </span>
        </div>
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer overflow-hidden ${game.is_premium ? "opacity-60" : ""}`}
                onClick={() => handlePlayGame(game)}
              >
                <div className={`h-24 bg-gradient-to-br ${getGameColor(game.category, index)} flex items-center justify-center relative`}>
                  <motion.span
                    className="text-4xl"
                    animate={!game.is_premium ? { rotate: [0, 10, -10, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {getGameEmoji(game.category, index)}
                  </motion.span>
                  {game.is_premium && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <CardContent className={`p-3 ${isPlayful ? "bg-white" : "bg-white/5"}`}>
                  <p className={`font-bold text-sm ${isPlayful ? "text-gray-800" : "text-white"}`}>
                    {game.title}
                  </p>
                  <p className={`text-xs ${isPlayful ? "text-gray-500" : "text-white/60"}`}>
                    {game.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 rounded-xl ${isPlayful ? "bg-orange-50" : "bg-white/5"}`}>
          <span className="text-4xl">🎮</span>
          <p className={`mt-2 ${isPlayful ? "text-orange-500" : "text-white/60"}`}>
            {isPlayful ? "No games yet! Check back soon!" : "No games available"}
          </p>
        </div>
      )}

      {/* Game Viewer Modal */}
      <AnimatePresence>
        {selectedGame && (
          <GameViewer
            game={selectedGame}
            variant={variant}
            onClose={handleCloseGame}
          />
        )}
      </AnimatePresence>
    </div>
  );
};