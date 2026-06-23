// PERF: 2026-03-15 — Narrowed select() columns — reduces payload size per fetch
// PERF: 2026-03-15 — Added channel cleanup in useEffect — prevents realtime subscription leak on unmount
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveToSignedUrl } from '@/lib/signedUrl';

const CHAT_MESSAGES_SELECT = 'id, user_id, member_id, content, role, created_at, source';
import { toast } from 'sonner';
import { getGreeting, getWelcomeBack, generateAIGreeting } from '@/lib/companions';
import { loadMemory, formatMemoriesForPrompt } from '@/lib/memory';
import { useMilestones, type MilestoneType } from '@/hooks/useMilestones';
import { enrichCompanionBio } from '@/lib/bioEnrichment';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
  imageLoading?: boolean;
  isPreview?: boolean;
  isVariations?: boolean;
  variations?: { imageUrl: string; description: string }[];
  momentType?: MilestoneType;
  audioUrl?: string;
  audioDuration?: number;
  /** When set, the companion flagged this as needing real-time search */
  searchQuery?: string;
  /** Whether search result has been fetched */
  searchComplete?: boolean;
  /** Whether search is in progress */
  searching?: boolean;
  /** Message source: 'app' (default) or 'sms' */
  source?: string;
  /** Show inline upgrade nudge below this message */
  showUpgradeNudge?: boolean;
  /** Show inline private mode suggestion chip below this message */
  showPrivateSuggest?: boolean;
  /** Persistence status indicator */
  savedStatus?: 'saving' | 'saved' | 'error';
  /** When true, renders as an expandable letter card instead of a text bubble */
  isLetterGift?: boolean;
  /** The actual letter content — populated when isLetterGift is true */
  letterContent?: string;
  /** Footer annotation below images (e.g. "Saved as your first memory together") */
  footerNote?: string;
  /** Age in days of the oldest memory used in context for this response */
  memoryMomentDays?: number;
  /** The actual memory the reply referenced (if any) — used for tappable badge */
  memoryReference?: {
    text: string;
    extractedAt: string;
    daysOld: number;
  };
}

const PAGE_SIZE = 40;

interface UseChatHistoryOpts {
  userId: string;
  memberId: string;
  userName: string;
  companionName: string;
  companionGender: 'male' | 'female' | 'neutral';
  companionPersonality?: string;
  companionBio?: string;
  companionAge?: string;
  companionVibe?: string;
  userVibe?: string;
  onSaveMilestone?: (opts: { memberId: string; content: string }) => void;
  pageSize?: number;
}

// Encode image URL into content for storage: "caption [IMG:url]"
function encodeImageContent(content: string, imageUrl?: string): string {
  if (!imageUrl) return content;
  return `${content} [IMG:${imageUrl}]`;
}

// Decode image URL from stored content
export function decodeImageContent(content: string): { text: string; imageUrl?: string } {
  const match = content.match(/\s?\[IMG:(https?:\/\/[^\]]+)\]$/);
  if (match) {
    return { text: content.replace(match[0], '').trim(), imageUrl: match[1] };
  }
  return { text: content };
}

async function persistMessage(userId: string, memberId: string, content: string, role: 'user' | 'assistant', source: string = 'app', imageUrl?: string, messageId?: string): Promise<boolean> {
  const encodedContent = encodeImageContent(content, imageUrl);
  // Use a pre-generated ID so retries don't create duplicate rows
  const id = messageId || crypto.randomUUID();
  // Retry up to 2 times on failure to reduce message loss from transient network issues
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await supabase.from('chat_messages').upsert({
        id,
        user_id: userId,
        member_id: memberId,
        content: encodedContent,
        role,
        source,
      }, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error(`[Chat] Persist attempt ${attempt + 1} failed:`, e);
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return false;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function summarizeMessages(msgs: { role: string; content: string }[], userName: string, companionName: string): Promise<string | null> {
  try {
    const transcript = msgs.map(m => `${m.role === 'user' ? userName : companionName}: ${m.content}`).join('\n');
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `Summarize this conversation in 2-3 sentences, capturing the key topics and emotional tone:\n\n${transcript}` }],
        companionName: 'System',
        userName,
        companionGender: 'neutral',
        memories: '',
        vibe: 'warm',
      }),
    });
    if (!resp.ok || !resp.body) return null;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) text += parsed.delta.text;
        } catch { break; }
      }
    }
    return text.trim() || null;
  } catch (e) {
    console.error('[Chat] Summarization failed:', e);
    return null;
  }
}

