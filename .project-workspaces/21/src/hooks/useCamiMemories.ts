import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EXTRACT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-memories`;

export interface CamiMemoryEntry {
  id: string;
  text: string;
  category: string;
  source: string;
  extracted_at: string;
}

/**
 * Manages Cami's independent memory layer.
 * - Loads existing Cami memories from DB
 * - Extracts new memories from Cami conversations
 * - Returns formatted memory string for AI prompts
 * - Premium-gated: only persists/loads when isPremium is true
 */
export function useCamiMemories(userId: string | undefined, userName: string, isPremium: boolean) {
  const [memories, setMemories] = useState<CamiMemoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load existing Cami memories from DB (premium only)
  useEffect(() => {
    if (!userId || !isPremium) {
      setMemories([]);
      setLoaded(true);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from('cami_memories')
        .select('*')
        .eq('user_id', userId)
        .order('extracted_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setMemories(data as CamiMemoryEntry[]);
      }
      setLoaded(true);
    };

    load();
  }, [userId, isPremium]);

  // Format memories into a string for AI prompts
  const getMemoryString = useCallback((): string => {
    if (!isPremium || memories.length === 0) return '';

    const grouped: Record<string, string[]> = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m.text);
    }

    const sections: string[] = [];
    if (grouped.general?.length) sections.push(`Life details: ${grouped.general.join('. ')}`);
    if (grouped.emotional?.length) sections.push(`Emotional context: ${grouped.emotional.join('. ')}`);
    if (grouped.wellness?.length) sections.push(`Wellness notes: ${grouped.wellness.join('. ')}`);

    return sections.join('\n');
  }, [memories, isPremium]);

  // Extract and persist new memories from a Cami conversation
  const extractCamiMemories = useCallback(async (
    messages: { role: string; content: string }[],
    source: 'matchmaking' | 'coaching' = 'matchmaking'
  ) => {
    if (!userId || !isPremium) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const resp = await fetch(EXTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, userName }),
      });

      if (!resp.ok) return;
      const data = await resp.json();
      const entries: { text: string; category: string }[] = data.entries || [];

      if (entries.length === 0) return;

      // Deduplicate against existing memories
      const existingTexts = new Set(memories.map(m => m.text.toLowerCase()));
      const newEntries = entries.filter(e => !existingTexts.has(e.text.toLowerCase()));

      if (newEntries.length === 0) return;

      const dbRows = newEntries.map(e => ({
        user_id: userId,
        text: e.text,
        category: e.category,
        source,
      }));

      const { data: inserted, error } = await supabase
        .from('cami_memories')
        .insert(dbRows)
        .select();

      if (!error && inserted) {
        setMemories(prev => [...(inserted as CamiMemoryEntry[]), ...prev]);
      }
    } catch (e) {
      console.error('[CamiMemory] Extraction failed:', e);
    }
  }, [userId, isPremium, userName, memories]);

  return {
    memories,
    loaded,
    getMemoryString,
    extractCamiMemories,
  };
}
