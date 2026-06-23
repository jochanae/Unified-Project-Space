import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  onClose: () => void;
  variant: "playful" | "modern";
}

const stickers = {
  emotions: ["😊", "😍", "🥰", "😎", "🤩", "😇", "🥳", "😂"],
  reactions: ["👍", "👏", "🙌", "💪", "🎉", "⭐", "❤️", "💯"],
  activities: ["📚", "🎮", "⚽", "🎨", "🎵", "🏆", "🌟", "✨"],
  animals: ["🐶", "🐱", "🐰", "🦄", "🐼", "🦋", "🐸", "🦁"],
};

export const StickerPicker = ({ onSelect, onClose, variant }: StickerPickerProps) => {
  const isPlayful = variant === "playful";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        absolute bottom-16 left-0 right-0 mx-3 rounded-xl p-3 shadow-lg
        ${isPlayful ? "bg-white" : "bg-slate-800"}
      `}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-medium ${isPlayful ? "text-purple-600" : "text-white"}`}>
          Stickers
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={`h-6 w-6 ${isPlayful ? "text-purple-500" : "text-white"}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {Object.entries(stickers).map(([category, items]) => (
          <div key={category}>
            <p className={`text-xs capitalize mb-1 ${isPlayful ? "text-purple-400" : "text-white/50"}`}>
              {category}
            </p>
            <div className="flex flex-wrap gap-1">
              {items.map((sticker) => (
                <motion.button
                  key={sticker}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelect(sticker)}
                  className="text-2xl p-1 hover:bg-purple-100 rounded transition-colors"
                >
                  {sticker}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
