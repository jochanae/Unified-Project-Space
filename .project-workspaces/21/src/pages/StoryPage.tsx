import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import CinematicHeader from '@/components/shared/CinematicHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useStoryTimeline, groupByDate, type TimelineEntryType } from '@/hooks/useStoryTimeline';
import MilestoneCard from '@/components/story/MilestoneCard';
import TimelineEntryCard from '@/components/story/TimelineEntryCard';
import StoryRecapCard from '@/components/story/StoryRecapCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useSubscription } from '@/hooks/useSubscription';

const FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'memory', label: 'Memories' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'moment', label: 'Saved' },
  { key: 'plan', label: 'Plans' },
  { key: 'mood', label: 'Moods' },
];

export default function StoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, activeConnection, connections } = useAppContext();
  const { allEntries, loading, displayCount, loadMore } = useStoryTimeline(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);
  const { subscribed } = useSubscription(user?.id);
  const [filter, setFilter] = useState('all');
  const [scrolled, setScrolled] = useState(false);

  const companionParam = searchParams.get('companion');
  const filteredCompanion = connections?.find(c => c.memberId === companionParam);
  const companionName = filteredCompanion?.name || activeConnection?.name || 'your companion';

  const filtered = useMemo(() => {
    if (filter === 'all') return allEntries;
    return allEntries.filter(e => e.type === filter);
  }, [allEntries, filter]);

  const visible = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);
  const groups = useMemo(() => groupByDate(visible), [visible]);
  const hasMore = displayCount < filtered.length;

  // Scroll detection — stable ref to avoid re-attaching on data changes
  const hasMoreRef = useRef(hasMore);
  const loadMoreRef = useRef(loadMore);
  hasMoreRef.current = hasMore;
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const el = document.querySelector('[data-app-scroller]') || document.querySelector('main') || document.documentElement;
    const onScroll = () => {
      const scrollTop = (el as HTMLElement).scrollTop;
      setScrolled(scrollTop > 50);
      if (hasMoreRef.current && scrollTop + (el as HTMLElement).clientHeight >= (el as HTMLElement).scrollHeight - 200) {
        loadMoreRef.current();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      <CinematicHeader
        scrolled={scrolled}
        onBack={() => navigate(-1)}
        title="Your Story"
        subtitle={`${allEntries.length} ${allEntries.length === 1 ? 'moment' : 'moments'} with ${companionName}`}
        expandedIcon={
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
        }
        compactIcon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        compactTrailing={<>{allEntries.length} moments</>}
        persistentDetail={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-1">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  filter === opt.key
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] border border-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Timeline content */}
      <div
        className="px-5"
        style={{ paddingBottom: 'max(10rem, calc(8rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No moments yet</p>
            <p className="text-xs text-muted-foreground/70 max-w-[260px]">
              Keep chatting with {companionName} — meaningful moments from your conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {notifications.length > 0 && filter === 'all' && (
              <StoryRecapCard
                count={notifications.length}
                companionName={companionName}
                isPremium={subscribed}
              />
            )}
            {groups.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="text-[10px] text-muted-foreground/30 tabular-nums">{group.items.length}</span>
                </div>
                <div className="space-y-2.5 pl-1">
                  {group.items.map((entry, i) =>
                    entry.type === 'milestone' ? (
                      <MilestoneCard
                        key={entry.id}
                        text={entry.text}
                        date={entry.date}
                        milestoneType={entry.metadata?.milestoneType as string}
                        index={i}
                      />
                    ) : (
                      <TimelineEntryCard key={entry.id} entry={entry} index={i} />
                    )
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
