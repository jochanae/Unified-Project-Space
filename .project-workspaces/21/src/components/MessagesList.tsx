// PERF: 2026-03-15 — Added skeleton loaders for message previews — eliminates layout shift during data load
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, Search, X, Users, ChevronRight, ChevronDown, Plus, LogIn, Link2, Trophy, Brain, Activity, Heart, ImageIcon, Trash2 } from 'lucide-react';
import CinematicHeader from '@/components/shared/CinematicHeader';
import ThreadsHubCard from './ThreadsHubCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import CreateCircle from './CreateCircle';
import { Connection } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { getUploadSignedUrl, resolveToSignedUrl } from '@/lib/signedUrl';
import { useCircles } from '@/hooks/useCircles';
import { useCircleUnread } from '@/hooks/useCircleUnread';
import { useAppContext } from '@/contexts/AppContext';
import { getAmbientStyles } from '@/lib/ambientBackgrounds';
import { treatAsMinor } from '@/lib/ageUtils';

interface MessagesListProps {
  connections: Connection[];
  companionMemberId?: string;
  userId: string;
  onOpenChat: (memberId: string) => void;
  onOpenCami: () => void;
  onOpenCircles: () => void;
  onClearNotifications?: () => void | Promise<void>;
  clearingNotifications?: boolean;
}

interface LastMessageInfo {
  content: string;
  created_at: string;
  has_image?: boolean;
  image_url?: string;
}

function formatTimeAgo(dateStr: string, milestoneType?: string): string {
  if (milestoneType === 'first_meeting') return 'The day you met';

  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks <= 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function CircleMemberStack({ circleId }: { circleId: string }) {
  const [members, setMembers] = useState<{ display_name: string | null; user_id: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    supabase
      .from('circle_members')
      .select('display_name, user_id, avatar_url')
      .eq('circle_id', circleId)
      .limit(5)
      .then(({ data }) => { if (data) setMembers(data); });
  }, [circleId]);

  if (members.length === 0) return null;

  const fallbackColors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(25 80% 55%)', 'hsl(280 60% 55%)', 'hsl(160 50% 45%)'];

  return (
    <div className="flex items-center -space-x-2">
      {members.slice(0, 3).map((m, i) => (
        m.avatar_url ? (
          <img
            key={m.user_id}
            src={m.avatar_url}
            alt={m.display_name || 'Member'}
            className="h-6 w-6 rounded-full object-cover ring-2 ring-card"
            style={{ zIndex: 3 - i }}
          />
        ) : (
          <div
            key={m.user_id}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card"
            style={{ backgroundColor: fallbackColors[i % fallbackColors.length], zIndex: 3 - i }}
          >
            {(m.display_name || '?')[0].toUpperCase()}
          </div>
        )
      ))}
      {members.length > 3 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
          +{members.length - 3}
        </div>
      )}
    </div>
  );
}

