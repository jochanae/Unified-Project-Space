import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Users, Sparkles, X, Image as ImageIcon, Mail, Layers, Smile, Upload } from 'lucide-react';
import { useCompanionMedia, CompanionMediaItem } from '@/hooks/useCompanionMedia';
import { useCompanionCollectibles, CollectibleItem } from '@/hooks/useCompanionCollectibles';
import { useUserChatUploads } from '@/hooks/useUserChatUploads';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import StickerGallery from '@/components/StickerGallery';
import ResilientImage from '@/components/ResilientImage';
import WorldUploadsTab from '@/components/world/WorldUploadsTab';

import LanguageCard from '@/components/cards/LanguageCard';
import PracticeCard from '@/components/cards/PracticeCard';

type VaultFilter = 'all' | 'selfie' | 'activity' | 'likeness' | 'letters' | 'cards' | 'stickers' | 'uploads';

const FILTERS: { value: VaultFilter; label: string; icon: typeof Camera }[] = [
  { value: 'all', label: 'All', icon: ImageIcon },
  { value: 'selfie', label: 'Portraits', icon: Camera },
  { value: 'activity', label: 'Moments', icon: Users },
  { value: 'likeness', label: 'Likeness', icon: Sparkles },
  { value: 'stickers', label: 'Stickers', icon: Smile },
  { value: 'letters', label: 'Letters', icon: Mail },
  { value: 'cards', label: 'Cards', icon: Layers },
  { value: 'uploads', label: 'Your Uploads', icon: Upload },
];

const PAGE_SIZE = 24;

const CARD_EMOJI: Record<string, string> = {
  recipe: '🍳',
  language: '🌐',
  reflection: '💭',
  decision: '⚖️',
  knowledge: '💡',
  habit: '✅',
  practice: '🎯',
};

interface WorldVaultTabProps {
  userId: string;
  memberId: string;
  companionName: string;
}

