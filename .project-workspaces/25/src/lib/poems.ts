/**
 * poems.ts — Data layer for the dedicated `poems` table.
 *
 * The Poem Library lives in /vault but stores poems in their own table so
 * Slice 2 (Deep Dive enrichments, tags, alternate versions) can grow without
 * polluting the generic notes table.
 *
 * Templates: 'heart_cry' | 'psalm' | 'proverb'.
 *
 * Each template uses a different subset of the body fields:
 *   heart_cry → body
 *   psalm     → praise + anchor
 *   proverb   → line
 *
 * The other fields stay empty strings (NOT NULL DEFAULT '' in the schema)
 * so we can keep a single normalized row shape.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PoemData } from "@/components/notes/PoemEditor";

export type PoemTemplate = "heart_cry" | "psalm" | "proverb";

export interface PoemRecord {
  id: string;
  user_id: string;
  template: PoemTemplate;
  title: string | null;
  body: string;
  praise: string;
  anchor: string;
  line: string;
  inspiration: string | null;
  tags: string[];
  deep_dive: unknown | null;
  created_at: string;
  updated_at: string;
}

/** Convert a `PoemRecord` row into the `PoemData` discriminated union the editor uses. */
export function recordToPoemData(record: PoemRecord): PoemData {
  switch (record.template) {
    case "heart_cry":
      return { template: "heart_cry", body: record.body };
    case "psalm":
      return { template: "psalm", praise: record.praise, anchor: record.anchor };
    case "proverb":
      return { template: "proverb", line: record.line };
  }
}

/** Build a partial row from a `PoemData` payload — fields not used by the
 *  current template are explicitly emptied so updates don't leak old content. */
export function poemDataToRow(
  data: PoemData,
): Pick<PoemRecord, "template" | "body" | "praise" | "anchor" | "line"> {
  switch (data.template) {
    case "heart_cry":
      return { template: "heart_cry", body: data.body, praise: "", anchor: "", line: "" };
    case "psalm":
      return { template: "psalm", body: "", praise: data.praise, anchor: data.anchor, line: "" };
    case "proverb":
      return { template: "proverb", body: "", praise: "", anchor: "", line: data.line };
  }
}

/** A short single-line preview suitable for cards. */
export function poemPreview(record: PoemRecord): string {
  const raw =
    record.template === "heart_cry"
      ? record.body
      : record.template === "psalm"
        ? record.praise || record.anchor
        : record.line;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned.length > 140 ? `${cleaned.slice(0, 140)}…` : cleaned || "(empty)";
}

/** Plain-text full-body assembly for clipboard copy / search. */
export function poemFullText(record: PoemRecord): string {
  const parts: string[] = [];
  if (record.title?.trim()) parts.push(record.title.trim());
  if (record.template === "heart_cry") parts.push(record.body);
  if (record.template === "psalm") {
    if (record.praise) parts.push(record.praise);
    if (record.anchor) parts.push(`— ${record.anchor}`);
  }
  if (record.template === "proverb") parts.push(record.line);
  if (record.inspiration?.trim()) parts.push(`\nInspired by ${record.inspiration.trim()}`);
  return parts.join("\n\n").trim();
}

export const TEMPLATE_LABEL: Record<PoemTemplate, string> = {
  heart_cry: "Heart Cry",
  psalm: "Psalm",
  proverb: "Proverb",
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listPoems(userId: string): Promise<PoemRecord[]> {
  const { data, error } = await supabase
    .from("poems")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as PoemRecord[];
}

export async function getPoem(id: string): Promise<PoemRecord | null> {
  const { data, error } = await supabase.from("poems").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as PoemRecord | null) ?? null;
}

export interface CreatePoemInput {
  userId: string;
  data: PoemData;
  inspiration?: string;
  title?: string;
  tags?: string[];
}

export async function createPoem(input: CreatePoemInput): Promise<PoemRecord> {
  const row = {
    user_id: input.userId,
    ...poemDataToRow(input.data),
    title: input.title?.trim() || null,
    inspiration: input.inspiration?.trim() || null,
    tags: input.tags ?? [],
  };
  const { data, error } = await supabase.from("poems").insert(row).select("*").single();
  if (error) throw error;
  return data as PoemRecord;
}

export interface UpdatePoemInput {
  id: string;
  data?: PoemData;
  inspiration?: string | null;
  title?: string | null;
  tags?: string[];
  deepDive?: unknown;
}

export async function updatePoem(input: UpdatePoemInput): Promise<PoemRecord> {
  const patch: Record<string, unknown> = {};
  if (input.data) Object.assign(patch, poemDataToRow(input.data));
  if (input.inspiration !== undefined) {
    patch.inspiration = input.inspiration?.trim() ? input.inspiration.trim() : null;
  }
  if (input.title !== undefined) {
    patch.title = input.title?.trim() ? input.title.trim() : null;
  }
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.deepDive !== undefined) patch.deep_dive = input.deepDive;

  const { data, error } = await supabase
    .from("poems")
    // Cast: dynamic patch shape isn't expressible in the generated table type.
    .update(patch as never)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as PoemRecord;
}

export async function deletePoem(id: string): Promise<void> {
  const { error } = await supabase.from("poems").delete().eq("id", id);
  if (error) throw error;
}

// ─── client-side filtering ───────────────────────────────────────────────────

export function matchesPoemQuery(record: PoemRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    record.title ?? "",
    record.body,
    record.praise,
    record.anchor,
    record.line,
    record.inspiration ?? "",
    ...record.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
