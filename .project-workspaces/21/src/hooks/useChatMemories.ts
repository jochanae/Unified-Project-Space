import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadMemory, saveMemory, mergeNewMemories, MemoryEntry } from '@/lib/memory';

const EXTRACT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-memories`;
const EXTRACT_COMPANION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-companion-facts`;
const CONSOLIDATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consolidate-memories`;
const FREE_MEMORY_CAP = 5;
const CONSOLIDATION_THRESHOLD = 150;

export function useChatMemories(userName: string, userId: string, subscribed?: boolean, memberId?: string, companionName?: string) {
  const extractMemories = useCallback(async (history: { role: string; content: string }[], matureMode?: boolean) => {
    try {
      // For free users, check if they've hit the memory cap
      if (!subscribed) {
        const { count } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        if ((count ?? 0) >= FREE_MEMORY_CAP) return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // Run both extractions in parallel — user memories + companion facts
      const [resp, companionResp] = await Promise.all([
        fetch(EXTRACT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: history, userName }),
        }),
        memberId && companionName
          ? fetch(EXTRACT_COMPANION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ messages: history, companionName, userName }),
            })
          : Promise.resolve(null),
      ]);

      // ── User memories ──
      if (resp.ok) {
        const data = await resp.json();
        let newEntries: MemoryEntry[] = data.entries || [];

        if (!subscribed && newEntries.length > 0) {
          const { count } = await supabase
            .from('memories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          const remaining = Math.max(0, FREE_MEMORY_CAP - (count ?? 0));
          if (remaining === 0) return;
          newEntries = newEntries.slice(0, remaining);
        }

        if (newEntries.length > 0) {
          const current = loadMemory();
          const updated = mergeNewMemories(current, newEntries);
          saveMemory(updated);

          const source = matureMode ? 'mature' : 'standard';
          for (const e of newEntries) {
            const { data: existing } = await supabase
              .from('memories')
              .select('id')
              .eq('user_id', userId)
              .eq('text', e.text)
              .limit(1);
            if (!existing || existing.length === 0) {
              await supabase.from('memories').insert({
                user_id: userId,
                text: e.text,
                category: e.category,
                extracted_at: e.extractedAt || new Date().toISOString(),
                source,
                member_id: memberId || 'unknown',
                tier: (e as any).tier || 'contextual',
                emotional_weight: (e as any).emotional_weight || 0,
                vulnerability_score: (e as any).vulnerability_score || 0,
                themes: (e as any).themes || [],
              });
            }
          }

          if (subscribed) {
            const { count: totalCount } = await supabase
              .from('memories')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);
            if ((totalCount ?? 0) >= CONSOLIDATION_THRESHOLD) {
              fetch(CONSOLIDATE_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userId }),
              }).catch((err) => console.warn('[Memory] Consolidation trigger failed:', err));
            }
          }
        }
      }

      // ── Companion facts ──
      if (companionResp?.ok && memberId) {
        const companionData = await companionResp.json();
        const companionEntries: { text: string; category: string; extractedAt: string }[] = companionData.entries || [];
        for (const e of companionEntries) {
          const { data: existing } = await supabase
            .from('companion_facts')
            .select('id')
            .eq('user_id', userId)
            .eq('member_id', memberId)
            .eq('text', e.text)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from('companion_facts').insert({
              user_id: userId,
              member_id: memberId,
              text: e.text,
              category: e.category,
              extracted_at: e.extractedAt || new Date().toISOString(),
              source: 'auto',
            });
          }
        }
      }
    } catch (e) {
      console.error('[Memory] Extraction failed:', e);
    }
  }, [userName, userId, subscribed, memberId, companionName]);

  return { extractMemories };
}