export default function MessagesList({
  connections,
  companionMemberId,
  userId,
  onOpenChat,
  onOpenCami,
  onOpenCircles,
  onClearNotifications,
  clearingNotifications = false,
}: MessagesListProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile } = useAppContext();
  const isYouth = treatAsMinor(profile?.dateOfBirth);
  const { circles, createCircle, joinByCode } = useCircles(user?.id);

  const circleIds = useMemo(() => circles.map(c => c.id), [circles]);
  const { unreadMap, previewMap } = useCircleUnread(circleIds);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessageInfo>>({});
  const [lastMessagesLoading, setLastMessagesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);

  // Companion activity: milestones + memories
  const [milestones, setMilestones] = useState<{ milestone_type: string; achieved_at: string; member_id: string }[]>([]);
  const [recentMemories, setRecentMemories] = useState<{ text: string; category: string; extracted_at: string }[]>([]);
  const [recentMood, setRecentMood] = useState<{ mood_emoji: string; mood_level: number; note: string | null; created_at: string } | null>(null);
  const [circleHighlights, setCircleHighlights] = useState<{ circle_id: string; circle_name: string; emoji: string; sender_name: string; content: string; created_at: string }[]>([]);
  const [camiLastMessage, setCamiLastMessage] = useState<{ content: string; created_at: string } | null>(null);

  // Fetch all dashboard data in parallel
  useEffect(() => {
    if (!userId) return;
    // Clear stale data immediately so previous companion's info doesn't flash
    setMilestones([]);
    setRecentMemories([]);
    setRecentMood(null);
    const cIds = circles.map(c => c.id);

    const camiPromise = supabase
      .from('cami_session_history')
      .select('messages, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          const lastMsg = data.messages[data.messages.length - 1] as { role?: string; content?: string };
          if (lastMsg?.content) {
            return { content: lastMsg.content, created_at: data.created_at };
          }
        }
        return null;
      });

    const milestonesPromise = companionMemberId
      ? supabase
          .from('companion_milestones')
          .select('milestone_type, achieved_at, member_id')
          .eq('user_id', userId)
          .eq('member_id', companionMemberId)
          .order('achieved_at', { ascending: false })
          .limit(3)
          .then(({ data }) => data ?? [])
      : Promise.resolve([]);

    const memoriesPromise = companionMemberId
      ? supabase
          .from('memories')
          .select('text, category, extracted_at')
          .eq('user_id', userId)
          .eq('member_id', companionMemberId)
          .order('extracted_at', { ascending: false })
          .limit(3)
          .then(({ data }) => data ?? [])
      : Promise.resolve([]);

    const moodPromise = companionMemberId
      ? supabase
          .from('mood_checkins')
          .select('mood_emoji, mood_level, note, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data }) => (data && data.length > 0 ? data[0] : null))
      : Promise.resolve(null);

    const circlePromise = cIds.length > 0
      ? supabase
          .from('circle_messages')
          .select('circle_id, sender_name, content, created_at')
          .in('circle_id', cIds)
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => {
            if (data) {
              return data.map(msg => {
                const circle = circles.find(c => c.id === msg.circle_id);
                return {
                  circle_id: msg.circle_id,
                  circle_name: circle?.name || 'Circle',
                  emoji: circle?.emoji || '💬',
                  sender_name: msg.sender_name,
                  content: msg.content,
                  created_at: msg.created_at,
                };
              });
            }
            return [];
          })
      : Promise.resolve([]);

    Promise.all([camiPromise, milestonesPromise, memoriesPromise, moodPromise, circlePromise]).then(
      ([camiData, milestonesData, memoriesData, moodData, circleData]) => {
        if (camiData) setCamiLastMessage(camiData);
        setMilestones(milestonesData);
        setRecentMemories(memoriesData);
        setRecentMood(moodData);
        setCircleHighlights(circleData);
      }
    );
  }, [userId, companionMemberId, circles]);

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoiningCode(true);
    try {
      await joinByCode(joinCode.trim());
      setJoinCode('');
      setJoinOpen(false);
      toast.success('Joined circle!');
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setJoiningCode(false);
    }
  };

  const sortedCompanions = [...connections]
    .filter(c => !(c as any).isArchived)
    .sort((a, b) => {
      if (a.memberId === companionMemberId) return -1;
      if (b.memberId === companionMemberId) return 1;
      const aTime = lastMessages[a.memberId]?.created_at || a.connectedAt;
      const bTime = lastMessages[b.memberId]?.created_at || b.connectedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  const filteredCompanions = searchQuery.trim()
    ? sortedCompanions.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedCompanions;

  // Load last messages for all connections from DB
  useEffect(() => {
    if (connections.length === 0) {
      setLastMessagesLoading(false);
      return;
    }
    setLastMessagesLoading(true);
    const loadLastMessages = async () => {
      const memberIds = connections.map((c) => c.memberId);
      const results: Record<string, LastMessageInfo> = {};

      const { data } = await supabase
        .from('chat_messages')
        .select('member_id, content, created_at')
        .eq('user_id', userId)
        .in('member_id', memberIds)
        .order('created_at', { ascending: false });

      if (data) {
        const seenMembers = new Set<string>();
        const imageMembers = new Set<string>();
        for (const row of data) {
          const hasImage = row.content === '(shared a photo)' || row.content === '📷 Sent a photo';
          if (!seenMembers.has(row.member_id)) {
            seenMembers.add(row.member_id);
            results[row.member_id] = {
              content: row.content,
              created_at: row.created_at,
              has_image: hasImage,
            };
          }
          if (hasImage && !imageMembers.has(row.member_id)) {
            imageMembers.add(row.member_id);
          }
        }

        for (const memberId of imageMembers) {
          const memberMsgs = data.filter(r => r.member_id === memberId);
          for (const msg of memberMsgs) {
            if (msg.content.includes('/storage/v1/object/public/chat-images/') || msg.content.includes('/storage/v1/object/sign/chat-images/')) {
              if (results[memberId]) {
                // Extract URL from content and resolve to signed URL
                const urlMatch = msg.content.match(/https?:\/\/[^\s]*\/storage\/v1\/object\/(?:public|sign)\/chat-images\/[^\s\]]*/);
                if (urlMatch) {
                  results[memberId].image_url = await resolveToSignedUrl(urlMatch[0]);
                }
              }
              break;
            }
          }
          if (!results[memberId]?.image_url) {
            const { data: files } = await supabase.storage
              .from('chat-images')
              .list(`${userId}/${memberId}`, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
            if (files && files.length > 0) {
              const path = `${userId}/${memberId}/${files[0].name}`;
              const signedUrl = await getUploadSignedUrl('chat-images', path);
              if (signedUrl && results[memberId]) {
                results[memberId].image_url = signedUrl;
              }
            }
          }
        }
      }

      setLastMessages(results);
      setLastMessagesLoading(false);
    };

    loadLastMessages();
  }, [connections, userId]);

  // Realtime subscription
  useEffect(() => {
    if (!userId || connections.length === 0) return;

    const memberIds = new Set(connections.map((c) => c.memberId));

    const channel = supabase
      .channel('messages-list-chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: { member_id: string; content: string; created_at: string } }) => {
          const { member_id, content, created_at } = payload.new;
          if (!memberIds.has(member_id)) return;

          const hasImage = content === '(shared a photo)' || content === '📷 Sent a photo';

          setLastMessages((prev) => {
            const existing = prev[member_id];
            if (existing && new Date(created_at) <= new Date(existing.created_at)) return prev;
            return {
              ...prev,
              [member_id]: {
                content,
                created_at,
                has_image: hasImage,
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, connections]);

  const getLastMsg = (memberId: string, fallback: string) => {
    const info = lastMessages[memberId];
    if (!info) return fallback;
    if (info.has_image) return '📷 Photo';
    // Strip image markup patterns from preview text
    let text = info.content;
    // [IMG:url] pattern
    text = text.replace(/\[IMG:[^\]]*\]/gi, '📷 Photo');
    // [📸 Photo](url) markdown pattern
    text = text.replace(/\[📸\s*Photo\]\([^)]*\)/gi, '📷 Photo');
    // Raw storage URLs
    text = text.replace(/https?:\/\/[^\s]*\/storage\/v1\/object\/(?:public|sign)\/chat-images\/[^\s]*/gi, '📷 Photo');
    // Clean up extra whitespace
    text = text.replace(/\s{2,}/g, ' ').trim();
    return text || '📷 Photo';
  };

  const getTimeLabel = (memberId: string) => {
    const info = lastMessages[memberId];
    return info ? formatTimeAgo(info.created_at) : 'Connected';
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector('[data-app-scroller]') || document.querySelector('main') || document.documentElement;
    const onScroll = () => setScrolled((el as HTMLElement).scrollTop > 60);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative">
      {/* Youth magical light-leak overlay */}
      {isYouth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: getAmbientStyles(true).leaks }}
        />
      )}

      <CinematicHeader
        scrolled={scrolled}
        onBack={() => navigate(-1)}
        title="Conversations"
        subtitle="Your friends, all in one place"
        compactIcon={
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
          </div>
        }
        compactTrailing={<>{connections.length} friend{connections.length !== 1 ? 's' : ''}</>}
        headerAction={
          onClearNotifications ? (
            <button
              onClick={() => void onClearNotifications()}
              disabled={clearingNotifications}
              className="shrink-0 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {clearingNotifications ? 'Clearing…' : 'Clear badges'}
            </button>
          ) : undefined
        }
        expandedDetail={
          connections.length > 2 ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-xl border border-border/50 bg-secondary/40 py-2 pl-9 pr-8 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="px-4 pb-40" style={{ paddingBottom: 'max(16rem, calc(14rem + env(safe-area-inset-bottom, 0px)))' }}>
        <div className="mx-auto flex max-w-lg flex-col gap-6">

          {/* ── 1. Companions Section ── */}
          {filteredCompanions.length > 0 && (
            <section>
              <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Your Friends
              </p>
              <div className="flex flex-col gap-2">
                {filteredCompanions.map((comp, i) => {
                  const isActive = comp.memberId === companionMemberId;
                  return (
                    <motion.button
                      key={comp.memberId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onOpenChat(comp.memberId)}
                      className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all hover:shadow-md active:scale-[0.98] bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_15px_rgba(255,255,255,0.03),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] ${
                        isActive
                          ? 'border-amber-200/20 shadow-[0_0_20px_rgba(192,132,252,0.2),0_0_40px_rgba(245,158,11,0.1)]'
                          : 'hover:border-white/20'
                      }`}
                    >
                      <div className="relative">
                        {comp.avatarUrl ? (
                          <img
                            src={comp.avatarUrl}
                            alt={comp.name}
                            className="h-14 w-14 shrink-0 rounded-full object-cover shadow-md"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary shadow-md">
                            <span className="text-lg font-bold">{comp.name[0]}</span>
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-bold text-foreground">{comp.name}</span>
                          {isActive && <AnimatedGradientHeart size={14} id={`msg-heart-${comp.memberId}`} />}
                          {comp.connectionMode && comp.connectionMode !== 'friend' && (
                            <span className="text-[10px] text-muted-foreground/70 bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5 leading-none">
                              {({ accountability: 'Accountability', assistant: 'Assistant', romantic: 'Partner', mentor: 'Mentor', kids: 'Kids' } as Record<string, string>)[comp.connectionMode] || comp.connectionMode}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground flex items-center gap-1.5">
                          {lastMessagesLoading ? (
                            <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                          ) : lastMessages[comp.memberId]?.has_image && lastMessages[comp.memberId]?.image_url ? (
                            <img
                              src={lastMessages[comp.memberId].image_url}
                              alt=""
                              className="h-5 w-5 rounded object-cover shrink-0 cursor-zoom-in"
                              onClick={(e) => { e.stopPropagation(); setLightboxUrl(lastMessages[comp.memberId].image_url!); }}
                            />
                          ) : lastMessages[comp.memberId]?.has_image ? (
                            <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                          ) : null}
                          {!lastMessagesLoading && <span className="truncate">{getLastMsg(comp.memberId, `Tap to chat with ${comp.name}`)}</span>}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {lastMessagesLoading ? <span className="inline-block h-3 w-8 rounded bg-white/5 animate-pulse" /> : getTimeLabel(comp.memberId)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 2. Social: Circles (kids) or Threads (adults) ── */}
          {isYouth ? (
            <section>
              <div className="mb-2.5 px-1 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Circles
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJoinOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Link2 className="h-3 w-3" />
                    Join
                  </button>
                  <CreateCircle onSubmit={(name, emoji, desc) => createCircle(name, emoji, desc)} canCreate={circles.length < 10} maxReached={circles.length >= 10} />
                </div>
              </div>
              {circles.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {circles.slice(0, 4).map((circle, i) => {
                    const hasUnread = unreadMap[circle.id] || false;
                    const preview = previewMap[circle.id];
                    return (
                      <motion.button
                        key={circle.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => navigate(`/circles/${circle.id}`)}
                        className={`flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all hover:shadow-md active:scale-[0.98] bg-white/5 backdrop-blur-xl border-[0.5px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] ${
                          hasUnread ? 'border-primary/30' : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <span className="text-lg">{circle.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-foreground">{circle.name}</span>
                            {hasUnread && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                            <CircleMemberStack circleId={circle.id} />
                          </div>
                          {preview ? (
                            <p className={`mt-0.5 truncate text-sm ${hasUnread ? 'font-medium text-foreground/80' : 'text-muted-foreground'}`}>
                              <span className="font-medium">{preview.senderName}:</span> {preview.content.slice(0, 40)}{preview.content.length > 40 ? '…' : ''}
                            </p>
                          ) : (
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{circle.description}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center rounded-2xl border border-dashed border-border/50 py-6 text-center"
                >
                  <Users className="h-5 w-5 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Create or join a Circle to chat with groups</p>
                </motion.div>
              )}

              {circles.length > 0 && (
                <button
                  onClick={onOpenCircles}
                  className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1.5"
                >
                  View all circles
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </section>
          ) : (
            <ThreadsHubCard userId={userId} userName={profile?.userName} />
          )}

          {/* ── 3. Meet Someone New ── */}
          <section>
            <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Meet Someone New
            </p>
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={onOpenCami}
              className="flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-all hover:shadow-md hover:border-white/20 active:scale-[0.98] bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <AnimatedGradientHeart size={28} id="cami-messages-heart" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] font-bold text-foreground">Find a Companion</span>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {camiLastMessage ? camiLastMessage.content : 'Browse gallery or create your own'}
                </p>
                {camiLastMessage && (
                  <span className="text-[11px] text-muted-foreground/60">{formatTimeAgo(camiLastMessage.created_at)}</span>
                )}
              </div>
              {camiLastMessage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!confirm('Clear all Cami conversation history?')) return;
                    supabase
                      .from('cami_session_history')
                      .delete()
                      .eq('user_id', userId)
                      .then(({ error }) => {
                        if (error) { toast.error('Could not clear history'); }
                        else { setCamiLastMessage(null); toast.success('Cami history cleared'); }
                      });
                  }}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 border border-border/30 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Clear Cami history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.button>
          </section>

          {/* ── 4a. Your Mood (user-level, not companion-specific) ── */}
          {recentMood && (
            <section>
              <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Your Mood
              </p>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]"
              >
                <span className="text-xl">{recentMood.mood_emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Feeling {recentMood.mood_level >= 4 ? 'good' : recentMood.mood_level >= 2 ? 'okay' : 'low'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {recentMood.note ? recentMood.note : formatTimeAgo(recentMood.created_at)}
                  </p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="h-3.5 w-3.5 text-primary" />
                </div>
              </motion.div>
            </section>
          )}

          {/* ── 4b. Companion Activity (scoped to active companion) ── */}
          {companionMemberId && (
            <section>
              <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Activity with {connections.find(c => c.memberId === companionMemberId)?.name || 'Companion'}
              </p>
              {milestones.length === 0 && recentMemories.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center py-6 text-center"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Chat more to unlock insights about your bond 💛
                  </p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {milestones.map((m, i) => (
                    <motion.div
                      key={`ms-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Trophy className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {m.milestone_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatTimeAgo(m.achieved_at, m.milestone_type)}</p>
                      </div>
                    </motion.div>
                  ))}
                  {recentMemories.map((mem, i) => (
                    <motion.div
                      key={`mem-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (milestones.length + i) * 0.05 }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/60">
                        <Brain className="h-3.5 w-3.5 text-accent-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{mem.text}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground capitalize">{mem.category}</p>
                          <p className="text-[11px] text-muted-foreground/60 shrink-0">{formatTimeAgo(mem.extracted_at)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── 5. Circle Highlights ── */}
          {circles.length > 0 && circleHighlights.length > 0 && (
            <section>
              <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Circle Highlights
              </p>
              <div className="flex flex-col gap-1.5">
                {circleHighlights.slice(0, 3).map((h, i) => (
                  <motion.button
                    key={`ch-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/circles/${h.circle_id}`)}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all hover:border-white/20 hover:shadow-sm active:scale-[0.98] bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]"
                  >
                    <span className="text-lg">{h.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">{h.circle_name}</p>
                      <p className="truncate text-sm text-foreground">
                        <span className="font-medium">{h.sender_name}:</span>{' '}
                        {h.content}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(h.created_at)}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {/* Join by Code Modal */}
          <AnimatePresence>
            {joinOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => setJoinOpen(false)}
              >
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-foreground">Join a Circle</h3>
                    <button onClick={() => setJoinOpen(false)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Enter the invite code shared by the Circle creator.</p>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Paste invite code…"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                  />
                  <button
                    onClick={handleJoinByCode}
                    disabled={!joinCode.trim() || joiningCode}
                    className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {joiningCode ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      'Join Circle'
                    )}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              src={lightboxUrl}
              alt="Shared photo"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 text-white hover:bg-foreground/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
