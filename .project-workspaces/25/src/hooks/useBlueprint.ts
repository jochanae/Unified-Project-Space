/**
 * useBlueprint — fetches the AI-generated Scriptural Blueprint for a passage.
 *
 * Loads the chapter text from the bundled scripture JSON, then calls the
 * `scriptural-blueprint` edge function. Result is cached in-memory per
 * (version + book + chapter) so re-opening the panel feels instant.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getChapter, loadBible, type Version } from "@/lib/scripture";
import type { BlueprintData } from "@/components/blueprint/ScripturalBlueprint";

type Args = {
  enabled: boolean;
  book: string;
  chapter: number;
  reference: string;
  version?: Version;
};

const cache = new Map<string, BlueprintData>();
const cacheKey = (v: Version, b: string, c: number) => `${v}::${b}::${c}`;

async function fetchBlueprint(args: {
  book: string;
  chapter: number;
  reference: string;
  version: Version;
}): Promise<BlueprintData> {
  const { book, chapter, reference, version } = args;
  const bible = await loadBible();
  const bookIndex = bible.books.findIndex((b) => b.name === book);
  if (bookIndex < 0) {
    throw new Error(`Couldn't locate ${book} in the loaded scripture.`);
  }
  const verses = getChapter(bible, version, bookIndex, chapter);
  if (!verses.length) {
    throw new Error(`No verses found for ${reference}.`);
  }
  // Trim very long chapters to stay well under the model's input budget while
  // still giving it the full passage shape.
  const passageText = verses.join(" ").slice(0, 8000);

  const { data, error } = await supabase.functions.invoke("scriptural-blueprint", {
    body: { reference, passageText, version, book, chapter },
  });

  if (error) {
    const serverMsg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : error.message;
    throw new Error(serverMsg || "Blueprint engine could not respond.");
  }

  const blueprint = (data as { blueprint?: BlueprintData } | null)?.blueprint;
  if (!blueprint) throw new Error("Blueprint engine returned no draft.");
  return blueprint;
}

export function useBlueprint({ enabled, book, chapter, reference, version = "KJV" }: Args) {
  const key = cacheKey(version, book, chapter);
  const [data, setData] = useState<BlueprintData | null>(() => cache.get(key) ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reqId = useRef(0);

  const run = useCallback(async () => {
    if (!enabled || !book || chapter <= 0) return;
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }
    const id = ++reqId.current;
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchBlueprint({ book, chapter, reference, version });
      if (id !== reqId.current) return;
      cache.set(key, next);
      setData(next);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === reqId.current) setIsLoading(false);
    }
  }, [enabled, book, chapter, reference, version, key]);

  useEffect(() => {
    void run();
  }, [run]);

  const retry = useCallback(() => {
    cache.delete(key);
    setData(null);
    void run();
  }, [key, run]);

  return { data, isLoading, error, retry };
}
