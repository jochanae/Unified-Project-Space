import { useState, useEffect } from "react";
import { Sparkles, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  id: string;
  content: string;
}

const fallbackQuote = "Tip: Review your subscriptions monthly — small charges add up fast.";
const QUOTES_HIDDEN_KEY = "coinsbloom_quotes_hidden";

export function DashboardTipCard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quotesHidden, setQuotesHidden] = useState(() => {
    return localStorage.getItem(QUOTES_HIDDEN_KEY) === "true";
  });
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (quotesHidden) return;
    const fetchQuotes = async () => {
      const { data, error } = await supabase
        .from("inspirational_quotes")
        .select("id, content")
        .eq("is_active", true);

      if (!error && data && data.length > 0) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const dayPatterns = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Hump Day'];
        const filtered = data.filter(quote => {
          const content = quote.content;
          const isDaySpecific = dayPatterns.some(day => content.includes(day));
          if (isDaySpecific) {
            if (today === 'Wednesday' && content.includes('Hump Day')) return true;
            return content.includes(today);
          }
          return true;
        });
        setQuotes([...filtered].sort(() => Math.random() - 0.5));
      } else {
        setQuotes([{ id: 'fallback', content: fallbackQuote }]);
      }
    };
    fetchQuotes();
  }, [quotesHidden]);

  useEffect(() => {
    if (quotes.length === 0 || quotesHidden || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [quotes.length, quotesHidden, isPaused]);

  const currentQuote = quotes[currentIndex];

  if (quotesHidden) return null;

  return (
    <div 
      className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/20 dark:border-white/[0.08]"
      style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 2px 20px -4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
      }}
    >
      <span 
        className="text-[hsl(45,80%,65%)] shrink-0 text-xs animate-pulse" 
        style={{ animationDuration: '3s' }}
      >
        ✦
      </span>
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-[11px] sm:text-xs text-muted-foreground/80 italic line-clamp-2 leading-relaxed flex-1"
        >
          {currentQuote?.content || fallbackQuote}
        </motion.p>
      </AnimatePresence>
      <button
        onClick={() => setIsPaused(p => !p)}
        className="opacity-30 hover:opacity-70 transition-opacity shrink-0"
        title={isPaused ? "Resume tips" : "Pause tips"}
      >
        {isPaused ? (
          <Play className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Pause className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}