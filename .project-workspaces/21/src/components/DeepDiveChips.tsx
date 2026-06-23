import { motion } from 'framer-motion';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

interface DeepDiveChipsProps {
  /** The user's question/topic to search for */
  searchQuery: string;
  /** Whether this user has premium (auto-search available) */
  isPremium?: boolean;
  /** Callback to trigger in-app Perplexity search */
  onLookItUp?: (query: string) => void;
  /** Whether search is currently loading */
  searching?: boolean;
  /** Whether search result was already fetched */
  searchComplete?: boolean;
}

function buildDeepDiveUrl(platform: 'perplexity' | 'chatgpt' | 'gemini', query: string): string {
  const encoded = encodeURIComponent(query);
  switch (platform) {
    case 'perplexity':
      return `https://www.perplexity.ai/search?q=${encoded}`;
    case 'chatgpt':
      return `https://chat.openai.com/?q=${encoded}`;
    case 'gemini':
      return `https://gemini.google.com/app`;
  }
}

export default function DeepDiveChips({
  searchQuery,
  isPremium,
  onLookItUp,
  searching,
  searchComplete,
}: DeepDiveChipsProps) {
  const [copiedForGemini, setCopiedForGemini] = useState(false);

  const handleGeminiClick = useCallback(() => {
    navigator.clipboard.writeText(searchQuery).then(() => {
      setCopiedForGemini(true);
      setTimeout(() => setCopiedForGemini(false), 2000);
      window.open(buildDeepDiveUrl('gemini', searchQuery), '_blank', 'noopener');
    });
  }, [searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      {/* In-app search button (fires Perplexity via edge function) */}
      {onLookItUp && !searchComplete && (
        <button
          onClick={() => onLookItUp(searchQuery)}
          disabled={searching}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {searching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          {searching ? 'Looking up…' : 'Look it up for me'}
        </button>
      )}

      {/* Deep dive external links — always available (free) */}
      <div className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-1 py-0.5">
        <span className="pl-2 text-[10px] text-muted-foreground/70 font-medium">Go deeper</span>
        <a
          href={buildDeepDiveUrl('perplexity', searchQuery)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          Perplexity
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <a
          href={buildDeepDiveUrl('chatgpt', searchQuery)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          ChatGPT
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <button
          onClick={handleGeminiClick}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {copiedForGemini ? 'Copied!' : 'Gemini'}
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
      </div>
    </motion.div>
  );
}
