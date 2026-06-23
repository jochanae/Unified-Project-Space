import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface CardTheme {
  id: string;
  name: string;
  description: string | null;
  gradient_start: string;
  gradient_end: string;
  icon: string | null;
  is_premium: boolean;
}

interface CardThemeCarouselProps {
  selected: string;
  onSelect: (id: string) => void;
  variant?: "playful" | "modern";
  userName?: string;
}

export const CardThemeCarousel = ({
  selected,
  onSelect,
  variant = "playful",
  userName = "Kid",
}: CardThemeCarouselProps) => {
  const [themes, setThemes] = useState<CardTheme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isPlayful = variant === "playful";

  useEffect(() => {
    const fetchThemes = async () => {
      const { data, error } = await supabase
        .from("card_themes")
        .select("*")
        .order("display_order");

      if (!error && data) {
        setThemes(data);
        if (data.length > 0 && !selected) {
          onSelect(data[0].id);
        }
      }
    };

    fetchThemes();
  }, []);

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % themes.length;
    setCurrentIndex(newIndex);
    onSelect(themes[newIndex].id);
  };

  const goToPrev = () => {
    const newIndex = (currentIndex - 1 + themes.length) % themes.length;
    setCurrentIndex(newIndex);
    onSelect(themes[newIndex].id);
  };

  if (themes.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isPlayful ? "border-purple-500" : "border-emerald-400"}`} />
      </div>
    );
  }

  const currentTheme = themes[currentIndex];

  return (
    <div className="space-y-4">
      {/* Card Display */}
      <div className="relative flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrev}
          className={`absolute left-0 z-10 ${isPlayful ? "text-purple-500 hover:bg-purple-100" : "text-white hover:bg-white/10"}`}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <motion.div
          key={currentTheme.id}
          initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative"
        >
          {/* Card */}
          <div
            className={`
              w-72 h-44 rounded-2xl p-4 flex flex-col justify-between
              shadow-2xl transform transition-all duration-300
              ${isPlayful ? "hover:scale-105" : "hover:shadow-emerald-500/20"}
            `}
            style={{
              background: `linear-gradient(135deg, ${currentTheme.gradient_start}, ${currentTheme.gradient_end})`,
            }}
          >
            {/* Card Header */}
            <div className="flex justify-between items-start">
              <div className="text-white/90 text-sm font-medium">KidsBloom</div>
              <motion.span
                animate={isPlayful ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl"
              >
                {currentTheme.icon}
              </motion.span>
            </div>

            {/* Card Chip */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-7 bg-yellow-300/80 rounded-md" />
              <div className="w-6 h-6 rounded-full bg-white/20" />
            </div>

            {/* Card Footer */}
            <div>
              <div className="text-white/60 text-xs tracking-wider">
                •••• •••• •••• {Math.floor(1000 + Math.random() * 9000)}
              </div>
              <div className="text-white font-bold text-lg mt-1">
                {userName.toUpperCase()}
              </div>
            </div>

            {/* Decorative Elements for Playful */}
            {isPlayful && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute top-4 right-12 w-16 h-16 bg-white/10 rounded-full blur-xl"
                />
                <motion.div
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute bottom-4 left-8 w-20 h-20 bg-white/10 rounded-full blur-xl"
                />
              </>
            )}
          </div>
        </motion.div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className={`absolute right-0 z-10 ${isPlayful ? "text-purple-500 hover:bg-purple-100" : "text-white hover:bg-white/10"}`}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Theme Name */}
      <div className="text-center">
        <h3 className={`text-xl font-bold ${isPlayful ? "text-purple-600" : "text-white"}`}>
          {currentTheme.name}
        </h3>
        {currentTheme.description && (
          <p className={`text-sm ${isPlayful ? "text-purple-400" : "text-emerald-300"}`}>
            {currentTheme.description}
          </p>
        )}
      </div>

      {/* Theme Dots */}
      <div className="flex justify-center gap-2">
        {themes.map((theme, index) => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setCurrentIndex(index);
              onSelect(theme.id);
            }}
            className={`
              w-3 h-3 rounded-full transition-all
              ${currentIndex === index
                ? isPlayful ? "bg-purple-500 w-6" : "bg-emerald-400 w-6"
                : isPlayful ? "bg-purple-200" : "bg-white/30"
              }
            `}
            style={{
              background: currentIndex === index
                ? `linear-gradient(135deg, ${theme.gradient_start}, ${theme.gradient_end})`
                : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
};
