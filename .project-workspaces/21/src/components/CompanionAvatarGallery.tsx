import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, Check, Sparkles, X } from 'lucide-react';
import { GALLERY_VIBES, GALLERY_AVATARS, GalleryVibe, GalleryAvatar } from '@/lib/galleryAvatars';

interface CompanionAvatarGalleryProps {
  isPremium: boolean;
  selectedAvatarId?: string | null;
  onSelect: (avatar: GalleryAvatar) => void;
  onUpgrade?: () => void;
}

export default function CompanionAvatarGallery({
  isPremium,
  selectedAvatarId,
  onSelect,
  onUpgrade,
}: CompanionAvatarGalleryProps) {
  const [activeVibe, setActiveVibe] = useState<GalleryVibe | 'all'>('all');
  const [previewAvatar, setPreviewAvatar] = useState<GalleryAvatar | null>(null);

  const filtered = activeVibe === 'all'
    ? GALLERY_AVATARS
    : GALLERY_AVATARS.filter(a => a.vibe === activeVibe);

  // Always open preview first — never apply immediately
  const handleTap = (avatar: GalleryAvatar) => {
    setPreviewAvatar(avatar);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-display text-base font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Choose a Look
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Tap to preview — pick a vibe that matches your ideal companion
        </p>
      </div>

      {/* Vibe filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveVibe('all')}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
            activeVibe === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
          }`}
        >
          All Vibes
        </button>
        {GALLERY_VIBES.map(vibe => (
          <button
            key={vibe.id}
            onClick={() => setActiveVibe(vibe.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
              activeVibe === vibe.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {vibe.emoji} {vibe.label}
          </button>
        ))}
      </div>

      {/* Vibe description */}
      {activeVibe !== 'all' && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-muted-foreground italic"
        >
          {GALLERY_VIBES.find(v => v.id === activeVibe)?.description}
        </motion.p>
      )}

      {/* Avatar grid */}
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((avatar, i) => {
          const isLocked = avatar.premium && !isPremium;
          const isSelected = selectedAvatarId === avatar.id;

          return (
            <motion.button
              key={avatar.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleTap(avatar)}
              className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30 shadow-lg'
                  : 'border-border/40 hover:border-primary/30'
              }`}
            >
              <img
                src={avatar.src}
                alt={avatar.name}
                className={`h-full w-full object-cover transition-all ${
                  isLocked ? 'brightness-75' : 'group-hover:scale-105'
                }`}
                loading="lazy"
              />

              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-md">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}

              {/* Premium lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow-sm">
                      <Crown className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[9px] font-semibold text-white">Premium</span>
                  </div>
                </div>
              )}

              {/* Name + vibe tag */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
                <p className="text-[11px] font-semibold text-white leading-tight">{avatar.name}</p>
                <p className="text-[9px] text-white/70">{avatar.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-display font-bold text-foreground">Unlock All Avatars</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Premium gives you access to the full gallery plus AI-generated custom looks
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Premium
          </button>
        </motion.div>
      )}

      {/* Enlarged preview lightbox — works for all avatars */}
      {previewAvatar && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onClick={() => setPreviewAvatar(null)}
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="relative max-w-xs w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setPreviewAvatar(null)}
                className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-md"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>

              <img
                src={previewAvatar.src}
                alt={previewAvatar.name}
                className="w-full rounded-2xl object-cover shadow-2xl max-h-[60vh]"
              />
              <div className="mt-3">
                <h3 className="text-lg font-bold text-white">{previewAvatar.name}</h3>
                <p className="text-sm text-white/70 mt-1">{previewAvatar.description}</p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {previewAvatar.premium && !isPremium ? (
                  <>
                    <button
                      onClick={() => { setPreviewAvatar(null); onUpgrade?.(); }}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
                    >
                      <Crown className="h-4 w-4" />
                      Unlock with Premium
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onSelect(previewAvatar);
                      setPreviewAvatar(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
                  >
                    <Check className="h-4 w-4" />
                    Choose This Look
                  </button>
                )}
                <button
                  onClick={() => setPreviewAvatar(null)}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
