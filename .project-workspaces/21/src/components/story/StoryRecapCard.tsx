import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import StoryRecapSlideshow from './StoryRecapSlideshow';

interface StoryRecapCardProps {
  count: number;
  companionName: string;
  isPremium: boolean;
}

export default function StoryRecapCard({ count, companionName, isPremium }: StoryRecapCardProps) {
  const [showSlideshow, setShowSlideshow] = useState(false);

  if (count <= 0) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onClick={() => setShowSlideshow(true)}
        className="relative w-full rounded-2xl overflow-hidden text-left group"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(240 20% 12%) 100%)',
          border: '1px solid hsl(43 74% 49% / 0.25)',
          boxShadow: '0 0 20px hsl(43 74% 49% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05)',
        }}
      >
        {/* Shimmer sweep */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-y-0 w-1/2"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.06), transparent)',
              animation: 'premium-shimmer 4s infinite',
            }}
          />
        </div>

        <div className="relative px-5 py-4 flex items-center gap-4">
          {/* Gold orb */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.2) 0%, hsl(43 74% 49% / 0.05) 70%)',
              border: '1px solid hsl(43 74% 49% / 0.3)',
              boxShadow: '0 0 12px hsl(43 74% 49% / 0.15)',
            }}
          >
            <Sparkles className="h-5 w-5" style={{ color: 'hsl(43 74% 49%)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {count} New Moment{count !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {companionName} has summarized your growth
            </p>
          </div>

          <ChevronRight
            className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
          />
        </div>

        {!isPremium && (
          <div
            className="px-5 pb-3 flex items-center gap-1.5"
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'hsl(43 74% 49%)' }}
            >
              ✨ Premium Recap
            </span>
          </div>
        )}
      </motion.button>

      {showSlideshow && (
        <StoryRecapSlideshow
          count={count}
          companionName={companionName}
          onClose={() => setShowSlideshow(false)}
        />
      )}
    </>
  );
}
