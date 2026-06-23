import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  imageUrl?: string;
}

interface SessionState {
  messages: ChatMessage[];
  phase: string;
  answers: string[];
  genderPreference: string;
  visualMode: string;
  matchResult: any;
  fastTrackText: string;
  appearanceDesc: string;
  privateMode: boolean;
}

/**
 * Persists and restores Cami matchmaking session state to the database.
 */
function normalizeStoredMessages(raw: unknown): ChatMessage[] {
  const normalizeArray = (arr: unknown[]): ChatMessage[] =>
    arr
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, index) => {
        const hasText = typeof item.content === 'string';
        const hasImage = typeof item.imageUrl === 'string' && item.imageUrl.length > 0;
        if (!hasText && !hasImage) return null;

        return {
          id: typeof item.id === 'string' ? item.id : `restored-${index}`,
          content: hasText ? (item.content as string) : '',
          isUser: Boolean(item.isUser),
          imageUrl: hasImage ? (item.imageUrl as string) : undefined,
        };
      })
      .filter((msg) => msg !== null) as ChatMessage[];

  if (Array.isArray(raw)) return normalizeArray(raw);

  if (typeof raw === 'string') {
    try {
      return normalizeStoredMessages(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (raw && typeof raw === 'object' && 'messages' in (raw as Record<string, unknown>)) {
    return normalizeStoredMessages((raw as Record<string, unknown>).messages);
  }

  return [];
}

function hasMeaningfulUserInput(messages: ChatMessage[]): boolean {
  return messages.some((msg) => msg.isUser && (msg.content.trim().length > 0 || Boolean(msg.imageUrl)));
}

export function useMatchmakingSession(userId: string | undefined, privateMode: boolean) {
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const loaded = useRef(false);
  const pendingState = useRef<SessionState | null>(null);

  const load = useCallback(async (): Promise<SessionState | null> => {
    if (!userId) return null;
    try {
      const { data } = await supabase
        .from('matchmaking_sessions' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) return null;

      const d = data as any;
      // Only restore if same mode
      if (d.private_mode !== privateMode) return null;

      const restoredMessages = normalizeStoredMessages(d.messages);

      // Ignore stale "assistant-only" drafts so Cami can greet fresh next time.
      if (restoredMessages.length === 0 || !hasMeaningfulUserInput(restoredMessages)) {
        await supabase.from('matchmaking_sessions' as any).delete().eq('user_id', userId);
        return null;
      }

      // Auto-clean stale drafts older than 24 hours
      const updatedAt = d.updated_at ? new Date(d.updated_at).getTime() : 0;
      const ageMs = Date.now() - updatedAt;
      const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
      if (ageMs > STALE_THRESHOLD_MS) {
        logger.log('[MatchmakingSession] Stale draft (>24h) — archiving and clearing');
        // Archive before deleting so history is preserved
        try {
          const firstUserMsg = restoredMessages.find(m => m.isUser && m.content.trim().length > 0)?.content || '';
          if (firstUserMsg) {
            const title = firstUserMsg.slice(0, 50) + (firstUserMsg.length > 50 ? '...' : '');
            await supabase.from('cami_session_history' as any).insert({
              user_id: userId,
              title,
              first_message: firstUserMsg.slice(0, 200),
              message_count: restoredMessages.length,
              messages: restoredMessages as any,
              phase: d.phase || 'intro',
              match_result: d.match_result,
              session_date: d.updated_at || new Date().toISOString(),
            } as any);
          }
        } catch (e) {
          console.error('[MatchmakingSession] Failed to archive stale draft:', e);
        }
        await supabase.from('matchmaking_sessions' as any).delete().eq('user_id', userId);
        return null;
      }

      loaded.current = true;
      return {
        messages: restoredMessages,
        phase: d.phase || 'intro',
        answers: (d.answers || []) as string[],
        genderPreference: d.gender_preference || 'neutral',
        visualMode: d.connection_mode || 'unsure',
        matchResult: d.match_result || null,
        fastTrackText: d.fast_track_text || '',
        appearanceDesc: d.appearance_desc || '',
        privateMode: d.private_mode || false,
      };
    } catch (err) {
      console.error('[MatchmakingSession] Load failed:', err);
      return null;
    }
  }, [userId, privateMode]);

  // Immediate save (no debounce) — used for flush on unmount
  const saveImmediate = useCallback(async (state: SessionState) => {
    if (!userId || !hasMeaningfulUserInput(state.messages)) return;
    try {
      await supabase.from('matchmaking_sessions' as any).upsert({
        user_id: userId,
        messages: state.messages as any,
        phase: state.phase,
        answers: state.answers as any,
        gender_preference: state.genderPreference,
        connection_mode: state.visualMode,
        match_result: state.matchResult as any,
        fast_track_text: state.fastTrackText,
        appearance_desc: state.appearanceDesc,
        private_mode: state.privateMode,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'user_id' } as any);
    } catch (err) {
      console.error('[MatchmakingSession] Save failed:', err);
    }
  }, [userId]);

  const save = useCallback((state: SessionState) => {
    if (!userId || !hasMeaningfulUserInput(state.messages)) {
      pendingState.current = null;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      return;
    }
    pendingState.current = state;

    // Debounce saves to avoid hammering the DB
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveImmediate(state);
      pendingState.current = null;
    }, 600);
  }, [userId, saveImmediate]);

  const clear = useCallback(async () => {
    if (!userId) return;
    pendingState.current = null;
    try {
      await supabase.from('matchmaking_sessions' as any).delete().eq('user_id', userId);
    } catch (err) {
      console.error('[MatchmakingSession] Clear failed:', err);
    }
  }, [userId]);

  // Flush pending state on unmount so nothing is lost
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingState.current && userId) {
        // Fire-and-forget save on unmount
        saveImmediate(pendingState.current);
      }
    };
  }, [userId, saveImmediate]);

  return { load, save, clear };
}
