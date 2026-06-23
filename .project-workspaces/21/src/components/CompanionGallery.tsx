import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Palette, Smile, Image as ImageIcon, Trash2, X, TrendingUp } from 'lucide-react';
import { CompanionMediaItem } from '@/hooks/useCompanionMedia';
import { useIsMobile } from '@/hooks/use-mobile';

type MediaFilter = 'all' | 'selfie' | 'activity' | 'sticker';

interface CompanionGalleryProps {
  media: CompanionMediaItem[];
  loading: boolean;
  companionName: string;
  onDelete: (id: string) => void;
}

const FILTER_OPTIONS: { value: MediaFilter; label: string; icon: typeof Camera }[] = [
  { value: 'all', label: 'All', icon: ImageIcon },
  { value: 'selfie', label: 'Selfies', icon: Camera },
  { value: 'activity', label: 'Activities', icon: Palette },
  { value: 'sticker', label: 'Stickers', icon: Smile },
];

export default function CompanionGallery({ media, loading, companionName, onDelete }: CompanionGalleryProps) {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [lightbox, setLightbox] = useState<CompanionMediaItem | null>(null);

  const filtered = filter === 'all' ? media : media.filter((m) => m.mediaType === filter);

  const mostUsed = [...media]
    .filter((m) => m.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Most Used Section */}
      {mostUsed.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Most Used
          </h4>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {mostUsed.map((item) => (
              <button
                key={item.id}
                onClick={() => setLightbox(item)}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-secondary/30"
              >
                <img
                  src={item.imageUrl}
                  alt={item.caption || item.mediaType}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {item.usageCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTER_OPTIONS.map((opt) => {
          const count = opt.value === 'all' ? media.length : media.filter((m) => m.mediaType === opt.value).length;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-3 w-3" />
              {opt.label}
              {count > 0 && (
                <span className={`text-[10px] ${filter === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No media yet</p>
          <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
            {filter === 'all'
              ? `Use the 📷 button in chat to create selfies, stickers, and activity scenes with ${companionName}.`
              : `No ${filter === 'selfie' ? 'selfies' : filter === 'activity' ? 'activity scenes' : 'stickers'} yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setLightbox(item)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-secondary/30"
            >
              <img
                src={item.imageUrl}
                alt={item.caption || item.mediaType}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute bottom-1 left-1 flex items-center gap-1">
                <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                  {item.mediaType === 'selfie' ? '📸' : item.mediaType === 'activity' ? '🎨' : '😊'}
                </span>
                {item.usageCount > 0 && (
                  <span className="rounded-full bg-primary/80 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-sm">
                    {item.usageCount}×
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${isMobile ? '' : 'p-4'}`}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={isMobile ? { y: '100%' } : { scale: 0.9 }}
              animate={isMobile ? { y: 0 } : { scale: 1 }}
              exit={isMobile ? { y: '100%' } : { scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={isMobile ? 'absolute inset-0 flex flex-col bg-background' : 'relative max-w-sm w-full'}
            >
              {isMobile && (
                <button
                  onClick={() => setLightbox(null)}
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <img
                src={lightbox.imageUrl}
                alt={lightbox.caption || ''}
                className={isMobile ? 'w-full flex-1 object-contain' : 'w-full rounded-2xl shadow-2xl'}
              />
              <div className={isMobile ? 'p-4 space-y-2' : ''}>
                {lightbox.caption && (
                  <p className={`mt-3 text-center text-sm ${isMobile ? 'text-foreground' : 'text-white/80'}`}>{lightbox.caption}</p>
                )}
                <div className="mt-1 flex items-center justify-center gap-2">
                  {lightbox.prompt && (
                    <p className={`text-xs ${isMobile ? 'text-muted-foreground' : 'text-white/50'}`}>{lightbox.prompt}</p>
                  )}
                  {lightbox.usageCount > 0 && (
                    <span className={`text-xs ${isMobile ? 'text-muted-foreground' : 'text-white/50'}`}>· Sent {lightbox.usageCount}×</span>
                  )}
                </div>
                <div className="mt-3 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      onDelete(lightbox.id);
                      setLightbox(null);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-destructive/80 px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                  {!isMobile && (
                    <button
                      onClick={() => setLightbox(null)}
                      className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Close
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
