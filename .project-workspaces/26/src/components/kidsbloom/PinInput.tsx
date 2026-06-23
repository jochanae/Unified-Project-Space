import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface PinInputProps {
  value: string;
  onChange: (pin: string) => void;
  variant?: "playful" | "modern";
  showReveal?: boolean;
}

export const PinInput = ({ value, onChange, variant = "playful", showReveal = true }: PinInputProps) => {
  const [focused, setFocused] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const isPlayful = variant === "playful";

  const handleKeyPress = (key: number | "delete") => {
    if (key === "delete") {
      onChange(value.slice(0, -1));
    } else if (value.length < 4) {
      onChange(value + key);
    }
  };

  return (
    <div className="relative">
      {/* Reveal toggle */}
      {showReveal && (
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className={`absolute -top-8 right-0 p-1.5 rounded-lg transition-colors ${
            isPlayful 
              ? "text-purple-500 hover:bg-purple-100" 
              : "text-emerald-600 hover:bg-emerald-100"
          }`}
          aria-label={revealed ? "Hide PIN" : "Show PIN"}
        >
          {revealed ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      )}

      {/* Visual PIN boxes */}
      <div className="flex justify-center gap-3 mb-6">
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`
              w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold
              transition-all duration-200
              ${isPlayful
                ? value.length === index && focused
                  ? "bg-purple-100 border-2 border-purple-500 ring-4 ring-purple-200"
                  : value[index]
                    ? "bg-gradient-to-br from-purple-400 to-pink-400 text-white"
                    : "bg-purple-50 border-2 border-purple-200"
                : value.length === index && focused
                  ? "bg-emerald-100 border-2 border-emerald-500 ring-2 ring-emerald-200"
                  : value[index]
                    ? "bg-emerald-100 border-2 border-emerald-500 text-emerald-700"
                    : "bg-white border-2 border-emerald-200"
              }
            `}
          >
            {value[index] ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-2xl"
              >
                {revealed ? value[index] : (isPlayful ? "⭐" : "●")}
              </motion.span>
            ) : (
              <span className={`text-xl ${isPlayful ? "text-purple-300" : "text-emerald-300"}`}>
                –
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Custom Keypad - fully touch-enabled */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((key) => (
          <motion.button
            key={key}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleKeyPress(key);
            }}
            className={`
              h-14 rounded-xl text-xl font-semibold transition-all
              ${isPlayful
                ? "bg-white/60 hover:bg-white/80 text-purple-600 active:bg-white"
                : "bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 active:border-emerald-500"
              }
              select-none touch-manipulation
            `}
          >
            {key}
          </motion.button>
        ))}
        {/* Clear button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }}
          className={`
            h-14 rounded-xl text-sm font-bold transition-all
            ${isPlayful
              ? "bg-white/60 hover:bg-white/80 text-purple-600 active:bg-white"
              : "bg-white hover:bg-red-50 text-slate-700 border border-emerald-200 active:border-red-500 active:text-slate-900"
            }
            select-none touch-manipulation
          `}
        >
          Clear
        </motion.button>
        {/* Zero */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleKeyPress(0);
          }}
          className={`
            h-14 rounded-xl text-xl font-semibold transition-all
            ${isPlayful
              ? "bg-white/60 hover:bg-white/80 text-purple-600 active:bg-white"
              : "bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 active:border-emerald-500"
            }
            select-none touch-manipulation
          `}
        >
          0
        </motion.button>
        {/* Delete */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleKeyPress("delete");
          }}
          className={`
            h-14 rounded-xl text-xl font-bold transition-all
            ${isPlayful
              ? "bg-white/60 hover:bg-white/80 text-purple-600 active:bg-white"
              : "bg-white hover:bg-red-50 text-slate-700 border border-emerald-200 active:border-red-500 active:text-slate-900"
            }
            select-none touch-manipulation
          `}
        >
          ⌫
        </motion.button>
      </div>
    </div>
  );
};
