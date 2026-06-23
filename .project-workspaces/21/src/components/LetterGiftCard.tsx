import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MailOpen, Loader2 } from 'lucide-react';

interface LetterGiftCardProps {
  companionName: string;
  letterContent?: string; // undefined = still loading
  avatarUrl?: string;
  /** When provided, shows a generated letter image instead of plain text */
  letterImageUrl?: string;
}

export default function LetterGiftCard({ companionName, letterContent, avatarUrl, letterImageUrl }: LetterGiftCardProps) {
  const [open, setOpen] = useState(false);
  const isLoading = letterContent === undefined && !letterImageUrl;

  return (
    <div className="flex justify-start my-2 px-2">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-[82%]"
      >
        {/* Envelope / sealed state */}
        <button
          onClick={() => !isLoading && setOpen((p) => !p)}
          disabled={isLoading}
          className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-950/60 to-amber-900/40 backdrop-blur-sm px-4 py-3 shadow-[0_0_18px_rgba(212,175,80,0.15)] transition-all active:scale-[0.97] hover:border-amber-400/50 w-full text-left"
        >
          {/* Avatar or icon */}
          <div className="shrink-0 h-9 w-9 rounded-full overflow-hidden border border-amber-400/20 flex items-center justify-center bg-amber-900/50">
            {avatarUrl ? (
              <img src={avatarUrl} alt={companionName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-amber-300 text-base">💌</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-300/90 truncate">
              A letter from {companionName}
            </p>
            <p className="text-[11px] text-amber-200/50 mt-0.5">
              {isLoading ? 'Writing…' : open ? 'Tap to seal' : 'Tap to read'}
            </p>
          </div>

          {isLoading ? (
            <Loader2 className="h-4 w-4 text-amber-400/60 animate-spin shrink-0" />
          ) : open ? (
            <MailOpen className="h-4 w-4 text-amber-400/80 shrink-0" />
          ) : (
            <Mail className="h-4 w-4 text-amber-400/80 shrink-0" />
          )}
        </button>

        {/* Letter content — expands below */}
        <AnimatePresence>
          {open && (letterContent || letterImageUrl) && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1 rounded-2xl rounded-tl-sm border border-amber-400/20 bg-gradient-to-b from-amber-950/70 to-amber-900/50 backdrop-blur-sm px-5 py-4 shadow-inner">
                {/* Decorative rule */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-amber-400/20" />
                  <span className="text-amber-400/50 text-xs">💌</span>
                  <div className="flex-1 h-px bg-amber-400/20" />
                </div>

                {/* Generated letter image takes priority */}
                {letterImageUrl ? (
                  <img
                    src={letterImageUrl}
                    alt={`Letter from ${companionName}`}
                    className="w-full rounded-lg shadow-md"
                    loading="lazy"
                  />
                ) : (
                  <p
                    className="text-sm text-amber-100/90 leading-relaxed whitespace-pre-line"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {letterContent}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
