import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface WelcomeTourCardProps {
  companionName: string;
  onOpenChat?: () => void;
  onOpenStudio?: () => void;
  onOpenJournal?: () => void;
  onOpenThinkFreely?: () => void;
  onOpenPlans?: () => void;
  onUploadBackdrop?: (file: File) => void;
}

const STORAGE_KEY = 'compani-welcome-tour-dismissed';

export default function WelcomeTourCard({
  companionName,
  onOpenChat,
  onOpenStudio,
  onOpenJournal,
  onOpenThinkFreely,
  onOpenPlans,
  onUploadBackdrop,
}: WelcomeTourCardProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [page, setPage] = useState(0);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const pages = [
    {
      headline: `Welcome 💛`,
      sub: `Here's a quick look at what you can do with ${companionName}.`,
      tips: [
        {
          emoji: '💬',
          title: 'Just start talking',
          body: `${companionName} learns who you are through conversation — the more you share, the more personal it gets.`,
          action: 'Open chat',
          onClick: onOpenChat,
        },
        {
          emoji: '🎨',
          title: 'Make them yours',
          body: `Visit Studio to rename your companion, change their look, or set their communication style.`,
          action: 'Go to Studio',
          onClick: onOpenStudio,
        },
        {
          emoji: '🖼️',
          title: 'Set your backdrop',
          body: `Tap the camera icon on your dashboard header to upload a photo as your personal background.`,
          action: null,
          onClick: null,
        },
      ],
    },
    {
      headline: 'More to explore',
      sub: 'A few things most people discover later — now you know.',
      tips: [
        {
          emoji: '📋',
          title: 'Plans & rhythms',
          body: `Ask your companion to suggest a plan or daily habit. They'll track it and check in with you.`,
          action: 'View Plans',
          onClick: onOpenPlans,
        },
        {
          emoji: '📝',
          title: 'Journal privately',
          body: `Your Space has a journal with daily prompts — and Private Mode in chat lets you think out loud without saving anything.`,
          action: 'Open Journal',
          onClick: onOpenJournal,
        },
        {
          emoji: '🔒',
          title: 'Private Mode',
          body: `Need to process something? Tap the 🔒 icon in your chat header. Nothing is saved, no memories created.`,
          action: 'Open Chat',
          onClick: onOpenChat,
        },
      ],
    },
  ];

  const current = pages[page];
  const isLast = page === pages.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-3 rounded-2xl bg-white/5 backdrop-blur-sm border-[0.5px] border-primary/25 shadow-[0_0_16px_rgba(212,175,80,0.08)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{current.headline}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{current.sub}</p>
        </div>
        <button
          onClick={dismiss}
          className="rounded-full p-1.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tips */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-3 flex flex-col gap-2"
        >
          {current.tips.map(({ emoji, title, body, action, onClick }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5 bg-white/[0.04] border-[0.5px] border-white/[0.07]"
            >
              <span className="text-base shrink-0 mt-0.5">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground/90">{title}</p>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed mt-0.5">{body}</p>
              </div>
              {action && onClick && (
                <button
                  onClick={onClick}
                  className="shrink-0 text-[10px] font-semibold text-primary/70 bg-primary/10 rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors whitespace-nowrap mt-0.5"
                >
                  {action}
                </button>
              )}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Footer — pagination + done */}
      <div className="flex items-center justify-between px-4 pb-3.5 pt-1">
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === page
                  ? 'w-4 h-1.5 bg-primary/60'
                  : 'w-1.5 h-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {page > 0 && (
            <button
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={dismiss}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Got it 💛
            </button>
          ) : (
            <button
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