export default function WorldVaultTab({ userId, memberId, companionName }: WorldVaultTabProps) {
  const media = useCompanionMedia(userId, memberId);
  const collectibles = useCompanionCollectibles(userId, memberId);
  const userUploads = useUserChatUploads(userId);
  const { updateConnection, updateProfile, profile, connections } = useAppContext();

  const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-image`;
  const connection = connections.find(c => c.memberId === memberId);
  // Use ONLY this connection's appearance — never fall back to profile-level (which belongs to a different companion)
  const appearanceDesc = connection?.appearanceDesc || '';
  const referenceImageUrl = connection?.referenceImageUrl || '';

  const handleGenerateSticker = useCallback(async (expression: string): Promise<string | null> => {
    const cached = media.getCachedSticker(expression);
    if (cached) return cached.imageUrl;
    try {
      const resp = await fetch(IMAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: 'sticker',
          stickerExpression: expression,
          companionName,
          companionAppearanceDesc: appearanceDesc,
          referenceImageUrl,
          userId,
        }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.shouldSend && data.imageUrl) {
        await media.saveMedia({
          mediaType: 'sticker',
          imageUrl: data.imageUrl,
          prompt: expression,
          stickerTarget: 'companion',
        });
        return data.imageUrl;
      }
      return null;
    } catch {
      return null;
    }
  }, [media, IMAGE_URL, companionName, appearanceDesc, referenceImageUrl, userId]);
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [lightbox, setLightbox] = useState<CompanionMediaItem | null>(null);
  const [selectedForProfile, setSelectedForProfile] = useState<CompanionMediaItem | null>(null);
  const [collectibleDetail, setCollectibleDetail] = useState<CollectibleItem | null>(null);
  const [page, setPage] = useState(1);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivated = useRef(false);

  const sorted = useMemo(
    () =>
      [...media.media]
        .filter((m) => m.mediaType !== 'sticker')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [media.media]
  );

  const isLikeness = (m: CompanionMediaItem) =>
    m.mediaType === 'likeness' || (m.prompt && m.prompt.toLowerCase().includes('likeness'));

  const isMoment = (m: CompanionMediaItem) =>
    m.mediaType === 'activity' || m.mediaType === 'contextual' || m.mediaType === 'backdrop';

  const isLetterMedia = (m: CompanionMediaItem) =>
    m.mediaType === 'text-image';

  const filtered = useMemo(() => {
    if (filter === 'cards') return [];
    if (filter === 'letters') return sorted.filter(isLetterMedia);
    let items = sorted;
    if (filter === 'likeness') items = sorted.filter(isLikeness);
    else if (filter === 'activity') items = sorted.filter((m) => isMoment(m));
    else if (filter !== 'all') items = sorted.filter((m) => m.mediaType === filter);
    if (filter === 'all') {
      // Exclude text-image (letters) from all — they belong in Letters tab
      const lk = items.filter(isLikeness);
      const rest = items.filter((m) => !isLikeness(m) && !isLetterMedia(m));
      return [...lk, ...rest];
    }
    return items;
  }, [sorted, filter]);

  const filteredCollectibles = useMemo(() => {
    if (filter === 'cards') return collectibles.cards;
    return [];
  }, [filter, collectibles.cards]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const isCollectibleTab = filter === 'cards';
  const isLetterTab = filter === 'letters';
  const paginatedItems = filtered.slice(0, page * PAGE_SIZE);
  const paginatedCollectibles = filteredCollectibles.slice(0, page * PAGE_SIZE);
  const hasMore = isCollectibleTab
    ? page * PAGE_SIZE < filteredCollectibles.length
    : page * PAGE_SIZE < filtered.length;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasMore) setPage((p) => p + 1);
      },
      { threshold: 0, rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page]);

  const loading = media.loading || collectibles.loading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isStickerTab = filter === 'stickers';
  const isUploadsTab = filter === 'uploads';

  const getCount = (value: VaultFilter) => {
    if (value === 'all') return sorted.filter((m) => !isLetterMedia(m)).length + collectibles.collectibles.length;
    if (value === 'likeness') return sorted.filter(isLikeness).length;
    if (value === 'activity') return sorted.filter((m) => isMoment(m)).length;
    if (value === 'stickers') return media.companionStickers.length;
    if (value === 'letters') return sorted.filter(isLetterMedia).length + collectibles.letters.length;
    if (value === 'cards') return collectibles.cards.length;
    if (value === 'uploads') return userUploads.uploads.length;
    return sorted.filter((m) => m.mediaType === value).length;
  };

  const isEmpty = isStickerTab || isUploadsTab ? false : isCollectibleTab ? filteredCollectibles.length === 0 : filtered.length === 0;

  const emptyMessages: Record<string, { title: string; desc: string }> = {
    all: { title: 'No media yet', desc: `Images and cards from chat with ${companionName} will appear here.` },
    selfie: { title: 'No portraits yet', desc: `Portraits generated in chat with ${companionName} will appear here.` },
    activity: { title: 'No moments yet', desc: `Activity images from chat with ${companionName} will appear here.` },
    likeness: { title: 'No likeness photos yet', desc: `Together photos with ${companionName} will appear here.` },
    letters: { title: 'No letters yet', desc: `Letters from ${companionName} will be saved here automatically.` },
    cards: { title: 'No cards yet', desc: `Recipe, reflection, and knowledge cards from ${companionName} will appear here.` },
  };

  const overlayRoot = typeof document !== 'undefined' ? document.body : null;
  const overlays = (
    <>
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col bg-black"
          >
            <div className="relative z-10 flex shrink-0 items-center justify-between bg-black/70 px-4 py-3 backdrop-blur-sm">
              <p className="max-w-[70%] truncate text-xs text-white/60">
                {lightbox.caption || lightbox.mediaType}
              </p>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-4" onClick={() => setLightbox(null)}>
              <img
                src={lightbox.imageUrl}
                alt={lightbox.caption || ''}
                className="max-h-full max-w-full rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="shrink-0 bg-black/70 px-4 pb-4 pt-3 backdrop-blur-sm safe-area-bottom">
              <button
                type="button"
                onClick={async () => {
                  await media.deleteMedia(lightbox.id);
                  setLightbox(null);
                }}
                className="mx-auto flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 active:bg-red-500/40"
              >
                <X className="h-4 w-4" />
                Delete from Vault
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {collectibleDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col bg-black/95"
            onClick={() => setCollectibleDetail(null)}
          >
            <div className="relative z-10 flex shrink-0 items-center justify-end px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setCollectibleDetail(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-5 pb-4" onClick={(e) => e.stopPropagation()}>
              <CollectibleDetailView item={collectibleDetail} companionName={companionName} />
            </div>
            <div className="shrink-0 px-4 py-4 safe-area-bottom" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={async () => {
                  await collectibles.deleteCollectible(collectibleDetail.id);
                  setCollectibleDetail(null);
                }}
                className="mx-auto flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 active:bg-red-500/40"
              >
                <X className="h-4 w-4" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
        {FILTERS.map((opt) => {
          const count = getCount(opt.value);
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
              {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {isUploadsTab ? (
        <WorldUploadsTab userId={userId} embedded />
      ) : isStickerTab ? (
        <StickerGallery
          stickers={media.companionStickers}
          companionName={companionName}
          companionAppearanceDesc={appearanceDesc}
          userId={userId}
          onGenerate={handleGenerateSticker}
          onDelete={media.deleteMedia}
        />
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {filter === 'letters' ? (
              <Mail className="h-5 w-5 text-muted-foreground" />
            ) : filter === 'cards' ? (
              <Layers className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{emptyMessages[filter]?.title || 'Nothing here yet'}</p>
          <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
            {emptyMessages[filter]?.desc || `Content from ${companionName} will appear here.`}
          </p>
        </div>
      ) : isCollectibleTab ? (
        <>
          <div className="space-y-2">
            {paginatedCollectibles.map((item, i) => (
              <CollectibleCard
                key={item.id}
                item={item}
                index={i}
                companionName={companionName}
                onTap={() => setCollectibleDetail(item)}
                onDelete={async () => {
                  await collectibles.deleteCollectible(item.id);
                }}
              />
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="columns-2 sm:columns-3 gap-1.5 sm:gap-2 space-y-1.5 sm:space-y-2">
            {paginatedItems.map((item, i) => (
              (() => {
                const canSetProfile =
                  item.mediaType === 'selfie' ||
                  item.mediaType === 'likeness' ||
                  item.mediaType === 'activity';

                return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => {
                  if (longPressActivated.current) return;
                  setLightbox(item);
                }}
                onPointerDown={canSetProfile ? () => {
                  longPressActivated.current = false;
                  pressTimer.current = setTimeout(() => {
                    longPressActivated.current = true;
                    setSelectedForProfile(item);
                  }, 600);
                } : undefined}
                onPointerUp={canSetProfile ? () => {
                  longPressActivated.current = false;
                  if (pressTimer.current) clearTimeout(pressTimer.current);
                } : undefined}
                onPointerLeave={canSetProfile ? () => {
                  if (pressTimer.current) clearTimeout(pressTimer.current);
                } : undefined}
                className={`group relative w-full break-inside-avoid overflow-hidden rounded-lg sm:rounded-xl border ${
                  isLikeness(item) ? 'border-amber-400/80 ring-2 ring-amber-400/30' : 'border-border/30'
                }`}
              >
                <ResilientImage
                  src={item.imageUrl}
                  alt={item.caption || item.mediaType}
                  wrapperClassName="w-full aspect-square"
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-1 left-1">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-sm ${
                      isLikeness(item) ? 'bg-amber-500/70 text-white' : 'bg-black/50 text-white'
                    }`}
                  >
                    {isLikeness(item) ? '👫✨' : isLetterMedia(item) ? '💌' : item.mediaType === 'selfie' ? '📸' : '🎨'}
                  </span>
                </div>
              </motion.button>
                );
              })()
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </>
      )}

      {selectedForProfile && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-8 bg-background/95 backdrop-blur-xl border-t border-white/[0.08] rounded-t-2xl">
          <div className="flex flex-col items-center gap-4">
            <img
              src={selectedForProfile.imageUrl}
              className="h-20 w-20 rounded-2xl object-cover border border-white/10"
            />
            <p className="text-sm text-white/70 text-center">
              Set this as their profile image?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setSelectedForProfile(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedForProfile || !memberId) return;
                  await updateConnection(memberId, {
                    avatarUrl: selectedForProfile.imageUrl,
                    backgroundUrl: selectedForProfile.imageUrl,
                  });
                  await updateProfile({
                    companionAvatarUrl: selectedForProfile.imageUrl
                  });
                  setSelectedForProfile(null);
                  toast.success('Profile image updated');
                }}
                className="flex-1 py-3 rounded-xl bg-primary/10 border border-primary/30 text-sm text-primary font-medium"
              >
                Set as profile
              </button>
            </div>
          </div>
        </div>
      )}

      {overlayRoot ? createPortal(overlays, overlayRoot) : overlays}
    </div>
  );
}

