import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WhisperAssistProps {
  /** Last few messages for context */
  recentMessages: { role: string; content: string }[];
  companionName: string;
  matureMode?: boolean;
  onSelectSuggestion: (text: string) => void;
}

interface WhisperOption {
  tone: string;
  emoji: string;
  text: string;
}

export default function WhisperAssist({
  recentMessages,
  companionName,
  matureMode,
  onSelectSuggestion,
}: WhisperAssistProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<WhisperOption[]>([]);

  const fetchSuggestions = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setOpen(true);
    setOptions([]);

    try {
      const { data, error } = await supabase.functions.invoke('whisper-assist', {
        body: {
          messages: recentMessages.slice(-6),
          companionName,
          matureMode: !!matureMode,
        },
      });

      if (error) throw error;

      const parsed: WhisperOption[] = data?.suggestions ?? [
        { tone: 'Confident', emoji: '💎', text: "That caught me off guard — but I like where this is going." },
        { tone: 'Playful', emoji: '😏', text: "You think you can throw me off that easy? Try harder." },
        { tone: 'Open', emoji: '💛', text: "Honestly, I'm not sure what to say… but I don't want this moment to pass." },
      ];

      setOptions(parsed);
    } catch (e) {
      console.error('[Whisper] Failed to fetch suggestions:', e);
      // Fallback options
      setOptions([
        { tone: 'Confident', emoji: '💎', text: "That's interesting — tell me more about what you mean." },
        { tone: 'Playful', emoji: '😏', text: "I see what you're doing there… and I'm here for it." },
        { tone: 'Open', emoji: '💛', text: "I'm still thinking about that — it hit differently than I expected." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [recentMessages, companionName, matureMode, loading]);

  const handleSelect = (text: string) => {
    onSelectSuggestion(text);
    setOpen(false);
    setOptions([]);
  };

  return (
    <>
      {/* Whisper trigger button */}
      <button
        onClick={fetchSuggestions}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-primary transition-all active:scale-95"
        title="Help me respond"
      >
        <Wand2 className="h-[18px] w-[18px]" />
      </button>

      {/* Whisper panel overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-full left-0 right-0 mb-2 mx-3 z-30"
          >
            <div
              className="rounded-2xl border border-white/[0.12] overflow-hidden"
              style={{
                backdropFilter: 'blur(24px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                background: 'linear-gradient(to bottom, rgba(15,18,33,0.85), rgba(15,18,33,0.92))',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,80,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                  >
                    Ways to respond
                  </span>
                </div>
                <button
                  onClick={() => { setOpen(false); setOptions([]); }}
                  className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  dismiss
                </button>
              </div>

              {/* Options */}
              <div className="px-3 pb-3 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 text-primary/40 animate-spin" />
                    <span className="ml-2 text-xs text-white/40">Reading the vibe…</span>
                  </div>
                ) : (
                  options.map((opt, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handleSelect(opt.text)}
                      className="w-full text-left rounded-xl border border-white/[0.08] p-3 hover:border-primary/30 hover:bg-white/[0.04] transition-all active:scale-[0.98] group"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{opt.emoji}</span>
                        <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/50 group-hover:text-primary/70 transition-colors">
                          {opt.tone}
                        </span>
                      </div>
                      <p className="text-[13px] text-white/80 leading-relaxed"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                      >
                        "{opt.text}"
                      </p>
                    </motion.button>
                  ))
                )}
              </div>

              {/* Tip */}
              {!loading && options.length > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-white/25 text-center">
                    Tap to draft · edit to make it yours
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
