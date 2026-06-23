import { supabase } from "@/integrations/supabase/client";

const ACTIVE_KEY = "sanctum:vault:active-collection";

export type VaultCollection = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  master_thought: string | null;
  color: string;
  archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type VaultItemType = "verse" | "note" | "quote" | "link" | "blueprint";

export type VaultItem = {
  id: string;
  user_id: string;
  collection_id: string;
  item_type: VaultItemType;
  book: string | null;
  chapter: number | null;
  verse_start: number | null;
  verse_end: number | null;
  version: string | null;
  scripture_ref: string | null;
  quote_text: string | null;
  note_text: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export function getActiveCollectionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function setActiveCollectionId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new CustomEvent("vault:active-changed", { detail: id }));
}

export async function listCollections(userId: string, opts?: { archived?: boolean }) {
  const { data, error } = await supabase
    .from("vault_collections")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", opts?.archived ?? false)
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VaultCollection[];
}

export class DuplicateNameError extends Error {
  constructor(public title: string) {
    super(`A collection named "${title}" already exists.`);
    this.name = "DuplicateNameError";
  }
}

/**
 * Returns true if a collection (any archive state) with this title already exists for this user.
 * Case-insensitive, trimmed. Pass `excludeId` when renaming to ignore the row being edited.
 */
export async function collectionNameExists(
  userId: string,
  title: string,
  excludeId?: string,
): Promise<boolean> {
  const trimmed = title.trim();
  if (!trimmed) return false;
  let query = supabase
    .from("vault_collections")
    .select("id")
    .eq("user_id", userId)
    .ilike("title", trimmed)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).length > 0;
}

const AUTO_COLORS: string[] = [
  "gold",
  "amber",
  "rose",
  "violet",
  "indigo",
  "teal",
  "emerald",
  "slate",
];

export async function createCollection(userId: string, title: string) {
  const trimmed = title.trim() || "Untitled Study";
  if (await collectionNameExists(userId, trimmed)) {
    throw new DuplicateNameError(trimmed);
  }
  // New collections go to the top (position = min - 1 or 0)
  const { data: existing } = await supabase
    .from("vault_collections")
    .select("position")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("position", { ascending: true })
    .limit(1);
  const minPos = existing && existing.length > 0 ? (existing[0].position ?? 0) : 0;

  // Auto-rotate accent color so collections are visually distinct out of the gate.
  const { count } = await supabase
    .from("vault_collections")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const color = AUTO_COLORS[(count ?? 0) % AUTO_COLORS.length];

  const { data, error } = await supabase
    .from("vault_collections")
    .insert({ user_id: userId, title: trimmed, position: minPos - 1, color })
    .select("*")
    .single();
  if (error) throw error;
  return data as VaultCollection;
}

export async function reorderCollections(orderedIds: string[]) {
  // Persist new positions sequentially. Run in parallel.
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("vault_collections").update({ position: idx }).eq("id", id),
    ),
  );
}

export async function reorderItems(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("vault_items").update({ position: idx }).eq("id", id),
    ),
  );
}

export async function archiveCollection(id: string, archived = true) {
  const { error } = await supabase.from("vault_collections").update({ archived }).eq("id", id);
  if (error) throw error;
}

export async function updateCollection(
  id: string,
  patch: Partial<
    Pick<VaultCollection, "title" | "description" | "master_thought" | "color" | "archived">
  >,
  opts?: { userId?: string },
) {
  if (typeof patch.title === "string" && opts?.userId) {
    const trimmed = patch.title.trim();
    if (trimmed && (await collectionNameExists(opts.userId, trimmed, id))) {
      throw new DuplicateNameError(trimmed);
    }
  }
  const { error } = await supabase.from("vault_collections").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from("vault_collections").delete().eq("id", id);
  if (error) throw error;
}

export async function listItems(collectionId: string) {
  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VaultItem[];
}

export async function addVerseToCollection(
  userId: string,
  collectionId: string,
  payload: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end?: number;
    version?: string;
    quote_text?: string;
    note_text?: string;
  },
) {
  const verseEnd = payload.verse_end ?? payload.verse_start;
  const ref =
    verseEnd === payload.verse_start
      ? `${payload.book} ${payload.chapter}:${payload.verse_start}`
      : `${payload.book} ${payload.chapter}:${payload.verse_start}-${verseEnd}`;
  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      user_id: userId,
      collection_id: collectionId,
      item_type: "verse",
      book: payload.book,
      chapter: payload.chapter,
      verse_start: payload.verse_start,
      verse_end: verseEnd,
      version: payload.version ?? "KJV",
      scripture_ref: ref,
      quote_text: payload.quote_text ?? null,
      note_text: payload.note_text ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VaultItem;
}

export async function addNoteToCollection(userId: string, collectionId: string, noteText: string) {
  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      user_id: userId,
      collection_id: collectionId,
      item_type: "note",
      note_text: noteText,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VaultItem;
}

export async function updateItemNote(id: string, noteText: string | null) {
  const { error } = await supabase.from("vault_items").update({ note_text: noteText }).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("vault_items").delete().eq("id", id);
  if (error) throw error;
}

/** Fetch a single Vault item by id (RLS-scoped to caller). */
export async function getItem(id: string): Promise<VaultItem | null> {
  const { data, error } = await supabase.from("vault_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as VaultItem | null) ?? null;
}

/**
 * Save a Scriptural Blueprint snapshot into a collection. Stores the full
 * blueprint payload as JSON in `note_text` so future opens are token-free.
 */
export async function addBlueprintToCollection(
  userId: string,
  collectionId: string,
  payload: {
    book: string;
    chapter: number;
    verse_start?: number | null;
    verse_end?: number | null;
    version?: string;
    scripture_ref: string;
    blueprint: unknown; // serialized BlueprintData snapshot
  },
) {
  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      user_id: userId,
      collection_id: collectionId,
      item_type: "blueprint",
      book: payload.book,
      chapter: payload.chapter,
      verse_start: payload.verse_start ?? null,
      verse_end: payload.verse_end ?? null,
      version: payload.version ?? "KJV",
      scripture_ref: payload.scripture_ref,
      note_text: JSON.stringify(payload.blueprint),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VaultItem;
}

/**
 * Look up an existing blueprint snapshot for the same scripture reference
 * inside the given collection. Used by the "Update vs Save New" flow so the
 * vault doesn't fill up with duplicate Blueprints for the same passage.
 */
export async function findBlueprintForRef(
  userId: string,
  collectionId: string,
  scriptureRef: string,
): Promise<VaultItem | null> {
  const { data } = await supabase
    .from("vault_items")
    .select("*")
    .eq("user_id", userId)
    .eq("collection_id", collectionId)
    .eq("item_type", "blueprint")
    .eq("scripture_ref", scriptureRef)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VaultItem | null) ?? null;
}

/** Overwrite an existing blueprint snapshot in place. */
export async function updateBlueprintSnapshot(itemId: string, blueprint: unknown): Promise<void> {
  const { error } = await supabase
    .from("vault_items")
    .update({
      note_text: JSON.stringify(blueprint),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) throw error;
}

/**
 * Find or create a default "Blueprints" collection for the user. Used as a
 * fallback when no active collection is selected at save time.
 */
export async function ensureBlueprintsCollection(userId: string): Promise<VaultCollection> {
  const { data } = await supabase
    .from("vault_collections")
    .select("*")
    .eq("user_id", userId)
    .ilike("title", "Blueprints")
    .eq("archived", false)
    .limit(1)
    .maybeSingle();
  if (data) return data as VaultCollection;
  return createCollection(userId, "Blueprints");
}
