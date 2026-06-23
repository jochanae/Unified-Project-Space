import { Sparkles, X, MessageSquarePlus, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCoachInsight } from "@/hooks/useCoachInsight";

const LAST_INSIGHT_KEY = "quinn:lastInsight:v1";

interface QuinnInsightBarProps {
  /** Inject the insight prompt into the chat input/conversation. */
  onDiscuss: (prompt: string) => void;
  /** Project name to give the bar a contextual anchor. */
  projectName?: string | null;
}

const DISMISS_KEY_PREFIX = "quinn:insightbar:dismissed:";

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Slim "executive briefing" bar that sits below the Bloom header.
 * Replaces the auto-greeting financial summary bubble with a high-signal,
 * tap-to-discuss surface in the Luxury Obsidian aesthetic.
 */
export function QuinnInsightBar({ onDiscuss, projectName }: QuinnInsightBarProps) {
  const { insight, isLoading } = useCoachInsight();
  const dismissKey = `${DISMISS_KEY_PREFIX}${getTodayKey()}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey) === "true";
    } catch {
      return false;
    }
  });

  // Reset dismissal at midnight rollover (lightweight check on focus)
  useEffect(() => {
    const onFocus = () => {
      const stored = localStorage.getItem(dismissKey);
      if (!stored) setDismissed(false);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dismissKey]);

  // Persist the live insight so other surfaces (dashboard Bloom card) can echo it
  useEffect(() => {
    if (isLoading || !insight?.message) return;
    try {
      localStorage.setItem(
        LAST_INSIGHT_KEY,
        JSON.stringify({
          message: insight.message,
          emoji: insight.emoji,
          prompt: insight.prompt,
          savedAt: Date.now(),
        })
      );
      // Notify same-tab listeners (storage event only fires cross-tab)
      window.dispatchEvent(new Event("quinn:insight-updated"));
    } catch {
      /* ignore */
    }
  }, [isLoading, insight]);

  const [sparkling, setSparkling] = useState(false);

  const handleDismiss = () => {
    try {
      localStorage.setItem(dismissKey, "true");
    } catch {
      // ignore
    }
    setSparkling(true);
    setDismissed(true);
    // Sparkle lifetime ~ exit duration + tail
    window.setTimeout(() => setSparkling(false), 800);
  };

  const handleDiscuss = () => {
    if (!insight.prompt) return;
    onDiscuss(insight.prompt);
    handleDismiss();
  };

  const handleShare = async () => {
    if (!insight?.message) return;
    const text = `${insight.emoji ?? "✨"} Bloom briefing${projectName ? ` · ${projectName}` : ""}\n\n${insight.message}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bloom briefing", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Insight copied to clipboard");
      }
    } catch (err: any) {
      // User canceled the share sheet — silent.
      if (err?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Insight copied to clipboard");
      } catch {
        toast.error("Couldn't share insight");
      }
    }
  };

  if (isLoading) return null;

  return (
    <div className="px-3 pt-2 relative">
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            key="quinn-insight-bar"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.96,
              transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={handleDiscuss}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDiscuss();
                }
              }}
              className="
                quinn-glass flex items-center gap-2.5 rounded-xl px-3 py-2
                border-[hsl(40_55%_68%/0.28)] hover:border-[hsl(40_70%_72%/0.5)]
                shadow-[0_2px_14px_-6px_hsl(40_55%_50%/0.35)]
                transition-all duration-200 cursor-pointer group
              "
              aria-label={`Insight: ${insight.message}. Tap to discuss.`}
            >
              {/* Champagne sparkle */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(40_60%_72%/0.15)] border border-[hsl(40_55%_68%/0.4)] flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-champagne" strokeWidth={2.4} />
              </div>

              {/* Message + optional project anchor */}
              <div className="flex-1 min-w-0">
                {projectName && (
                  <p className="text-[10px] uppercase tracking-wider text-champagne/70 leading-none mb-0.5 font-medium">
                    {projectName} · Today's Briefing
                  </p>
                )}
                <p className="text-xs sm:text-sm text-foreground/95 leading-snug truncate">
                  {insight.message}
                </p>
              </div>

              {/* Discuss CTA */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDiscuss();
                }}
                className="
                  hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg
                  text-[11px] font-medium text-emerald
                  bg-[hsl(158_70%_48%/0.1)] border border-[hsl(158_70%_48%/0.3)]
                  hover:bg-[hsl(158_70%_48%/0.18)] transition-colors
                  flex-shrink-0
                "
              >
                <MessageSquarePlus className="h-3 w-3" />
                Discuss
              </button>

              {/* Share / Export */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                aria-label="Share or copy insight"
                title="Share or copy insight"
                className="
                  flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center
                  text-champagne/70 hover:text-champagne hover:bg-[hsl(40_55%_50%/0.1)]
                  transition-colors
                "
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              {/* Dismiss */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                aria-label="Dismiss insight"
                className="
                  flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center
                  text-muted-foreground hover:text-foreground hover:bg-foreground/5
                  transition-colors
                "
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparkle "loop back to Bloom" — fires when the bar collapses, signaling
          the insight is being stored back into Bloom's brain rather than deleted. */}
      <AnimatePresence>
        {sparkling && (
          <motion.div
            key="sparkle-loop"
            initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.3, 1, 0.5],
              x: [0, 8, 18, 28],
              y: [0, -6, -14, -24],
            }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="pointer-events-none absolute right-5 top-4 z-10"
          >
            <Sparkles
              className="h-4 w-4 text-champagne drop-shadow-[0_0_10px_hsl(40_70%_72%/0.9)]"
              strokeWidth={2.5}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