function CollectibleCard({
  item,
  index,
  companionName,
  onTap,
}: {
  item: CollectibleItem;
  index: number;
  companionName: string;
  onTap: () => void;
  onDelete: () => void;
}) {
  const emoji = item.type === 'letter' ? '💌' : CARD_EMOJI[item.type] || '📋';
  const dateStr = (() => {
    try {
      return format(new Date(item.createdAt), 'MMM d');
    } catch {
      return '';
    }
  })();

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={onTap}
      className="flex w-full items-start gap-2.5 sm:gap-3 rounded-xl border border-border/30 bg-secondary/40 px-2.5 sm:px-3 py-2.5 sm:py-3 text-left transition-colors hover:bg-secondary/60 active:bg-secondary/80"
    >
      <span className="mt-0.5 shrink-0 text-lg">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
          {item.title || (item.type === 'letter' ? `Letter from ${companionName}` : item.type)}
        </p>
        {item.type === 'letter' && item.content?.text && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.content.text}</p>
        )}
        {item.type === 'recipe' && item.content?.ingredients && (
          <p className="mt-0.5 text-xs text-muted-foreground">{(item.content.ingredients as string[]).length} ingredients</p>
        )}
        {item.type !== 'letter' && item.type !== 'recipe' && item.content?.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.content.body}</p>
        )}
      </div>
      <span className="mt-1 shrink-0 text-[10px] text-muted-foreground/60 hidden sm:inline">{dateStr}</span>
    </motion.button>
  );
}

