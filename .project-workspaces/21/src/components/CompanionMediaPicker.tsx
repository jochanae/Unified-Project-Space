import { useState, useRef, useEffect } from 'react';
import { Smile, Camera, Palette, X, Loader2, Users, ImagePlus, FileText, Wand2, PenLine, Sparkles } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CompanionMediaItem } from '@/hooks/useCompanionMedia';
import { AnimatePresence, motion } from 'framer-motion';
import { cardRequestOptions } from './CardRequestMenu';

const STICKER_EXPRESSIONS = [
  { emoji: '😊', label: 'Happy', prompt: 'beaming with joy, big smile' },
  { emoji: '🥰', label: 'Love', prompt: 'heart eyes, blushing with love' },
  { emoji: '😢', label: 'Sad', prompt: 'tearful, looking sad but hopeful' },
  { emoji: '🤗', label: 'Hug', prompt: 'arms open wide for a warm hug' },
  { emoji: '😤', label: 'Fired up', prompt: 'determined, pumping fist with energy' },
  { emoji: '😴', label: 'Sleepy', prompt: 'drowsy, yawning cutely' },
  { emoji: '🎉', label: 'Celebrate', prompt: 'celebrating with confetti, excited' },
  { emoji: '💪', label: 'Strong', prompt: 'flexing muscles, looking confident' },
];

interface CompanionMediaPickerProps {
  companionName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSendSticker: (expression: string) => void;
  onSendSelfie: () => void;
  onSendActivity: (activity: string) => void;
  onSendLikeness: (scene?: string) => void;
  onSendTextImage?: (textImageType: 'letter' | 'postcard' | 'milestone' | 'note' | 'card', textContent: string) => void;
  onSendEditImage?: (sourceImageUrl: string, editInstruction: string) => void;
  loading: boolean;
  hasUserLikeness?: boolean;
  cachedStickers?: CompanionMediaItem[];
  batchGenerating?: Set<string>;
  onAutoGenerateStickers?: (missing: { prompt: string }[]) => void;
  onSendCachedSticker?: (imageUrl: string, caption?: string, stickerId?: string) => void;
  onTakePhoto?: () => void;
  onFromGallery?: () => void;
  onFromFiles?: () => void;
  onCardRequest?: (prompt: string, cardType: string) => void;
  activeCardType?: string | null;
  /** Recent companion images for the edit tab */
  recentImages?: { imageUrl: string; caption?: string }[];
  hasCompanionAppearance?: boolean;
  onNavigateToSettings?: () => void;
  situationalMode?: string | null;
}

