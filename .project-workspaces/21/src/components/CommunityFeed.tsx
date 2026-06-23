import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight } from 'lucide-react';
import { getMember, registerDynamicMember, CommunityMember, CommunityPost } from '@/lib/communityPersonas';
import PostCard from './PostCard';
import EventFeedCard from './EventFeedCard';
import CompanionPresenceBar from './CompanionPresenceBar';

import PostDetail from './PostDetail';
import MemberProfile from './MemberProfile';

import ComposePost from './ComposePost';
import PostComments, { useCommentCounts } from './PostComments';
import ReportDialog from './ReportDialog';
import { useReactions } from '@/hooks/useReactions';
import { useBlockedUsers } from '@/hooks/useModeration';
import { supabase } from '@/integrations/supabase/client';
import { fireEdgeFunction } from '@/lib/edgeFunction';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CommunityFeedProps {
  companionName: string | null;
  userName?: string;
  username?: string;
  userId?: string;
  avatarUrl?: string;
  vibe?: string | null;
  isCompanionConnected?: boolean;
  connectedMemberIds: string[];
  connectionNames?: Record<string, string>;
  connectionAvatars?: Record<string, string>;
  connectionRoles?: Record<string, string>;
  activeCompanionId?: string;
  onConnectMember: (member: CommunityMember) => void;
  onSwitchToMessages: () => void;
  onSwitchCompanion?: (memberId: string) => void;
  isFavorited: (postId: string) => boolean;
  onToggleFavorite: (post: { id: string; memberId: string; content: string; imageKey?: string; timeAgo?: string }) => void;
  isPremium?: boolean;
  threadFriendNames?: Record<string, string>;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(' ')[0];
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

export default function CommunityFeed({
  companionName,
  userName,
  username,
  userId,
  avatarUrl,
  vibe,
  isCompanionConnected,
  connectedMemberIds,
  connectionNames = {},
  connectionAvatars = {},
  connectionRoles = {},
  activeCompanionId,
  onConnectMember,
  onSwitchToMessages,
  onSwitchCompanion,
  isFavorited,
  onToggleFavorite,
  isPremium = false,
  threadFriendNames = {},
}: CommunityFeedProps) {
  const navigate = useNavigate();
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [companionPosts, setCompanionPosts] = useState<CommunityPost[]>([]);
  const [createdCompanionIds, setCreatedCompanionIds] = useState<Set<string>>(new Set());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [profileMember, setProfileMember] = useState<CommunityMember | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTarget, setReportTarget] = useState<{ memberId: string; memberName: string; postId?: string } | null>(null);
  const [companionFilter, setCompanionFilter] = useState<string | null>(null);

  // Build presence bar data
  const presenceCompanions = useMemo(() => {
    return connectedMemberIds.map((mid) => ({
      memberId: mid,
      name: connectionNames[mid] || 'Companion',
      avatarUrl: connectionAvatars[mid],
      isActive: mid === activeCompanionId,
      hasRecentActivity: companionPosts.some((p) => p.memberId === mid),
    }));
  }, [connectedMemberIds, connectionNames, connectionAvatars, activeCompanionId, companionPosts]);

  // Pagination state
  const PAGE_SIZE = 20;
  const [hasMoreCompanion, setHasMoreCompanion] = useState(false);
  const [hasMoreUser, setHasMoreUser] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { blockUser, unblockUser, isBlocked } = useBlockedUsers(userId);

  // Load created companion identities
  useEffect(() => {
    if (!userId) return;
    const loadCreatedCompanions = async () => {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .eq('is_created', true);
      if (data) {
        const ids = new Set<string>();
        for (const conn of data as any[]) {
          ids.add(conn.member_id);
          registerDynamicMember({
            id: conn.member_id,
            name: conn.name,
            handle: conn.handle || `@${conn.name.toLowerCase()}`,
            initial: conn.name[0]?.toUpperCase() || '?',
            colorVar: '--avatar-teal',
            age: conn.age || '30s',
            gender: conn.gender || 'neutral',
            personality: conn.personality || '',
            bio: conn.bio || '',
            avatarUrl: conn.avatar_url || undefined,
            circles: [],
          });
        }
        setCreatedCompanionIds(ids);
      }
    };
    loadCreatedCompanions();
  }, [userId]);

   // Track active connection IDs for filtering
  const [activeConnectionIds, setActiveConnectionIds] = useState<Set<string>>(new Set());

   // Load companion feed posts (from ALL connections, including archived, to keep feed alive)
  useEffect(() => {
    if (!userId) return;
    const loadCompanionFeedPosts = async () => {
      // Get ALL connection member IDs (active + archived) so feed feels alive
      const { data: allConns } = await supabase
        .from('connections')
        .select('member_id')
        .eq('user_id', userId);
      const activeIds = new Set((allConns || []).map((c: any) => c.member_id));
      setActiveConnectionIds(activeIds);

      const { data } = await supabase
        .from('companion_feed_posts' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (data) {
        // Filter out posts from companions that no longer exist as connections
        const filtered = (data as any[]).filter((p) => activeIds.has(p.member_id));
        const mapped: CommunityPost[] = filtered.map((p) => {
          if (p.member_name && !getMember(p.member_id)) {
            registerDynamicMember({
              id: p.member_id,
              name: p.member_name,
              handle: p.member_handle || `@${p.member_name.toLowerCase()}`,
              initial: p.member_name[0]?.toUpperCase() || '?',
              colorVar: '--avatar-teal',
              age: p.member_age || '30s',
              gender: p.member_gender || 'neutral',
              personality: p.member_personality || '',
              bio: p.member_bio || '',
              avatarUrl: p.member_avatar_url || undefined,
              circles: [],
            });
          }
          // Use DB-driven card_type if available, else fallback to reflection
          const dbCardType = p.card_type || 'reflection';
          const dbReactions = Array.isArray(p.companion_reactions) && p.companion_reactions.length > 0
            ? p.companion_reactions
            : [{
                memberId: p.member_id,
                name: p.member_name || connectionNames[p.member_id] || 'Companion',
                avatarUrl: p.member_avatar_url || connectionAvatars[p.member_id],
              }];

          return {
            id: p.id,
            memberId: p.member_id,
            content: p.content,
            timeAgo: getTimeAgo(p.created_at),
            _createdAt: p.created_at,
            cardType: dbCardType as any,
            eventLabel: p.event_label || undefined,
            companionRole: connectionRoles[p.member_id] || undefined,
            companionReactions: dbReactions as any[],
          };
        });
        setCompanionPosts(mapped);
        setHasMoreCompanion((data as any[]).length >= PAGE_SIZE);
      }
    };
    loadCompanionFeedPosts();

    // Realtime subscription for new companion posts
    const compChannel = supabase
      .channel('companion-posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'companion_feed_posts' }, (payload: any) => {
        const p = payload.new;
        if (p.user_id !== userId) return;
        // Register dynamic member if needed
        if (p.member_name && !getMember(p.member_id)) {
          registerDynamicMember({
            id: p.member_id, name: p.member_name,
            handle: p.member_handle || `@${p.member_name.toLowerCase()}`,
            initial: p.member_name[0]?.toUpperCase() || '?',
            colorVar: '--avatar-teal', age: p.member_age || '30s',
            gender: p.member_gender || 'neutral', personality: p.member_personality || '',
            bio: p.member_bio || '', avatarUrl: p.member_avatar_url || undefined, circles: [],
          });
        }
        const newPost: CommunityPost = {
          id: p.id, memberId: p.member_id, content: p.content,
          timeAgo: 'just now', _createdAt: p.created_at,
          cardType: 'reflection' as const,
          companionRole: connectionRoles[p.member_id] || undefined,
          companionReactions: [{
            memberId: p.member_id,
            name: p.member_name || connectionNames[p.member_id] || 'Companion',
            avatarUrl: p.member_avatar_url || connectionAvatars[p.member_id],
          }],
        };
        // Deduplicate by id
        setCompanionPosts(prev => {
          if (prev.some(existing => existing.id === p.id)) return prev;
          return [newPost, ...prev];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(compChannel); };

    // Background post generation — staggered so companions don't all post at once
    const generateNewPost = async () => {
      const { data: conns } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_created', true);
      if (!conns || conns.length === 0) return;

      // Shuffle companions so the posting order varies each session
      const shuffled = [...(conns as any[])].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffled.length; i++) {
        const conn = shuffled[i];

        // Stagger: wait 30-90 seconds between each companion's post
        if (i > 0) {
          const delayMs = 30_000 + Math.random() * 60_000; // 30s–90s
          await new Promise((r) => setTimeout(r, delayMs));
        }

        const { data: lastPost } = await supabase
          .from('companion_feed_posts' as any)
          .select('created_at')
          .eq('user_id', userId)
          .eq('member_id', conn.member_id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastPostTime = (lastPost as any)?.[0]?.created_at;
        const hoursSince = lastPostTime
          ? (Date.now() - new Date(lastPostTime as string).getTime()) / (1000 * 60 * 60)
          : 999;

        if (hoursSince < 4) continue;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) {
            console.warn('[Feed] Skipping companion post generation: no active session token');
            continue;
          }

          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-companion-post`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              userId,
              memberId: conn.member_id,
              companionName: conn.name,
              companionBio: conn.bio || '',
              companionPersonality: conn.personality || '',
              companionHandle: conn.handle || '',
              companionAge: conn.age || '',
              companionGender: conn.gender || 'neutral',
              companionAvatarUrl: conn.avatar_url || '',
              circles: conn.circles || [],
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.post) {
              const newPost: CommunityPost = {
                id: `gen-${Date.now()}-${Math.random()}`,
                memberId: conn.member_id,
                content: data.post.content,
                timeAgo: 'just now',
                _createdAt: new Date().toISOString(),
                cardType: 'reflection' as const,
                companionRole: connectionRoles[conn.member_id] || undefined,
                companionReactions: [{
                  memberId: conn.member_id,
                  name: (conn as any).name || 'Companion',
                  avatarUrl: (conn as any).avatar_url,
                }],
              };
              setCompanionPosts((prev) => [newPost, ...prev]);
            }
          }
        } catch (e) {
          console.error('[Feed] Companion post generation failed:', e);
        }
      }
    };
    generateNewPost();
  }, [userId]);

  // Load user-generated posts (own posts + thread posts sent to me)
  useEffect(() => {
    if (!userId) return;
    const loadUserPosts = async () => {
      // Fetch own posts + thread posts sent to this user (RLS handles visibility)
      const { data } = await supabase
        .from('user_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (data) {
        const mapped: CommunityPost[] = (data as any[]).map((p) => {
          const isThread = p.visibility === 'thread';
          const isMine = p.user_id === userId;
          // For thread posts, determine the friend name
          let friendName: string | undefined;
          if (isThread) {
            if (isMine) {
              friendName = threadFriendNames[p.thread_friend_id] || 'a friend';
            } else {
              friendName = p.user_name || 'a friend';
            }
          }
          return {
            id: p.id,
            memberId: `user-${p.user_id}`,
            content: p.content,
            timeAgo: getTimeAgo(p.created_at),
            imageUrl: p.image_url || undefined,
            isUserPost: true,
            userPostMeta: { userName: p.user_name, username: p.username, avatarUrl: p.avatar_url },
            _createdAt: p.created_at,
            visibility: isThread ? 'thread' as const : 'public' as const,
            threadFriendId: p.thread_friend_id || undefined,
            threadFriendName: friendName,
          };
        });
        setUserPosts(mapped);
        setHasMoreUser(data.length >= PAGE_SIZE);
      }
    };
    loadUserPosts();

    const channel = supabase
      .channel('user-posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_posts' }, (payload: any) => {
        const p = payload.new;
        if (p.user_id !== userId) return;
        const newPost: CommunityPost = {
          id: p.id,
          memberId: `user-${p.user_id}`,
          content: p.content,
          timeAgo: 'just now',
          imageUrl: p.image_url || undefined,
          isUserPost: true,
          userPostMeta: { userName: p.user_name, username: p.username, avatarUrl: p.avatar_url },
          _createdAt: p.created_at,
        };
        setUserPosts((prev) => [newPost, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Load more posts (infinite scroll)
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || (!hasMoreCompanion && !hasMoreUser) || !userId) return;
    setLoadingMore(true);

    try {
      const promises: PromiseLike<void>[] = [];

      if (hasMoreCompanion && companionPosts.length > 0) {
        const oldest = companionPosts[companionPosts.length - 1]._createdAt;
        if (oldest) {
          promises.push(
            supabase
              .from('companion_feed_posts' as any)
              .select('*')
              .eq('user_id', userId)
              .lt('created_at', oldest)
              .order('created_at', { ascending: false })
              .limit(PAGE_SIZE)
              .then(({ data }) => {
                if (data) {
                  const filtered = (data as any[]).filter((p) => activeConnectionIds.has(p.member_id));
                  const mapped: CommunityPost[] = filtered.map((p) => {
                    if (p.member_name && !getMember(p.member_id)) {
                      registerDynamicMember({
                        id: p.member_id, name: p.member_name,
                        handle: p.member_handle || `@${p.member_name.toLowerCase()}`,
                        initial: p.member_name[0]?.toUpperCase() || '?',
                        colorVar: '--avatar-teal', age: p.member_age || '30s',
                        gender: p.member_gender || 'neutral', personality: p.member_personality || '',
                        bio: p.member_bio || '', avatarUrl: p.member_avatar_url || undefined, circles: [],
                      });
                    }
                    return { id: p.id, memberId: p.member_id, content: p.content, timeAgo: getTimeAgo(p.created_at), _createdAt: p.created_at };
                  });
                  setCompanionPosts(prev => [...prev, ...mapped]);
                  setHasMoreCompanion((data as any[]).length >= PAGE_SIZE);
                } else {
                  setHasMoreCompanion(false);
                }
              })
          );
        }
      }

      if (hasMoreUser && userPosts.length > 0) {
        const oldest = userPosts[userPosts.length - 1]._createdAt;
        if (oldest) {
          promises.push(
            supabase
              .from('user_posts')
              .select('*')
              .lt('created_at', oldest)
              .order('created_at', { ascending: false })
              .limit(PAGE_SIZE)
              .then(({ data }) => {
                if (data) {
                  const mapped: CommunityPost[] = (data as any[]).map((p) => {
                    const isThread = p.visibility === 'thread';
                    const isMine = p.user_id === userId;
                    let friendName: string | undefined;
                    if (isThread) {
                      friendName = isMine ? (threadFriendNames[p.thread_friend_id] || 'a friend') : (p.user_name || 'a friend');
                    }
                    return {
                      id: p.id, memberId: `user-${p.user_id}`, content: p.content,
                      timeAgo: getTimeAgo(p.created_at), imageUrl: p.image_url || undefined,
                      isUserPost: true, userPostMeta: { userName: p.user_name, username: p.username, avatarUrl: p.avatar_url },
                      _createdAt: p.created_at,
                      visibility: isThread ? 'thread' as const : 'public' as const,
                      threadFriendId: p.thread_friend_id || undefined,
                      threadFriendName: friendName,
                    };
                  });
                  setUserPosts(prev => [...prev, ...mapped]);
                  setHasMoreUser(data.length >= PAGE_SIZE);
                } else {
                  setHasMoreUser(false);
                }
              })
          );
        }
      }

      await Promise.all(promises);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreCompanion, hasMoreUser, userId, companionPosts, userPosts, activeConnectionIds]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMorePosts(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMorePosts]);

  const allPosts = useMemo(() =>
    [...companionPosts, ...userPosts].sort((a, b) => {
      const aTime = new Date(a._createdAt || 0).getTime();
      const bTime = new Date(b._createdAt || 0).getTime();
      return bTime - aTime;
    }),
    [companionPosts, userPosts]
  );
  const filteredPosts = useMemo(() => {
    let result = allPosts.filter((p) => !isBlocked(p.memberId));
    // Filter by selected companion in the presence bar
    if (companionFilter) {
      result = result.filter((p) => p.memberId === companionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const member = p.isUserPost ? null : getMember(p.memberId);
        return (
          p.content.toLowerCase().includes(q) ||
          (member?.name.toLowerCase().includes(q)) ||
          (p.userPostMeta?.userName.toLowerCase().includes(q))
        );
      });
    }
    return result;
  }, [allPosts, searchQuery, isBlocked, companionFilter]);

  const allPostIds = allPosts.map((p) => p.id);
  const commentCounts = useCommentCounts(allPostIds);
  const { reactions, toggleReaction } = useReactions(allPostIds, userId);

  const selectedPost = selectedPostId ? allPosts.find((p) => p.id === selectedPostId) : null;
  const selectedMember = selectedPost && !selectedPost.isUserPost ? getMember(selectedPost.memberId) : null;

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('user_posts').delete().eq('id', postId);
      if (error) throw error;
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleEditPost = async (postId: string, newContent: string) => {
    try {
      const { error } = await supabase.from('user_posts').update({ content: newContent }).eq('id', postId);
      if (error) throw error;
      setUserPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: newContent } : p));
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleRefresh = useCallback(async () => {
    if (!userId) return;

    // Reload companion posts (all connections including archived)
    const { data: allConns } = await supabase
      .from('connections')
      .select('member_id')
      .eq('user_id', userId);
    const activeIds = new Set((allConns || []).map((c: any) => c.member_id));
    setActiveConnectionIds(activeIds);

    const { data: compData } = await supabase
      .from('companion_feed_posts' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (compData) {
      const filtered = (compData as any[]).filter((p) => activeIds.has(p.member_id));
      const mapped: CommunityPost[] = filtered.map((p) => {
        if (p.member_name && !getMember(p.member_id)) {
          registerDynamicMember({
            id: p.member_id, name: p.member_name,
            handle: p.member_handle || `@${p.member_name.toLowerCase()}`,
            initial: p.member_name[0]?.toUpperCase() || '?',
            colorVar: '--avatar-teal', age: p.member_age || '30s',
            gender: p.member_gender || 'neutral', personality: p.member_personality || '',
            bio: p.member_bio || '', avatarUrl: p.member_avatar_url || undefined, circles: [],
          });
        }
        return { id: p.id, memberId: p.member_id, content: p.content, timeAgo: getTimeAgo(p.created_at), _createdAt: p.created_at };
      });
      setCompanionPosts(mapped);
      setHasMoreCompanion((compData as any[]).length >= PAGE_SIZE);
    }

    // Reload user posts
    const { data: userData } = await supabase
      .from('user_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (userData) {
      const mapped: CommunityPost[] = (userData as any[]).map((p) => {
        const isThread = p.visibility === 'thread';
        const isMine = p.user_id === userId;
        let friendName: string | undefined;
        if (isThread) {
          friendName = isMine ? (threadFriendNames[p.thread_friend_id] || 'a friend') : (p.user_name || 'a friend');
        }
        return {
          id: p.id, memberId: `user-${p.user_id}`, content: p.content,
          timeAgo: getTimeAgo(p.created_at), imageUrl: p.image_url || undefined,
          isUserPost: true, userPostMeta: { userName: p.user_name, username: p.username, avatarUrl: p.avatar_url },
          _createdAt: p.created_at,
          visibility: isThread ? 'thread' as const : 'public' as const,
          threadFriendId: p.thread_friend_id || undefined,
          threadFriendName: friendName,
        };
      });
      setUserPosts(mapped);
      setHasMoreUser(userData.length >= PAGE_SIZE);
    }

    toast('Feed refreshed ✨', { duration: 2000 });
  }, [userId, threadFriendNames]);

  const handleConnect = (member: CommunityMember) => {
    onConnectMember(member);
    setSelectedPostId(null);
    setTimeout(() => {
      toast(`${member.name} is now in your Messages 💛`, { duration: 3000 });
      onSwitchToMessages();
    }, 500);
  };

  const isMemberConnected = (memberId: string) => connectedMemberIds.includes(memberId);

  const handleCompanionTap = (memberId: string) => {
    // Toggle filter: tap to filter by that companion, tap again to clear
    setCompanionFilter((prev) => (prev === memberId ? null : memberId));
  };

  return (
    <div className="flex flex-col touch-pan-y">
      {/* Companion presence bar */}
      {presenceCompanions.length > 1 && (
        <div className="mx-auto max-w-lg w-full">
          <CompanionPresenceBar
            companions={presenceCompanions}
            onTap={handleCompanionTap}
            onShowAll={() => setCompanionFilter(null)}
            selectedFilter={companionFilter}
          />
        </div>
      )}

      {/* Personalized greeting */}
      {userName && (
        <div className="px-5 pt-3 pb-2">
          <div className="mx-auto max-w-lg">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {getGreeting(userName)} 💛
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {username && (
                <p className="text-[13px] text-muted-foreground">@{username}</p>
              )}
              {username && <span className="text-muted-foreground/30">•</span>}
              <p className="text-[13px] text-muted-foreground italic">Your life timeline — you live it, we remember it.</p>
            </div>

            {/* Search bar */}
            <div className="pt-2 pb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your story…"
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
            </div>
          </div>
        </div>
      )}

      {/* Feed with pull-to-refresh */}
      <>
        <div
          ref={scrollRef}
          className="px-4 pt-5 pb-32 touch-pan-y"
        >
          <div className="mx-auto flex max-w-lg flex-col gap-3.5">
            {/* Empty state when no posts */}
            {filteredPosts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Your Threads are empty for now.</p>
                <p className="text-xs mt-1 italic">A place to share and respond as your story unfolds.</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, i) => {
                const isUserPost = post.isUserPost && post.userPostMeta;
                const isOwn = post.memberId === `user-${userId}`;
                const isCompanionPost = !isUserPost && (post.cardType === 'life-event' || post.cardType === 'reflection' || post.cardType === 'milestone');
                
                let member: CommunityMember | null = null;
                if (isUserPost) {
                  member = {
                    id: post.memberId,
                    name: post.userPostMeta!.userName,
                    handle: post.userPostMeta!.username ? `@${post.userPostMeta!.username}` : '',
                    initial: post.userPostMeta!.userName.charAt(0).toUpperCase(),
                    colorVar: '--primary',
                    age: '',
                    gender: 'nonbinary',
                    personality: '',
                    bio: '',
                    circles: [],
                  };
                } else {
                  const staticMember = getMember(post.memberId);
                  if (staticMember) {
                    const connName = connectionNames[post.memberId];
                    member = connName ? { ...staticMember, name: connName } : staticMember;
                  }
                }

                if (!member) return null;

                // Use EventFeedCard for companion posts with cardType
                if (isCompanionPost) {
                  return (
                    <div key={post.id}>
                      <EventFeedCard
                        companionName={connectionNames[post.memberId]}
                        post={post}
                        index={i}
                        isFavorited={isFavorited(post.id)}
                        onTap={() => setSelectedPostId(post.id)}
                        onToggleFavorite={() => onToggleFavorite({ id: post.id, memberId: post.memberId, content: post.content, imageKey: post.imageKey, timeAgo: post.timeAgo })}
                        onCompanionTap={handleCompanionTap}
                      />
                    </div>
                  );
                }

                return (
                  <div key={post.id}>
                    <PostCard
                      post={post}
                      member={member}
                      index={i}
                      isConnected={!isUserPost && isMemberConnected(member.id)}
                      isFavorited={isFavorited(post.id)}
                      isOwnPost={isUserPost ? isOwn : false}
                      threadFriendName={post.threadFriendName}
                      commentCount={commentCounts[post.id] || 0}
                      reactions={reactions[post.id] || []}
                      onToggleReaction={userId ? toggleReaction : undefined}
                      onTap={() => {
                        if (isUserPost) {
                          toggleComments(post.id);
                        } else {
                          setSelectedPostId(post.id);
                        }
                      }}
                      onAvatarTap={() => {
                        if (!isUserPost) setProfileMember(member!);
                      }}
                      onToggleFavorite={() => onToggleFavorite({ id: post.id, memberId: post.memberId, content: post.content, imageKey: post.imageKey, timeAgo: post.timeAgo })}
                      onDelete={isUserPost && isOwn ? () => handleDeletePost(post.id) : undefined}
                      onEdit={isUserPost && isOwn ? (newContent) => handleEditPost(post.id, newContent) : undefined}
                      avatarUrl={isUserPost ? post.userPostMeta?.avatarUrl : undefined}
                      onReport={!isOwn && !createdCompanionIds.has(post.memberId) && userId ? () => setReportTarget({ memberId: member!.id, memberName: member!.name, postId: post.id }) : undefined}
                      onBlock={!isOwn && !createdCompanionIds.has(post.memberId) && userId ? () => blockUser(member!.id) : undefined}
                    />
                    {/* Inline comments */}
                    <AnimatePresence>
                      {expandedComments.has(post.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden rounded-b-2xl border-[0.5px] border-t-0 border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 -mt-2"
                        >
                          <PostComments
                            postId={post.id}
                            userId={userId}
                            userName={userName}
                            username={username}
                            avatarUrl={avatarUrl}
                            postMemberId={post.isUserPost ? undefined : post.memberId}
                            postContent={post.content}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </AnimatePresence>

            {connectedMemberIds.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="py-4 text-center text-xs text-muted-foreground"
              >
                Everyone here is real conversation. Tap a post that speaks to you 💛
              </motion.p>
            )}

            {/* Infinite scroll sentinel */}
            {(hasMoreCompanion || hasMoreUser) && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && (
                  <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                )}
              </div>
            )}

            {!hasMoreCompanion && !hasMoreUser && filteredPosts.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground/50 py-2">You've reached the beginning ✨</p>
            )}

            <div className="h-4" />
          </div>
        </div>
      </>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && selectedMember && (
          <PostDetail
            post={selectedPost}
            member={selectedMember}
            companionName={companionName}
            username={username}
            isConnected={isMemberConnected(selectedMember.id)}
            allPosts={allPosts}
            onClose={() => setSelectedPostId(null)}
            onConnect={handleConnect}
          />
        )}
      </AnimatePresence>

      {/* Member Profile Modal */}
      <AnimatePresence>
        {profileMember && (
          <MemberProfile
            member={profileMember}
            posts={allPosts}
            onClose={() => setProfileMember(null)}
            onReport={userId ? () => { setReportTarget({ memberId: profileMember.id, memberName: profileMember.name }); setProfileMember(null); } : undefined}
            onBlock={userId ? () => { isBlocked(profileMember.id) ? unblockUser(profileMember.id) : blockUser(profileMember.id); setProfileMember(null); } : undefined}
            isBlocked={isBlocked(profileMember.id)}
          />
        )}
      </AnimatePresence>

      {/* Report Dialog */}
      <AnimatePresence>
        {reportTarget && userId && (
          <ReportDialog
            reporterId={userId}
            memberId={reportTarget.memberId}
            memberName={reportTarget.memberName}
            postId={reportTarget.postId}
            onClose={() => setReportTarget(null)}
            onBlock={() => blockUser(reportTarget.memberId)}
          />
        )}
      </AnimatePresence>



      {/* Compose post FAB */}
      {userId && userName && (
        <ComposePost userId={userId} userName={userName} username={username} avatarUrl={avatarUrl} />
      )}
    </div>
  );
}
