import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, MessageCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GALLERY_AVATARS, GalleryAvatar } from '@/lib/galleryAvatars';
import { STUDIO_IMAGES } from '@/lib/studioImages';

type InspirationStyle = 'portrait' | 'anime' | 'painterly' | 'abstract';

const STYLE_TABS: { id: InspirationStyle; label: string; emoji: string; description: string }[] = [
  { id: 'portrait', label: 'Portrait', emoji: '📸', description: 'Photorealistic — lifelike detail and expression' },
  { id: 'anime', label: 'Anime', emoji: '✨', description: 'Illustrated & stylized — bold lines, vivid color' },
  { id: 'painterly', label: 'Painterly', emoji: '🖼️', description: 'Watercolor & artistic — soft, expressive strokes' },
  { id: 'abstract', label: 'Abstract', emoji: '🎨', description: 'Color & energy — no face, pure feeling' },
];

// Map styles to existing gallery avatars and studio images for inspiration
const INSPIRATION_ITEMS: Record<InspirationStyle, { id: string; src: string; name: string; description: string; type: 'portrait-crop' | 'full-body'; premium: boolean }[]> = {
  portrait: GALLERY_AVATARS.filter(a => a.vibe === 'warm' || a.vibe === 'bold').map((a, i) => ({
    id: `portrait-${a.id}`,
    src: a.src,
    name: a.name,
    description: a.description,
    type: i % 3 === 2 ? 'full-body' as const : 'portrait-crop' as const,
    premium: i % 3 === 2,
  })),
  anime: [
    { id: 'anime-1', src: STUDIO_IMAGES['anime'] || '', name: 'Sakura', description: 'Bright-eyed, vivid colors', type: 'portrait-crop', premium: false },
    { id: 'anime-2', src: STUDIO_IMAGES['comic'] || '', name: 'Nova', description: 'Bold linework, dynamic pose', type: 'portrait-crop', premium: false },
    ...GALLERY_AVATARS.filter(a => a.vibe === 'playful').map(a => ({
      id: `anime-${a.id}`,
      src: a.src,
      name: a.name,
      description: `${a.description} — anime style`,
      type: 'full-body' as const,
      premium: true,
    })),
  ],
  painterly: [
    { id: 'paint-1', src: STUDIO_IMAGES['painterly'] || '', name: 'Monet', description: 'Soft watercolor washes', type: 'portrait-crop', premium: false },
    { id: 'paint-2', src: STUDIO_IMAGES['watercolor'] || '', name: 'Iris', description: 'Dreamy, flowing colors', type: 'portrait-crop', premium: false },
    ...GALLERY_AVATARS.filter(a => a.vibe === 'mysterious').map(a => ({
      id: `paint-${a.id}`,
      src: a.src,
      name: a.name,
      description: `${a.description} — painterly style`,
      type: 'full-body' as const,
      premium: true,
    })),
  ],
  abstract: GALLERY_AVATARS.filter(a => a.vibe === 'mysterious' || a.vibe === 'playful').slice(0, 4).map((a, i) => ({
    id: `abstract-${a.id}`,
    src: a.src,
    name: ['Aurora', 'Ember', 'Drift', 'Pulse'][i] || a.name,
    description: ['Swirling gradients, no face', 'Warm energy field', 'Cool flow patterns', 'Rhythmic shapes'][i] || a.description,
    type: i >= 2 ? 'full-body' as const : 'portrait-crop' as const,
    premium: i >= 2,
  })),
};

interface InspirationGalleryProps {
  isPremium: boolean;
  onClose: () => void;
}

export default function InspirationGallery({ isPremium, onClose }: InspirationGalleryProps) {
  const [activeStyle, setActiveStyle] = useState<InspirationStyle>('portrait');
  const [previewItem, setPreviewItem] = useState<typeof INSPIRATION_ITEMS['portrait'][0] | null>(null);
  const navigate = useNavigate();

  const items = INSPIRATION_ITEMS[activeStyle].filter(i => i.src); // only show items with actual images

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Inspiration Gallery
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Browse styles to see what's possible — then create your own
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Style tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {STYLE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveStyle(tab.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
              activeStyle === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Style description */}
      <motion.p
        key={activeStyle}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs text-muted-foreground italic"
      >
        {STYLE_TABS.find(t => t.id === activeStyle)?.description}
      </motion.p>

      {/* Items grid */}
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => {
          const isLocked = item.premium && !isPremium;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setPreviewItem(item)}
              className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-border/40 hover:border-primary/30 transition-all"
            >
              <img
                src={item.src}
                alt={item.name}
                className={`h-full w-full object-cover transition-all ${
                  isLocked ? 'brightness-50 blur-[1px]' : 'group-hover:scale-105'
                }`}
                loading="lazy"
              />

              {/* Type badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold backdrop-blur-sm ${
                  item.type === 'portrait-crop'
                    ? 'bg-card/80 text-foreground'
                    : 'bg-primary/80 text-primary-foreground'
                }`}>
                  {item.type === 'portrait-crop' ? 'Portrait' : 'Full Body'}
                </span>
              </div>

              {/* Premium lock */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow-sm">
                      <Crown className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[9px] font-semibold text-white">Premium</span>
                  </div>
                </div>
              )}

              {/* Name overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-5">
                <p className="text-[10px] font-semibold text-white leading-tight">{item.name}</p>
                <p className="text-[8px] text-white/60">{item.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Persistent Cami banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Not sure what you want? Browse our curated gallery 💛</p>
          <button
            onClick={() => navigate('/browse')}
            className="text-[11px] font-semibold text-primary hover:underline mt-0.5"
          >
            Browse companions →
          </button>
        </div>
      </motion.div>

      {/* Preview lightbox */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="relative max-w-xs w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-md"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
              <img
                src={previewItem.src}
                alt={previewItem.name}
                className="w-full rounded-2xl object-cover shadow-2xl max-h-[60vh]"
              />
              <div className="mt-3">
                <h3 className="text-lg font-bold text-white">{previewItem.name}</h3>
                <p className="text-sm text-white/70 mt-1">{previewItem.description}</p>
                <span className={`inline-block mt-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  previewItem.type === 'portrait-crop'
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/80 text-primary-foreground'
                }`}>
                  {previewItem.type === 'portrait-crop' ? '📸 Portrait Crop' : '🧍 Full Body'}
                </span>
              </div>
              <p className="mt-4 text-xs text-white/50 italic">
                This is for inspiration only — use the Studio tabs to build your own unique companion
              </p>
              <button
                onClick={() => setPreviewItem(null)}
                className="mt-3 text-sm text-white/60 hover:text-white transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