export default function CompanionMediaPicker({
  companionName = 'Companion',
  isOpen,
  onClose,
  onSendSticker,
  onSendSelfie,
  onSendActivity,
  onSendLikeness,
  onSendTextImage,
  onSendEditImage,
  loading,
  hasUserLikeness = false,
  cachedStickers = [],
  batchGenerating = new Set<string>(),
  onAutoGenerateStickers,
  onSendCachedSticker,
  onTakePhoto,
  onFromGallery,
  onFromFiles,
  onCardRequest,
  activeCardType,
  recentImages = [],
  hasCompanionAppearance = false,
  onNavigateToSettings,
  situationalMode = null,
}: CompanionMediaPickerProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'sticker' | 'selfie' | 'activity' | 'together' | 'files' | 'letters' | 'edit'>('sticker');
  const [activityInput, setActivityInput] = useState('');
  const [likenessInput, setLikenessInput] = useState('');
  const [letterInput, setLetterInput] = useState('');
  const [letterType, setLetterType] = useState<'letter' | 'postcard' | 'milestone' | 'note' | 'card'>('letter');
  const [editInput, setEditInput] = useState('');
  const [selectedEditImage, setSelectedEditImage] = useState<string | null>(null);
  const [previewSticker, setPreviewSticker] = useState<CompanionMediaItem | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate missing stickers when the picker opens on the sticker tab
  const autoGenTriggered = useRef(false);
  useEffect(() => {
    if (!isOpen || activeTab !== 'sticker' || autoGenTriggered.current) return;
    const missing = STICKER_EXPRESSIONS.filter((e) => !cachedStickers.find((s) => s.prompt === e.prompt));
    if (missing.length > 0 && missing.length <= 8 && onAutoGenerateStickers) {
      autoGenTriggered.current = true;
      onAutoGenerateStickers(missing);
    }
  }, [isOpen, activeTab, cachedStickers, onAutoGenerateStickers]);

  // Reset trigger when picker closes
  useEffect(() => {
    if (!isOpen) autoGenTriggered.current = false;
  }, [isOpen]);

  const getCached = (prompt: string) => cachedStickers.find((s) => s.prompt === prompt);

  const handlePointerDown = (cached: CompanionMediaItem) => {
    longPressTimer.current = setTimeout(() => {
      setPreviewSticker(cached);
    }, 400);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (s: typeof STICKER_EXPRESSIONS[0], cached: CompanionMediaItem | undefined) => {
    if (previewSticker) return;
    if (cached && onSendCachedSticker) {
      onSendCachedSticker(cached.imageUrl, cached.caption || undefined, cached.id);
    } else {
      onSendSticker(s.prompt);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent className="border-border/60 bg-card max-h-[85vh]">
        {/* Long-press preview overlay */}
        <AnimatePresence>
          {previewSticker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-t-2xl bg-background/95 backdrop-blur-sm"
              onClick={() => setPreviewSticker(null)}
            >
              <img
                src={previewSticker.imageUrl}
                alt="Sticker preview"
                className="h-40 w-40 rounded-2xl object-cover shadow-lg border border-border/40"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Sent {previewSticker.usageCount} time{previewSticker.usageCount !== 1 ? 's' : ''} · Tap to dismiss
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSendCachedSticker) {
                    onSendCachedSticker(previewSticker.imageUrl, previewSticker.caption || undefined, previewSticker.id);
                  }
                  setPreviewSticker(null);
                }}
                className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
              >
                Send sticker
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header / Tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
          <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto no-scrollbar">
            <TabButton active={activeTab === 'sticker'} icon={<Smile className="h-4 w-4" />} label="Stickers" onClick={() => setActiveTab('sticker')} />
            <TabButton active={activeTab === 'selfie'} icon={<Camera className="h-4 w-4" />} label="Selfie" onClick={() => setActiveTab('selfie')} />
            <TabButton active={activeTab === 'files'} icon={<ImagePlus className="h-4 w-4" />} label="Share" onClick={() => setActiveTab('files')} />
            <TabButton active={activeTab === 'activity'} icon={<Palette className="h-4 w-4" />} label="Activity" onClick={() => setActiveTab('activity')} />
            <TabButton active={activeTab === 'together'} icon={<Users className="h-4 w-4" />} label="Together" onClick={() => setActiveTab('together')} />
            <TabButton active={activeTab === 'letters'} icon={<PenLine className="h-4 w-4" />} label="Letters" onClick={() => setActiveTab('letters')} />
            {recentImages.length > 0 && (
              <TabButton active={activeTab === 'edit'} icon={<Sparkles className="h-4 w-4" />} label="Edit" onClick={() => setActiveTab('edit')} />
            )}
            <TabButton active={activeTab === 'cards'} icon={<Wand2 className="h-4 w-4" />} label="Cards" onClick={() => setActiveTab('cards')} />
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 max-h-[60vh] overflow-y-auto overscroll-contain">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating…</span>
            </div>
          )}

          {/* Cards tab */}
          {!loading && activeTab === 'cards' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-xs text-muted-foreground text-center max-w-[260px]">
                Ask your companion to create an interactive card
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {cardRequestOptions.map((opt) => {
                  const isStrategicHL = opt.cardType === 'blueprint' && situationalMode === 'strategic';
                  return (
                    <button
                      key={opt.label}
                      onClick={() => {
                        onCardRequest?.(opt.prompt, opt.cardType);
                        onClose();
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all active:scale-95 ${
                        activeCardType === opt.cardType
                          ? 'ring-1 ring-primary/40 bg-primary/10'
                          : isStrategicHL
                          ? 'ring-1 ring-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.08)] shadow-[0_0_18px_rgba(212,175,55,0.15)]'
                          : 'bg-secondary/40 hover:bg-secondary/70'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className={`text-xs font-semibold ${isStrategicHL ? 'text-[rgba(212,175,55,0.95)]' : 'text-foreground'}`}>{opt.label}</span>
                      {isStrategicHL && (
                        <span className="text-[8.5px] font-semibold tracking-[0.16em] text-[rgba(212,175,55,0.85)]">ACTIVE</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && activeTab === 'sticker' && (
            <div className="flex flex-col gap-2">
              {/* Empty state: no appearance to generate stickers from */}
              {!hasCompanionAppearance && !hasUserLikeness && cachedStickers.length === 0 && batchGenerating.size === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60">
                    <Smile className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                    Add a photo or describe your companion's look in Settings to generate a custom sticker pack
                  </p>
                  <button
                    onClick={() => { onClose(); onNavigateToSettings?.(); }}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
                  >
                    Go to Settings
                  </button>
                </div>
              ) : (
              <>
              <p className="text-[11px] text-muted-foreground text-center">
                {batchGenerating.size > 0
                  ? `Generating sticker pack… ${cachedStickers.length} of ${STICKER_EXPRESSIONS.length} ready`
                  : hasUserLikeness ? "Your expressions — tap any to send in chat" : `${companionName}'s expressions — tap any to send in chat`}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[...STICKER_EXPRESSIONS]
                  .sort((a, b) => {
                    const aUsage = getCached(a.prompt)?.usageCount ?? -1;
                    const bUsage = getCached(b.prompt)?.usageCount ?? -1;
                    return bUsage - aUsage;
                  })
                  .map((s) => {
                  const cached = getCached(s.prompt);
                  const isGenerating = batchGenerating.has(s.prompt);
                  return (
                    <button
                      key={s.label}
                      onClick={() => !isGenerating && handleClick(s, cached)}
                      onPointerDown={cached ? () => handlePointerDown(cached) : undefined}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      disabled={isGenerating}
                      className="flex flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-secondary/60 active:scale-95 transition-all select-none disabled:opacity-60"
                    >
                      {cached ? (
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border/30">
                          <img src={cached.imageUrl} alt={s.label} className="h-full w-full object-cover" loading="lazy" draggable={false} />
                          {cached.usageCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                              {cached.usageCount}
                            </span>
                          )}
                        </div>
                      ) : isGenerating ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/30 bg-secondary/30">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center text-2xl">{s.emoji}</span>
                      )}
                      <span className="text-[10px] font-semibold text-muted-foreground">{s.label}</span>
                    </button>
                  );
                })}
              </div>
              </>
              )}
            </div>
          )}

          {!loading && activeTab === 'selfie' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                Request a selfie — if they have a defined look, you'll get a portrait. Otherwise, a cozy POV moment from their day.
              </p>
              <p className="text-[10px] text-muted-foreground/60 text-center max-w-[220px]">
                AI-generated image. Love it? Tap "Use as their look" to make it their reference for all future images.
              </p>
              <button
                onClick={onSendSelfie}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
              >
                📸 Request selfie
              </button>
            </div>
          )}

          {!loading && activeTab === 'together' && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  {hasUserLikeness
                    ? "Create a memory together — AI-imagined moments of you and your companion in a scene of your choosing. Not real, but they can feel like memories."
                    : "Upload your photo in Settings first to enable together photos"}
                </p>
              </div>
              {hasUserLikeness && (
                <>
                  <div className="flex gap-2">
                    <input
                      value={likenessInput}
                      onChange={(e) => setLikenessInput(e.target.value)}
                      placeholder="e.g. at a coffee shop, at the movies…"
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onSendLikeness(likenessInput.trim() || undefined);
                          setLikenessInput('');
                        }
                      }}
                    />
                    <button
                      onClick={() => { onSendLikeness(likenessInput.trim() || undefined); setLikenessInput(''); }}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
                    >
                      Go
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['coffee shop hangout', 'movie night', 'sunset walk', 'cooking together'].map((a) => (
                      <button
                        key={a}
                        onClick={() => onSendLikeness(a)}
                        className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onSendLikeness(undefined)}
                    className="rounded-full bg-primary/10 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all"
                  >
                    ✨ Surprise me (based on our chat)
                  </button>
                </>
              )}
            </div>
          )}

          {!loading && activeTab === 'files' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                <ImagePlus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                Share a photo, selfie, or document into the conversation
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => { onTakePhoto?.(); onClose(); }}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </button>
                <button
                  onClick={() => { onFromGallery?.(); onClose(); }}
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all"
                >
                  <ImagePlus className="h-4 w-4" />
                  Gallery
                </button>
                <button
                  onClick={() => { onFromFiles?.(); onClose(); }}
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all"
                >
                  <FileText className="h-4 w-4" />
                  Document
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 text-center max-w-[240px]">
                Supports TXT, CSV, JSON, Markdown, code files & more
              </p>
            </div>
          )}

          {!loading && activeTab === 'activity' && (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-xs text-muted-foreground">
                Describe an activity to see your companion doing it
              </p>
              <div className="flex gap-2">
                <input
                  value={activityInput}
                  onChange={(e) => setActivityInput(e.target.value)}
                  placeholder="e.g. cooking pasta, hiking in the mountains…"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && activityInput.trim()) {
                      onSendActivity(activityInput.trim());
                      setActivityInput('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (activityInput.trim()) {
                      onSendActivity(activityInput.trim());
                      setActivityInput('');
                    }
                  }}
                  disabled={!activityInput.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  Go
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['cooking dinner', 'reading a book', 'walking in the rain', 'watching sunset'].map((a) => (
                  <button
                    key={a}
                    onClick={() => onSendActivity(a)}
                    className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Letters tab — generate handwritten letter/card images */}
          {!loading && activeTab === 'letters' && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  Generate a beautiful handwritten image with legible text
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {([
                  { type: 'letter' as const, emoji: '💌', label: 'Letter' },
                  { type: 'postcard' as const, emoji: '🏞️', label: 'Postcard' },
                  { type: 'milestone' as const, emoji: '🎉', label: 'Milestone' },
                  { type: 'note' as const, emoji: '📝', label: 'Note' },
                  { type: 'card' as const, emoji: '🎴', label: 'Card' },
                ]).map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setLetterType(t.type)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      letterType === t.type
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={letterInput}
                onChange={(e) => setLetterInput(e.target.value)}
                placeholder={
                  letterType === 'milestone' ? 'e.g. 100 days together! You mean so much to me…'
                  : letterType === 'note' ? 'e.g. Don\'t forget to drink water today 💧'
                  : 'Write what you want the letter to say…'
                }
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
              />
              <button
                onClick={() => {
                  if (letterInput.trim() && onSendTextImage) {
                    onSendTextImage(letterType, letterInput.trim());
                    setLetterInput('');
                    onClose();
                  }
                }}
                disabled={!letterInput.trim() || !onSendTextImage}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 self-center"
              >
                ✨ Generate {letterType}
              </button>
            </div>
          )}

          {/* Edit tab — modify an existing companion image */}
          {!loading && activeTab === 'edit' && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  Select an image and describe what to change — same person, new look
                </p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto overscroll-contain">
                {recentImages.slice(0, 12).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedEditImage(img.imageUrl)}
                    className={`rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                      selectedEditImage === img.imageUrl
                        ? 'border-primary ring-1 ring-primary/30 scale-105'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={img.imageUrl} alt={img.caption || 'Companion image'} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
              {selectedEditImage && (
                <>
                  <input
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    placeholder="e.g. change to a winter coat, add sunglasses, beach background…"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editInput.trim()) {
                        onSendEditImage?.(selectedEditImage, editInput.trim());
                        setEditInput('');
                        setSelectedEditImage(null);
                        onClose();
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['change outfit to winter coat', 'add sunglasses', 'beach background', 'evening formal wear'].map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          onSendEditImage?.(selectedEditImage, a);
                          setSelectedEditImage(null);
                          onClose();
                        }}
                        className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (editInput.trim()) {
                        onSendEditImage?.(selectedEditImage, editInput.trim());
                        setEditInput('');
                        setSelectedEditImage(null);
                        onClose();
                      }
                    }}
                    disabled={!editInput.trim()}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 self-center"
                  >
                    ✨ Apply edit
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors flex-shrink-0 ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
