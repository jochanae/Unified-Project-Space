import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractArtifactsFromMessage, type ArtifactKind } from '@/lib/artifactExtractor';
import { logger } from '@/utils/logger';

export interface ChatArtifact {
  id: string;
  user_id: string;
  member_id: string;
  message_id: string | null;
  kind: ArtifactKind;
  title: string;
  language: string | null;
  content: string;
  pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  project_id: string | null;
}

export function useChatArtifacts(userId: string | null, memberId: string | null, projectId?: string | null) {
  const [artifacts, setArtifacts] = useState<ChatArtifact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArtifacts = useCallback(async () => {
    if (!userId || !memberId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_artifacts')
      .select('*')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      logger.warn('[Artifacts] fetch failed:', error.message);
    } else {
      setArtifacts((data ?? []) as ChatArtifact[]);
    }
    setLoading(false);
  }, [userId, memberId]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  /**
   * Backfill: any recent assistant message containing a code fence that
   * didn't get captured live (page reload, web-search re-persist, etc.)
   * gets extracted and saved here. Deduped by message_id.
   */
  useEffect(() => {
    if (!userId || !memberId) return;
    let cancelled = false;
    (async () => {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .eq('role', 'assistant')
        .like('content', '%```%')
        .order('created_at', { ascending: false })
        .limit(40);
      if (cancelled || !msgs?.length) return;

      const { data: existing } = await supabase
        .from('chat_artifacts')
        .select('message_id')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .not('message_id', 'is', null)
        .in('message_id', msgs.map(m => m.id));
      if (cancelled) return;

      const seen = new Set((existing ?? []).map(r => r.message_id));
      const rows: any[] = [];
      for (const m of msgs) {
        if (seen.has(m.id)) continue;
        const extracted = extractArtifactsFromMessage(m.content || '');
        for (const a of extracted) {
          rows.push({
            user_id: userId,
            member_id: memberId,
            message_id: m.id,
            kind: a.kind,
            title: a.title,
            language: a.language ?? null,
            content: a.content,
            project_id: projectId ?? null,
          });
        }
      }
      if (rows.length === 0 || cancelled) return;
      const { error } = await supabase.from('chat_artifacts').insert(rows);
      if (error) {
        logger.warn('[Artifacts] backfill insert failed:', error.message);
      } else {
        logger.log(`[Artifacts] backfilled ${rows.length} from ${msgs.length} recent messages`);
        fetchArtifacts();
      }
    })();
    return () => { cancelled = true; };
  }, [userId, memberId, projectId, fetchArtifacts]);

  // Realtime subscription
  useEffect(() => {
    if (!userId || !memberId) return;
    const channel = supabase
      .channel(`chat-artifacts-${memberId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_artifacts', filter: `member_id=eq.${memberId}` },
        () => fetchArtifacts()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, memberId, fetchArtifacts]);

  /** Extract & persist artifacts from a fresh assistant message. */
  const captureFromMessage = useCallback(async (messageId: string, content: string) => {
    if (!userId || !memberId || !content) return;
    const extracted = extractArtifactsFromMessage(content);
    if (extracted.length === 0) return;

    const rows = extracted.map(a => ({
      user_id: userId,
      member_id: memberId,
      message_id: messageId,
      kind: a.kind,
      title: a.title,
      language: a.language ?? null,
      content: a.content,
      project_id: projectId ?? null,
    }));

    const { error } = await supabase.from('chat_artifacts').insert(rows);
    if (error) logger.warn('[Artifacts] insert failed:', error.message);
  }, [userId, memberId, projectId]);

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    await supabase.from('chat_artifacts').update({ pinned: !pinned }).eq('id', id);
  }, []);

  const updateContent = useCallback(async (id: string, content: string, title?: string) => {
    const patch: Record<string, unknown> = { content };
    if (title) patch.title = title;
    const { error } = await supabase.from('chat_artifacts').update(patch).eq('id', id);
    if (error) logger.warn('[Artifacts] update failed:', error.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from('chat_artifacts').delete().eq('id', id);
  }, []);

  /** Manually create a blank artifact in the Workbench. */
  const createBlank = useCallback(async (
    kind: ArtifactKind = 'code',
    language: string | null = 'tsx',
  ): Promise<string | null> => {
    if (!userId || !memberId) return null;
    const stamp = new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const title = kind === 'code'
      ? `Untitled snippet — ${stamp}`
      : kind === 'plan'
        ? `New plan — ${stamp}`
        : `Untitled ${kind} — ${stamp}`;

    // Seed plans with a starter blueprint scaffold so the page isn't intimidating.
    const PLAN_TEMPLATE = [
      '# New plan',
      '',
      '## 🎯 Goal',
      '_What outcome are you aiming for? Be specific._',
      '',
      '## 🧭 Context',
      '_Why this matters now. Constraints, deadlines, who\'s involved._',
      '',
      '## 🪜 Steps',
      '1. ',
      '2. ',
      '3. ',
      '',
      '## ✅ Success criteria',
      '- ',
      '- ',
      '',
      '## 📝 Notes',
      '',
    ].join('\n');

    const seedContent = kind === 'plan' ? PLAN_TEMPLATE : '';

    const { data, error } = await supabase.from('chat_artifacts').insert({
      user_id: userId,
      member_id: memberId,
      message_id: null,
      kind,
      title,
      language,
      content: seedContent,
      project_id: projectId ?? null,
    }).select('id').single();
    if (error) {
      logger.warn('[Artifacts] create failed:', error.message);
      return null;
    }
    return data?.id ?? null;
  }, [userId, memberId, projectId]);

  return { artifacts, loading, captureFromMessage, togglePin, updateContent, remove, createBlank, refetch: fetchArtifacts };
}
