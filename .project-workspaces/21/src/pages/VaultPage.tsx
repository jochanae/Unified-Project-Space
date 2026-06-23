// PERF: 2026-03-15 — Added skeleton loaders — eliminates layout shift during data load
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Palette, Users, Sparkles, X, Trash2, Image as ImageIcon, TrendingUp, Brain, Edit3, Trash, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useCompanionMedia, CompanionMediaItem } from '@/hooks/useCompanionMedia';
import { supabase } from '@/integrations/supabase/client';
import defaultHeroBg from '@/assets/default-hero-bg.jpg';
import DiscoveryHint from '@/components/DiscoveryHint';
import { DISCOVERY_KEYS } from '@/hooks/useFeatureDiscovery';

type VaultFilter = 'all' | 'selfie' | 'activity' | 'likeness';

const FILTERS: { value: VaultFilter; label: string; icon: typeof Camera }[] = [
  { value: 'all', label: 'All', icon: ImageIcon },
  { value: 'selfie', label: 'Portraits', icon: Camera },
  { value: 'activity', label: 'Circle Moments', icon: Users },
  { value: 'likeness', label: 'Likeness', icon: Sparkles },
];

const PAGE_SIZE = 24;
const MEMORIES_PAGE_SIZE = 20;

export default function VaultPage() {
  const { user, connections, companionMemberId, activeConnection } = useAppContext();
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [lightbox, setLightbox] = useState<CompanionMediaItem | null>(null);
  const [page, setPage] = useState(1);
  const [memories, setMemories] = useState<{ id: string; text: string; category: string }[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesLoadingMore, setMemoriesLoadingMore] = useState(false);
  const [memoriesHasMore, setMemoriesHasMore] = useState(false);
  const [memoriesCursor, setMemoriesCursor] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<{ id: string; content: string; mood_tag: string | null; created_at: string }[]>([]);
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);
  const navigate = useNavigate();

  const activeMedia = useCompanionMedia(user?.id ?? null, companionMemberId);
  const loading = activeMedia.loading;

  const companionAvatar = activeConnection?.avatarUrl;

  const [memoryTimes, setMemoryTimes] = useState<number[]>([]);

  // Fetch initial memories (most recent MEMORIES_PAGE_SIZE)
  useEffect(() => {
    if (!user?.id) return;
    setMemoriesLoading(true);
    let query = supabase
      .from('memories')
      .select('id, text, category, extracted_at')
      .eq('user_id', user.id);
    if (companionMemberId) {
      query = query.eq('member_id', companionMemberId);
    }
    query
      .order('extracted_at', { ascending: false })
      .limit(MEMORIES_PAGE_SIZE + 1)
      .then(({ data }) => {
        const rows = data || [];
        setMemoriesHasMore(rows.length > MEMORIES_PAGE_SIZE);
        const page = rows.length > MEMORIES_PAGE_SIZE ? rows.slice(0, MEMORIES_PAGE_SIZE) : rows;
        setMemories(page.map(m => ({ id: m.id, text: m.text, category: m.category })));
        setMemoryTimes(page.map(m => new Date(m.extracted_at).getTime()));
        setMemoriesCursor(page.length > 0 ? page[page.length - 1].extracted_at : null);
        setMemoriesLoading(false);
      });
  }, [user?.id, companionMemberId]);

  const loadMoreMemories = async () => {
    if (!user?.id || !memoriesHasMore || memoriesLoadingMore || !memoriesCursor) return;
    setMemoriesLoadingMore(true);
    let query = supabase
      .from('memories')
      .select('id, text, category, extracted_at')
      .eq('user_id', user.id)
      .lt('extracted_at', memoriesCursor);
    if (companionMemberId) {
      query = query.eq('member_id', companionMemberId);
    }
    const { data } = await query
      .order('extracted_at', { ascending: false })
      .limit(MEMORIES_PAGE_SIZE + 1);
    const rows = data || [];
    setMemoriesHasMore(rows.length > MEMORIES_PAGE_SIZE);
    const page = rows.length > MEMORIES_PAGE_SIZE ? rows.slice(0, MEMORIES_PAGE_SIZE) : rows;
    setMemories(prev => [...prev, ...page.map(m => ({ id: m.id, text: m.text, category: m.category }))]);
    setMemoryTimes(prev => [...prev, ...page.map(m => new Date(m.extracted_at).getTime())]);
    setMemoriesCursor(page.length > 0 ? page[page.length - 1].extracted_at : null);
    setMemoriesLoadingMore(false);
  };

  // Fetch recent non-private journal entries
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('journal_entries')
      .select('id, content, mood_tag, created_at')
      .eq('user_id', user.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setJournalEntries(data || []);
      });
  }, [user?.id]);

  const sorted = useMemo(() =>
    [...activeMedia.media]
      .filter(m => m.mediaType !== 'sticker')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activeMedia.media]
  );

  const isLikenessItem = (m: CompanionMediaItem) =>
    m.mediaType === 'likeness' || (m.prompt && m.prompt.toLowerCase().includes('likeness'));

  const filtered = useMemo(() => {
    const isMoment = (m: CompanionMediaItem) =>
      m.mediaType === 'activity' || m.mediaType === 'contextual' || m.mediaType === 'backdrop';

    let items = sorted;
    if (filter === 'likeness') items = sorted.filter(isLikenessItem);
    else if (filter === 'activity') items = sorted.filter(m => isMoment(m));
    else if (filter !== 'all') items = sorted.filter(m => m.mediaType === filter);

    if (filter === 'all') {
      const likeness = items.filter(isLikenessItem);
      const rest = items.filter(m => !isLikenessItem(m));
      return [...likeness, ...rest];
    }
    return items;
  }, [sorted, filter]);

  // Reset page when filter changes
  const prevFilter = useMemo(() => filter, [filter]);
  useMemo(() => { setPage(1); }, [prevFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedItems = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = page < totalPages;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasMore) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0, rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page]);

  const mostUsed = useMemo(() =>
    [...sorted].filter(m => m.usageCount > 0).sort((a, b) => b.usageCount - a.usageCount).slice(0, 8),
    [sorted]
  );

  const handleDelete = (id: string) => {
    activeMedia.deleteMedia(id);
  };

  const companionName = activeConnection?.name || 'Your Friend';

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector('[data-app-scroller]') || document.querySelector('main') || document.documentElement;
    const onScroll = () => setScrolled((el as HTMLElement).scrollTop > 60);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Cinematic background — companion blurred or default obsidian */}
      <div className="fixed inset-0 z-0">
        <img
          src={defaultHeroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: companionAvatar ? 0 : 1, filter: 'blur(40px) brightness(0.6)' }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
          style={{
            opacity: companionAvatar ? 0 : 1,
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
          }}
        />
        {companionAvatar && (
          <img
            src={companionAvatar}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ filter: 'blur(40px) brightness(0.5)', opacity: 1 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />
      </div>

      {/* Sticky Header */}
      <motion.div
        className="relative z-30 shrink-0 sticky top-0 md:-mx-[max(2rem,env(safe-area-inset-left,0px))] md:px-[max(2rem,env(safe-area-inset-left,0px))]"
        style={{
          background: scrolled ? 'rgba(0,0,0,0.6)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
          willChange: 'transform',
        }}
      >
        <div className="px-4 pt-4">
          <DiscoveryHint featureKey={DISCOVERY_KEYS.VAULT_TAB} userId={user?.id} icon="🔒" title="Your Vault" body="Memories, milestones, and moments your companions have collected about you." />
        </div>
        <div className="px-4 pt-4">
          <div className="relative">
            {/* Expanded */}
            <motion.div
              animate={{ opacity: scrolled ? 0 : 1, y: scrolled ? -4 : 0, position: scrolled ? 'absolute' as const : 'relative' as const }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pb-4"
              style={{ pointerEvents: scrolled ? 'none' : 'auto' }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-white/70 backdrop-blur-sm border border-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {companionName}'s Vault
                  </h1>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {filtered.length} item{filtered.length !== 1 ? 's' : ''} archived
                  </p>
                </div>
              </div>
            </motion.div>
            {/* Compact */}
            <motion.div
              animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : 4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center gap-2.5 pb-3"
              style={{ pointerEvents: scrolled ? 'auto' : 'none' }}
            >
              <button
                onClick={() => navigate(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/70 border border-white/[0.06]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <h1 className="font-serif text-sm font-bold text-white">{companionName}'s Vault</h1>
              <span className="text-[10px] text-white/40 ml-auto tabular-nums">{filtered.length} items</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scrollable content */}
      <div className="relative z-10 pb-24">

        {/* Most Used */}
        {mostUsed.length > 0 && (
          <div className="px-4 mb-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
              <TrendingUp className="h-3 w-3" /> Most Used
            </h4>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {mostUsed.map(item => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(item)}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}
                >
                  <img src={item.imageUrl} alt={item.caption || ''} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {item.usageCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Things I Remember About My Friend */}
        {memories.length === 0 && !memoriesLoading ? (
          <div className="px-4 mb-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
              <Brain className="h-3 w-3" /> Things I Remember About {companionName}
            </h4>
            <div
              className="rounded-2xl border border-white/10 p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
            >
              <p className="text-xs text-white/50 italic">
                Chat more with {companionName} to build shared memories ✨
              </p>
            </div>
          </div>
        ) : memories.length > 0 ? (
          <div className="px-4 mb-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
              <Brain className="h-3 w-3" /> Things I Remember About {companionName}
            </h4>
            <div
              className="rounded-2xl border border-white/10 p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
            >
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="group flex items-start gap-2.5 rounded-xl px-3 py-2 bg-white/5 border border-white/5"
                >
                  <span className="mt-0.5 text-xs">
                    {mem.category === 'About you' ? '🧑' : mem.category === 'Your heart' ? '❤️' : mem.category === 'Your wellbeing' ? '🌿' : '💭'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 leading-relaxed">{mem.text}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{mem.category}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const idx = memories.findIndex(m => m.id === mem.id);
                      await supabase.from('memories').delete().eq('id', mem.id).eq('user_id', user.id);
                      setMemories(prev => prev.filter(m => m.id !== mem.id));
                      setMemoryTimes(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="mt-0.5 shrink-0 rounded-full p-1 text-white/30 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                    aria-label="Delete memory"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {memoriesHasMore && (
                memoriesLoadingMore ? (
                  <div className="flex justify-center py-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <button
                    onClick={loadMoreMemories}
                    className="w-full py-3 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors border-t border-border/20 mt-2"
                  >
                    Load more memories
                  </button>
                )
              )}
            </div>
          </div>
        ) : null}

        {/* Journal Reflections */}
        {journalEntries.length > 0 && (
          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                <BookOpen className="h-3 w-3" /> Journal Reflections
              </h4>
              <button
                onClick={() => navigate('/wellness?tab=journal')}
                className="flex items-center gap-0.5 text-[10px] text-primary/70 hover:text-primary transition-colors"
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div
              className="rounded-2xl border border-white/10 p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
            >
              {journalEntries.map((entry) => {
                const isExpanded = expandedJournal === entry.id;
                const preview = entry.content.length > 80 ? entry.content.slice(0, 80) + '…' : entry.content;
                const entryTime = new Date(entry.created_at).getTime();
                const hasMemory = memoryTimes.some(t => t >= entryTime && t <= entryTime + 10 * 60 * 1000);
                return (
                  <button
                    key={entry.id}
                    onClick={() => setExpandedJournal(isExpanded ? null : entry.id)}
                    className="w-full text-left group flex items-start gap-2.5 rounded-xl px-3 py-2 bg-white/5 border border-white/5 hover:bg-white/8 transition-colors"
                  >
                    <span className="mt-0.5 text-xs shrink-0">
                      {entry.mood_tag || '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 leading-relaxed">
                        {isExpanded ? entry.content : `"${preview}"`}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {format(new Date(entry.created_at), 'MMM d')}
                      </p>
                      {hasMemory && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary/50 mt-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                          remembered
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          {FILTERS.map(opt => {
            const count = opt.value === 'all' ? sorted.length
              : opt.value === 'likeness' ? sorted.filter(isLikenessItem).length
              : opt.value === 'activity' ? sorted.filter(m => m.mediaType === 'activity' || m.mediaType === 'contextual' || m.mediaType === 'backdrop').length
              : sorted.filter(m => m.mediaType === opt.value).length;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
                {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col gap-3 px-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <ImageIcon className="h-6 w-6 text-white/50" />
            </div>
            <p className="text-sm font-semibold text-white">No media yet</p>
            <p className="mt-1 max-w-[240px] text-xs text-white/50">
              Images generated in chat with {companionName} will auto-archive here.
            </p>
          </div>
        ) : (
          <div className="px-2">
            <div className="columns-3 gap-2 space-y-2">
              {paginatedItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => setLightbox(item)}
                  className={`group relative w-full break-inside-avoid overflow-hidden rounded-xl border ${
                    isLikenessItem(item)
                      ? 'border-amber-400/80 ring-2 ring-amber-400/30'
                      : 'border-white/10'
                  }`}
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.caption || item.mediaType}
                    className="w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-1 left-1 flex items-center gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-sm ${
                      isLikenessItem(item) ? 'bg-amber-500/70 text-white' : 'bg-black/50 text-white'
                    }`}>
                      {isLikenessItem(item) ? '👫✨' : item.mediaType === 'selfie' ? '📸' : item.mediaType === 'activity' ? '🎨' : '😊'}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* Page indicator */}
            {totalPages > 1 && (
              <p className="text-center text-[11px] text-white/40 pb-4">
                Showing {paginatedItems.length} of {filtered.length}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
              className="absolute inset-0 flex flex-col bg-background"
            >
              <button
                onClick={() => setLightbox(null)}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <img src={lightbox.imageUrl} alt={lightbox.caption || ''} className="w-full flex-1 object-contain" />
              <div className="p-4 space-y-2">
                {lightbox.caption && <p className="text-center text-sm text-foreground">{lightbox.caption}</p>}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>{companionName}</span>
                  {lightbox.usageCount > 0 && <span>· Sent {lightbox.usageCount}×</span>}
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => { handleDelete(lightbox.id); setLightbox(null); }}
                    className="flex items-center gap-1.5 rounded-full bg-destructive/80 px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
