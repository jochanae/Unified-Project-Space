import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueue } from "@/lib/offline-queue";
import type { Version } from "@/lib/scripture";

export type VerseHighlight = {
  id: string;
  verse_start: number;
  verse_end: number;
  version: Version;
  tone: "gold";
};

const TEMP_PREFIX = "tmp:";
function tempId(): string {
  return `${TEMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function useVerseHighlights({
  userId,
  book,
  chapter,
  version,
}: {
  userId?: string;
  book?: string;
  chapter?: number;
  version: Version;
}) {
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [loading, setLoading] = useState(Boolean(userId && book && chapter));

  useEffect(() => {
    if (!userId || !book || !chapter) {
      setHighlights([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    supabase
      .from("verse_highlights")
      .select("id, verse_start, verse_end, version, tone")
      .eq("user_id", userId)
      .eq("book", book)
      .eq("chapter", chapter)
      .eq("version", version)
      .order("verse_start", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setHighlights([]);
        } else {
          setHighlights((data ?? []) as VerseHighlight[]);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [book, chapter, userId, version]);

  const highlightedVerses = useMemo(() => {
    const next = new Set<number>();
    highlights.forEach((highlight) => {
      for (let verse = highlight.verse_start; verse <= highlight.verse_end; verse += 1) {
        next.add(verse);
      }
    });
    return next;
  }, [highlights]);

  const findRange = (verseStart: number, verseEnd: number) =>
    highlights.find(
      (highlight) => highlight.verse_start === verseStart && highlight.verse_end === verseEnd,
    );

  const toggleRange = async ({
    verseStart,
    verseEnd,
  }: {
    verseStart: number;
    verseEnd: number;
  }) => {
    if (!userId || !book || !chapter) return { ok: false as const, authRequired: true };

    const existing = findRange(verseStart, verseEnd);

    if (existing) {
      // Optimistic remove
      setHighlights((current) => current.filter((h) => h.id !== existing.id));

      // If it's a temp/queued insert that hasn't flushed, just drop it.
      if (existing.id.startsWith(TEMP_PREFIX) || isOffline()) {
        if (!existing.id.startsWith(TEMP_PREFIX)) {
          await enqueue({ kind: "highlight.delete", payload: { id: existing.id } });
        }
        return { ok: true as const, active: false };
      }

      const { error } = await supabase.from("verse_highlights").delete().eq("id", existing.id);
      if (error) {
        // Network/transient — queue it.
        await enqueue({ kind: "highlight.delete", payload: { id: existing.id } });
      }
      return { ok: true as const, active: false };
    }

    const insertPayload = {
      user_id: userId,
      book,
      chapter,
      verse_start: verseStart,
      verse_end: verseEnd,
      version,
      tone: "gold",
    };

    // Offline: optimistic insert with a temp id, queue the write.
    if (isOffline()) {
      const optimistic: VerseHighlight = {
        id: tempId(),
        verse_start: verseStart,
        verse_end: verseEnd,
        version,
        tone: "gold",
      };
      setHighlights((current) =>
        [...current, optimistic].sort((a, b) => a.verse_start - b.verse_start),
      );
      await enqueue({ kind: "highlight.insert", payload: insertPayload });
      return { ok: true as const, active: true };
    }

    const { data, error } = await supabase
      .from("verse_highlights")
      .insert(insertPayload)
      .select("id, verse_start, verse_end, version, tone")
      .single();

    if (error || !data) {
      // Network failure — keep the optimistic state and queue.
      const optimistic: VerseHighlight = {
        id: tempId(),
        verse_start: verseStart,
        verse_end: verseEnd,
        version,
        tone: "gold",
      };
      setHighlights((current) =>
        [...current, optimistic].sort((a, b) => a.verse_start - b.verse_start),
      );
      await enqueue({ kind: "highlight.insert", payload: insertPayload });
      return { ok: true as const, active: true };
    }

    setHighlights((current) =>
      [...current, data as VerseHighlight].sort((a, b) => a.verse_start - b.verse_start),
    );
    return { ok: true as const, active: true };
  };

  return {
    highlights,
    highlightedVerses,
    loading,
    hasExactRange: (verseStart: number, verseEnd: number) =>
      Boolean(findRange(verseStart, verseEnd)),
    toggleRange,
  };
}
