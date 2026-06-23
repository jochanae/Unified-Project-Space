import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, BookOpen, Video, Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface LearnPlayButtonProps {
  variant: "playful" | "modern";
}

export function LearnPlayButton({ variant }: LearnPlayButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const isPlayful = variant === "playful";

  const options = [
    {
      id: "games",
      icon: Gamepad2,
      label: isPlayful ? "Games 🎮" : "Games",
      description: isPlayful ? "Play fun money games!" : "Interactive financial games",
      color: isPlayful ? "from-orange-400 to-pink-400" : "from-orange-500 to-rose-500",
    },
    {
      id: "lessons",
      icon: BookOpen,
      label: isPlayful ? "Lessons 📚" : "Lessons",
      description: isPlayful ? "Learn cool stuff!" : "Financial literacy courses",
      color: isPlayful ? "from-blue-400 to-indigo-400" : "from-blue-500 to-indigo-500",
    },
    {
      id: "videos",
      icon: Video,
      label: isPlayful ? "Videos 🎬" : "Videos",
      description: isPlayful ? "Watch and learn!" : "Educational content",
      color: isPlayful ? "from-green-400 to-teal-400" : "from-green-500 to-teal-500",
    },
  ];

  const handleOptionClick = (optionId: string) => {
    setShowModal(false);
    navigate("/kidsbloom/learn", { state: { filter: optionId } });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={() => setShowModal(true)}
          className={`w-full h-16 rounded-2xl text-lg font-bold gap-3 ${
            isPlayful
              ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 text-white shadow-lg shadow-purple-500/30"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
          }`}
        >
          <Sparkles className="h-6 w-6" />
          {isPlayful ? "Learn & Play! 🎓" : "Learn & Play"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>

      <Sheet open={showModal} onOpenChange={setShowModal}>
        <SheetContent side="bottom" className="h-[100dvh] rounded-t-3xl overflow-y-auto [&>button]:hidden">
          {/* Close Button */}
          <div className="flex justify-between items-center pt-2 pb-4">
            <div className="w-8" /> {/* Spacer for centering */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowModal(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <SheetHeader className="pb-4">
            <SheetTitle className={`text-2xl text-center ${isPlayful ? "text-purple-600" : ""}`}>
              {isPlayful ? "What do you want to do? 🌟" : "Choose an Activity"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 px-2">
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleOptionClick(option.id)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r ${option.color} text-white shadow-lg`}
              >
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <option.icon className="h-7 w-7" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-lg">{option.label}</p>
                  <p className="text-sm opacity-90">{option.description}</p>
                </div>
                <ArrowRight className="h-6 w-6" />
              </motion.button>
            ))}
          </div>

          <div className="mt-6 px-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                navigate("/kidsbloom/learn");
              }}
              className={`w-full ${isPlayful ? "text-purple-600" : ""}`}
            >
              {isPlayful ? "See Everything! 👀" : "Browse All Content"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
