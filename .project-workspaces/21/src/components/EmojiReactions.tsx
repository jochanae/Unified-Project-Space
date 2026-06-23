import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { ReactionSummary, EMOJI_OPTIONS } from '@/hooks/useReactions';

// Only show actual emoji characters, filter out UUIDs/garbage
const isValidEmoji = (s: string) => s.length <= 4 && !/^[0-9a-f-]{8,}$/i.test(s);

interface EmojiReactionsProps {
  postId: string;
  reactions: ReactionSummary[];
  onToggle?: (postId: string, emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiReactions({ postId, reactions, onToggle, disabled }: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const validReactions = reactions.filter((r) => isValidEmoji(r.emoji));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Existing reactions */}
      {validReactions.map((r) => (
        <button
          key={r.emoji}
          onClick={(e) => { e.stopPropagation(); onToggle?.(postId, r.emoji); }}
          disabled={disabled}
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition-all ${
            r.reacted
              ? 'bg-primary/15 border border-primary/30 text-foreground'
              : 'bg-secondary border border-border/40 text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          <span className="text-sm">{r.emoji}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {!disabled && (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground/60 hover:bg-secondary/80 hover:text-muted-foreground transition-all"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                className="absolute bottom-full left-0 mb-1.5 flex gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-lg z-10"
              >
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle?.(postId, emoji);
                      setShowPicker(false);
                    }}
                    className="rounded-full p-1 text-base transition-transform hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
