import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface AvatarSelectorProps {
  selected: string;
  onSelect: (emoji: string) => void;
  variant?: "playful" | "modern";
  mode?: "inline" | "sheet";
}

const avatarEmojis = {
  playful: [
    "🦄", "🐱", "🐶", "🐰", "🦊", "🐼", "🐨", "🦁",
    "🐸", "🐢", "🦋", "🌈", "⭐", "🌟", "🎀", "🎈",
    "🧸", "🎪", "🎠", "🍭", "🍪", "🧁", "🍩", "🎂",
  ],
  modern: [
    "😎", "🔥", "💎", "🚀", "⚡", "🎮", "🎯", "🏆",
    "💪", "🌟", "✨", "💫", "🎵", "🎸", "🏀", "⚽",
    "🛹", "🎨", "📚", "💡", "🌍", "🌙", "☀️", "🌊",
  ],
};

export const AvatarSelector = ({ 
  selected, 
  onSelect, 
  variant = "playful",
  mode = "inline"
}: AvatarSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const emojis = avatarEmojis[variant];
  const isPlayful = variant === "playful";

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    if (mode === "sheet") {
      setIsOpen(false);
    }
  };

  const EmojiGrid = () => (
    <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2">
      {emojis.map((emoji, index) => (
        <motion.button
          key={emoji}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleSelect(emoji)}
          className={`
            w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all
            ${selected === emoji
              ? "bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-emerald-500 ring-offset-2"
              : "bg-white/70 hover:bg-white border border-emerald-100"
            }
          `}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );

  // Inline mode - original grid display
  if (mode === "inline") {
    return <EmojiGrid />;
  }

  // Sheet mode - button that opens a drawer
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-24 border-2 border-dashed border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 bg-white/80 transition-all"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-3xl border-2 border-emerald-200">
              {selected || <User className="h-7 w-7 text-emerald-400" />}
            </div>
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              Choose Your Avatar <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-gradient-to-b from-white to-emerald-50 max-h-[85vh]">
        <DrawerHeader className="border-b border-emerald-100">
          <DrawerTitle className="text-emerald-700 text-center">
            {isPlayful ? "Pick Your Buddy!" : "Choose Your Avatar"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <EmojiGrid />
          
          {/* Hint about uploading later */}
          <p className="text-center text-sm text-slate-500 mt-4 px-4">
            You can upload your own photo and change your avatar later in Settings
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
