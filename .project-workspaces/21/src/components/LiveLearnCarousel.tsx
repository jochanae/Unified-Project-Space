import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, MonitorPlay } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useBadges } from '@/hooks/useBadges';
import { useAppContext } from '@/contexts/AppContext';

interface LearnItem {
  id: string;
  title: string;
  description: string;
  category: string;
  video_url: string | null;
  thumbnail_url: string | null;
  emoji: string;
  age_tag: string;
}

interface LiveLearnCarouselProps {
  isMinor?: boolean;
  glassMode?: boolean;
}

export default function LiveLearnCarousel({ isMinor = false, glassMode = true }: LiveLearnCarouselProps) {
  const [items, setItems] = useState<LearnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef(0);
  const { user, activeConnection } = useAppContext();
  const { awardBadge, hasBadge } = useBadges(user?.id ?? null);
  const companionAvatarUrl = activeConnection?.avatarUrl;

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('learn_content')
        .select('id, title, description, category, video_url, thumbnail_url, emoji, age_tag')
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (data) {
        const filtered = (data as LearnItem[]).filter(item =>
          isMinor
            ? item.age_tag === 'youth' || item.age_tag === 'all'
            : item.age_tag === 'adult' || item.age_tag === 'all'
        );
        setItems(filtered);
      }
      setLoading(false);
    };
    fetchContent();
  }, [isMinor]);

  const handleItemClick = useCallback((item: LearnItem) => {
    if (isMinor && item.category === 'safety' && !hasBadge('digital-guard')) {
      awardBadge('digital-guard', 'learn');
    }
    if (item.video_url) {
      window.open(item.video_url, '_blank', 'noopener,noreferrer');
    }
  }, [isMinor, hasBadge, awardBadge]);

  const prev = () => { setActiveIdx(i => (i - 1 + items.length) % items.length); resetAutoPlay(); };
  const next = () => { setActiveIdx(i => (i + 1) % items.length); resetAutoPlay(); };

  // Auto-rotation every 5 seconds
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % (items.length || 1));
    }, 5000);
  }, [items.length]);

  const resetAutoPlay = useCallback(() => {
    startAutoPlay();
  }, [startAutoPlay]);

  useEffect(() => {
    if (items.length > 1) startAutoPlay();
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [items.length, startAutoPlay]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) { delta > 0 ? prev() : next(); }
  };

  if (loading || items.length === 0) return null;

  const current = items[activeIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="mt-4 rounded-2xl overflow-hidden"
      style={glassMode ? {
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
      } : { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >

      {/* Video thumbnail carousel */}
      <div
        className="relative mx-4 mb-2 rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => handleItemClick(current)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0"
            >
              {current.thumbnail_url ? (
                <img
                  src={current.thumbnail_url}
                  alt={current.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                /* Blurred companion avatar fallback or gradient */
                <div className="h-full w-full relative overflow-hidden">
                  {companionAvatarUrl ? (
                    <>
                      <img
                        src={companionAvatarUrl}
                        alt=""
                        className="h-full w-full object-cover scale-110 blur-xl opacity-40"
                      />
                      <div className="absolute inset-0 bg-black/50" />
                      <span className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-lg">{current.emoji}</span>
                    </>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"
                      style={{
                        background: glassMode
                          ? 'linear-gradient(135deg, hsl(225 30% 12%) 0%, hsl(240 25% 16%) 50%, hsl(225 20% 10%) 100%)'
                          : 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--card)) 100%)',
                      }}
                    >
                      <span className="text-5xl opacity-60">{current.emoji}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Glassmorphism play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-110',
              'bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg shadow-black/20'
            )}>
              <Play className="h-6 w-6 text-white ml-0.5 drop-shadow-md" fill="currentColor" />
            </div>
          </div>

          {/* Duration badge (bottom-right) */}
          {current.video_url && (
            <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {current.category === 'safety' ? '3:00' : '1:00'}
            </div>
          )}

          {/* Arrow nav overlays */}
          {items.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setActiveIdx(idx); resetAutoPlay(); }}
              className={cn(
                'rounded-full transition-all duration-300',
                idx === activeIdx
                  ? 'h-2 w-5 bg-primary'
                  : cn('h-2 w-2', glassMode ? 'bg-white/25 hover:bg-white/40' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50')
              )}
            />
          ))}
        </div>
      )}

      {/* Featured label + title */}
      <div className="px-4 pb-4">
        <p className={cn('text-sm', glassMode ? 'text-white/90' : 'text-foreground')}>
          <span className={cn('font-semibold', glassMode ? 'text-primary' : 'text-primary')}>Featured:</span>{' '}
          {current.title}
        </p>
      </div>
    </motion.div>
  );
}