export function useChatHistory({ userId, memberId, userName, companionName, companionGender, companionPersonality, companionBio, companionAge, companionVibe, userVibe, onSaveMilestone, pageSize = PAGE_SIZE }: UseChatHistoryOpts) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const userMessageCount = useRef(0);
  const oldestTimestamp = useRef<string | null>(null);
  const hasSummarized = useRef(false);

  const { checkAndRecordMilestone, checkStreak } = useMilestones(userId, memberId, userName);

  // Use refs for greeting-related values so the load effect doesn't re-run when they change
  const greetingRef = useRef({ companionName, userName, companionGender, companionPersonality, companionBio, companionAge, companionVibe, userVibe, onSaveMilestone });
  greetingRef.current = { companionName, userName, companionGender, companionPersonality, companionBio, companionAge, companionVibe, userVibe, onSaveMilestone };

  const dedup = (data: any[]) => {
    const seen = new Set<string>();
    return data.filter((row) => {
      if (seen.has(row.content)) return false;
      seen.add(row.content);
      return true;
    });
  };

  /** Extract clean text from raw SSE stream data that was accidentally saved */
  const sanitizeSSEContent = (raw: string): string => {
    if (!raw.includes('content_block_delta')) return raw;
    let result = '';
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          result += parsed.delta.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
    return result || raw;
  };

  const rowToMsg = async (row: any): Promise<ChatMessage | null> => {
    const sanitized = sanitizeSSEContent(row.content || '');
    const { text, imageUrl } = decodeImageContent(sanitized);
    // Hide internal system instructions from display (e.g. plan-completion triggers)
    if (text.startsWith('[System:')) return null;
    // Strip [verified-gift] prefix from display — it's an internal tag for companion verification
    const displayText = text.replace(/^\[verified-gift\]\s*/i, '');

    // Rehydrate "A moment for you" cards — persisted with source = 'moment_for_you'.
    // Always render as a distinguished moment card, never as a normal bubble.
    if (row.source === 'moment_for_you' && row.role === 'assistant') {
      return {
        id: row.id,
        content: displayText,
        isUser: false,
        timestamp: new Date(row.created_at),
        source: row.source,
        savedStatus: 'saved',
        momentType: 'moment_for_you',
      };
    }

    // Detect persisted letter gift cards — they're stored as "💌 Letter from Name: content"
    const letterMatch = displayText.match(/^💌\s*Letter from .+?:\s*([\s\S]+)$/);
    if (letterMatch && row.role === 'assistant') {
      return {
        id: row.id,
        content: '',
        isUser: false,
        timestamp: new Date(row.created_at),
        source: row.source || 'app',
        savedStatus: 'saved',
        isLetterGift: true,
        letterContent: letterMatch[1].trim(),
      };
    }

    // Resolve stored public URLs to signed URLs for private buckets
    const resolvedImageUrl = imageUrl ? await resolveToSignedUrl(imageUrl) : undefined;

    return {
      id: row.id,
      content: displayText,
      isUser: row.role === 'user',
      timestamp: new Date(row.created_at),
      source: row.source || 'app',
      imageUrl: resolvedImageUrl,
      savedStatus: 'saved', // messages from DB are already persisted
    };
  };

  // Load initial (most recent) page
  useEffect(() => {
    let cancelled = false;

    // Hydrate from offline cache instantly so the user sees their last
    // conversation even before the network query resolves (or while offline).
    (async () => {
      try {
        const { getCachedChatMessages } = await import('@/lib/offlineDataCache');
        const cached = getCachedChatMessages(userId, memberId);
        if (cached && cached.length > 0 && !cancelled) {
          const restored = (await Promise.all(cached.map(rowToMsg))).filter(Boolean) as ChatMessage[];
          if (cancelled) return;
          // Only seed if we haven't already filled from network
          setMessages((prev) => (prev.length === 0 ? restored : prev));
        }
      } catch { /* cache miss */ }
    })();

    const loadHistory = async () => {
      try {
        const { data } = await supabase
          .from('chat_messages')
          .select(CHAT_MESSAGES_SELECT)
          .eq('user_id', userId)
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(pageSize + 1);

        if (cancelled) return;

        if (data && data.length > 0) {
          const hasOlder = data.length > pageSize;
          setHasMore(hasOlder);
          const page = hasOlder ? data.slice(0, pageSize) : data;
          const chronological = page.reverse();
          const dedupedData = dedup(chronological);

          if (dedupedData.length > 0) {
            oldestTimestamp.current = dedupedData[0].created_at;
          }

          // Persist to offline cache (last 50) for next session / offline reload
          import('@/lib/offlineDataCache').then(({ cacheChatMessages }) => {
            cacheChatMessages(userId, memberId, dedupedData);
          }).catch(() => {});

          const restored = (await Promise.all(dedupedData.map(rowToMsg))).filter(Boolean) as ChatMessage[];
          const history = dedupedData.map((row: any) => ({
            role: row.role === 'user' ? 'user' : 'assistant',
            content: row.content,
            ...(row.created_at ? { created_at: row.created_at } : {}),
          }));

          // Resume conversation where it left off — no auto-generated "welcome back"
          setMessages(restored);
          setChatHistory(history);
        } else {
          // No history found — but check if this is a transient failure
          // (e.g. auth lock timeout) by seeing if the first_message milestone already exists
          const { data: existingMilestone } = await (supabase as any)
            .from('companion_milestones')
            .select('id')
            .eq('user_id', userId)
            .eq('member_id', memberId)
            .eq('milestone_type', 'first_message')
            .maybeSingle();

          if (existingMilestone) {
            // Milestone exists → this user HAS chatted before; query just returned empty.
            // Show a simple fallback and don't fire first_message milestone again.
            const g = greetingRef.current;
            const fallback = getGreeting(g.companionName, g.userName, g.companionGender, g.companionVibe);
            setMessages([{ id: '1', content: fallback, isUser: false, timestamp: new Date() }]);
            setChatHistory([{ role: 'assistant', content: fallback }]);
          } else {
          // No history — generate a warm AI greeting
          const g = greetingRef.current;
          const staticGreeting = getGreeting(g.companionName, g.userName, g.companionGender, g.companionVibe);
          const greetingMsg: ChatMessage = {
            id: '1',
            content: staticGreeting,
            isUser: false,
            timestamp: new Date(),
          };

          // Show static greeting immediately, then upgrade to AI greeting
          setMessages([greetingMsg]);
          setChatHistory([{ role: 'assistant', content: staticGreeting }]);

          // Fire AI greeting in the background
          generateAIGreeting({
            companionName: g.companionName,
            userName: g.userName,
            companionGender: g.companionGender,
            personality: g.companionPersonality,
            bio: g.companionBio,
            age: g.companionAge,
            vibe: g.companionVibe,
            userVibe: g.userVibe,
          }).then((aiGreeting) => {
            if (cancelled) return;
            // Replace the static greeting with the AI one
            setMessages([{
              id: '1',
              content: aiGreeting,
              isUser: false,
              timestamp: new Date(),
            }]);
            setChatHistory([{ role: 'assistant', content: aiGreeting }]);
            persistMessage(userId, memberId, aiGreeting, 'assistant');
          });

          checkAndRecordMilestone('first_message').then((result) => {
            if (result) {
              setMessages((prev) => [...prev, {
                id: `moment-${Date.now()}`,
                content: result.message,
                isUser: false,
                timestamp: new Date(),
                momentType: result.type,
              }]);
              g.onSaveMilestone?.({ memberId, content: result.message });
            }
            });
          }
        }
      } catch (e) {
        console.error('[Chat] Failed to load history:', e);
        const g = greetingRef.current;
        const greeting = getGreeting(g.companionName, g.userName, g.companionGender, g.companionVibe);
        setMessages([{ id: '1', content: greeting, isUser: false, timestamp: new Date() }]);
        setChatHistory([{ role: 'assistant', content: greeting }]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [userId, memberId]);

  const loadEarlier = useCallback(async () => {
    if (!hasMore || loadingMore || !oldestTimestamp.current) return;
    setLoadingMore(true);
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select(CHAT_MESSAGES_SELECT)
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .lt('created_at', oldestTimestamp.current)
        .order('created_at', { ascending: false })
        .limit(pageSize + 1);

      if (data && data.length > 0) {
        const hasOlder = data.length > pageSize;
        setHasMore(hasOlder);
        const page = hasOlder ? data.slice(0, pageSize) : data;
        const chronological = page.reverse();
        const dedupedData = dedup(chronological);

        if (dedupedData.length > 0) {
          oldestTimestamp.current = dedupedData[0].created_at;
        }

        const older = (await Promise.all(dedupedData.map(rowToMsg))).filter(Boolean) as ChatMessage[];
        const olderHistory = dedupedData.map((row: any) => ({
          role: row.role === 'user' ? 'user' : 'assistant',
          content: row.content,
        }));

        setMessages((prev) => [...older, ...prev]);
        setChatHistory((prev) => [...olderHistory, ...prev]);

        // Summarize the first batch of earlier messages
        if (!hasSummarized.current && olderHistory.length > 0) {
          hasSummarized.current = true;
          summarizeMessages(olderHistory, userName, companionName).then((s) => {
            if (s) setSummary(s);
          });
        }
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('[Chat] Failed to load earlier messages:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, userId, memberId, pageSize]);

  // Real-time subscription — only for SMS/external messages not originating from this session
  const sessionMsgIds = useRef(new Set<string>());
  
  // Track every message ID we add locally so realtime doesn't duplicate them
  const trackMessage = useCallback((id: string, content?: string) => {
    sessionMsgIds.current.add(id);
    if (content) sessionMsgIds.current.add(`content:${content}`);
    // Auto-cleanup after 5 minutes to avoid unbounded growth
    setTimeout(() => {
      sessionMsgIds.current.delete(id);
      if (content) sessionMsgIds.current.delete(`content:${content}`);
    }, 300000);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${userId}-${memberId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const row = payload.new;
          if (row.member_id !== memberId) return;

          const parsedMsg = await rowToMsg(row);
          if (!parsedMsg) return;

          // Skip messages we already added locally in this session
          if (
            sessionMsgIds.current.has(row.id) ||
            sessionMsgIds.current.has(`content:${row.content}`) ||
            sessionMsgIds.current.has(`content:${parsedMsg.content}`)
          ) return;

          let shouldAppend = false;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;

            const isDuplicateRecentMessage = prev.slice(-20).some((m) => (
              m.isUser === parsedMsg.isUser &&
              m.content === parsedMsg.content &&
              (m.imageUrl || '') === (parsedMsg.imageUrl || '')
            ));
            if (isDuplicateRecentMessage) return prev;

            shouldAppend = true;
            return [...prev, parsedMsg];
          });

          if (shouldAppend) {
            setChatHistory((prev) => [
              ...prev,
              {
                role: row.role === 'user' ? 'user' : 'assistant',
                content: encodeImageContent(parsedMsg.content, parsedMsg.imageUrl),
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, memberId]);

  const addMessage = useCallback((msg: ChatMessage) => {
    // Track ID and content so realtime doesn't re-add it
    trackMessage(msg.id, msg.content);
    setMessages((prev) => [...prev, msg]);
  }, [trackMessage]);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const appendHistory = useCallback((entry: { role: string; content: string }) => {
    setChatHistory((prev) => [...prev, entry]);
  }, []);

  const incrementUserCount = useCallback(() => {
    userMessageCount.current += 1;
    // Trigger bio enrichment every 20 user messages
    if (userMessageCount.current % 20 === 0) {
      enrichCompanionBio({
        userId,
        memberId,
        companionName,
        currentBio: companionBio,
        recentMessages: chatHistory,
      });
    }
    return userMessageCount.current;
  }, [userId, memberId, companionName, companionBio, chatHistory]);

  const deleteMessage = useCallback(async (messageId: string) => {
    // Optimistic removal
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setChatHistory((prev) => {
      // Remove corresponding entry by index alignment (best-effort)
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex >= 0 && msgIndex < prev.length) {
        return prev.filter((_, i) => i !== msgIndex);
      }
      return prev;
    });
    try {
      const { error } = await supabase.from('chat_messages').delete().eq('id', messageId).eq('user_id', userId);
      if (error) throw error;
    } catch (e) {
      console.error('[Chat] Failed to delete message:', e);
      toast.error('Could not delete message');
    }
  }, [userId, messages]);

  const loadMore = loadEarlier;

  // Manual refetch — re-reads latest messages from DB (e.g. after notification arrives)
  const refetch = useCallback(async () => {
    try {
      // Brief loading flash so user sees the refresh happen
      setLoading(true);

      const { data } = await supabase
        .from('chat_messages')
        .select(CHAT_MESSAGES_SELECT)
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(pageSize + 1);

      if (data && data.length > 0) {
        const hasOlder = data.length > pageSize;
        setHasMore(hasOlder);
        const page = hasOlder ? data.slice(0, pageSize) : data;
        const chronological = page.reverse();
        const dedupedData = dedup(chronological);

        if (dedupedData.length > 0) {
          oldestTimestamp.current = dedupedData[0].created_at;
        }

        const restored = (await Promise.all(dedupedData.map(rowToMsg))).filter(Boolean) as ChatMessage[];
        const history = dedupedData.map((row: any) => ({
          role: row.role === 'user' ? 'user' : 'assistant',
          content: row.content,
        }));

        setMessages(restored);
        setChatHistory(history);
      }
    } catch (e) {
      console.error('[Chat] Refetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, memberId]);

  return {
    messages,
    setMessages,
    chatHistory,
    setChatHistory,
    loading,
    hasMore,
    loadingMore,
    loadEarlier,
    loadMore,
    summary,
    userMessageCount: userMessageCount.current,
    addMessage,
    updateMessage,
    deleteMessage,
    appendHistory,
    incrementUserCount,
    trackMessage,
    persistMessage: (content: string, role: 'user' | 'assistant', source?: string, imageUrl?: string, messageId?: string) => persistMessage(userId, memberId, content, role, source, imageUrl, messageId),
    checkAndRecordMilestone,
    checkStreak,
    refetch,
  };
}