function CollectibleDetailView({ item, companionName }: { item: CollectibleItem; companionName: string }) {
  const dateStr = (() => {
    try {
      return format(new Date(item.createdAt), 'MMMM d, yyyy');
    } catch {
      return '';
    }
  })();

  if (item.type === 'letter') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="mb-4 text-xs text-amber-400/70">{dateStr}</p>
        <div className="w-full max-w-sm rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6">
          <p className="mb-3 text-xs text-amber-400/60">💌 A letter from {companionName}</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90" style={{ fontFamily: "'Playfair Display', serif" }}>
            {item.content?.text || ''}
          </p>
        </div>
      </div>
    );
  }

  const emoji = CARD_EMOJI[item.type] || '📋';
  return (
    <div className="mx-auto max-w-sm">
      <p className="mb-4 text-center text-xs text-muted-foreground/60">{dateStr}</p>
      <div className="rounded-2xl border border-border/30 bg-secondary/30 p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <p className="text-sm font-semibold text-foreground">{item.title || item.type}</p>
        </div>

        {item.type === 'recipe' && (
          <div className="space-y-3">
            {Array.isArray(item.content?.ingredients) && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Ingredients</p>
                <ul className="space-y-0.5 text-xs text-foreground/80">
                  {(item.content.ingredients as string[]).map((ing, i) => (
                    <li key={i}>• {ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(item.content?.steps) && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Steps</p>
                <ol className="list-inside list-decimal space-y-1 text-xs text-foreground/80">
                  {(item.content.steps as string[]).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {item.type === 'language' && (
          <LanguageCard
            phrase={item.content?.phrase || ''}
            translation={item.content?.translation || ''}
            lang={item.content?.lang || 'en'}
            phonetic={item.content?.phonetic}
          />
        )}

        {item.type === 'knowledge' && <p className="text-xs leading-relaxed text-foreground/80">{item.content?.body || ''}</p>}

        {item.type === 'reflection' && <p className="text-sm italic text-foreground/80">"{item.content?.prompt || ''}"</p>}

        {item.type === 'decision' && (
          <div className="space-y-2">
            <p className="text-sm text-foreground/90">{item.content?.question || ''}</p>
            {Array.isArray(item.content?.options) && (
              <div className="flex flex-wrap gap-1.5">
                {(item.content.options as string[]).map((opt, i) => (
                  <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/70">
                    {opt}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {item.type === 'habit' && (
          <div className="flex items-center gap-2">
            {item.content?.emoji && <span className="text-lg">{item.content.emoji}</span>}
            <p className="text-sm text-foreground/80">{item.content?.title || item.title}</p>
          </div>
        )}

        {item.type === 'practice' && (
          <PracticeCard
            scenario={item.content?.scenario || ''}
            phrase={item.content?.phrase}
            tip={item.content?.tip}
          />
        )}
      </div>
    </div>
  );
}
