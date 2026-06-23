/**
 * boards.ts — Data layer for the public Board (third layer of the architecture).
 *
 * Sanctuary (private read) → Workspace (private create) → Board (public, opt-in).
 *
 * One board per user. Items are polymorphic via `kind`.
 */

import { supabase } from "@/integrations/supabase/client";

export type BoardItemKind = "poem" | "note" | "video" | "audio" | "scripture" | "link";

export type AvatarMode = "upload" | "default" | "none";
export type VideoProvider = "youtube" | "vimeo";

export interface Board {
  user_id: string;
  bio: string | null;
  featured_scripture_ref: string | null;
  theme: string;
  published: boolean;
  show_bible_link: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardItem {
  id: string;
  user_id: string;
  kind: BoardItemKind;
  subkind: string | null;
  ref_id: string | null;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  video_provider: VideoProvider | null;
  video_id: string | null;
  position: number;
  audio_reflection: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicBoardProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  handle: string | null;
  bio: string | null;
  avatar_mode: AvatarMode;
}

const HANDLE_RE = /^[a-z][a-z0-9_]{2,29}$/;

export function isValidHandleFormat(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

/** Auto-suggest a handle from a display name. May still collide / be reserved — caller checks. */
export function suggestHandle(
  displayName: string | null | undefined,
  email?: string | null,
): string {
  const seed = (displayName || email?.split("@")[0] || "friend").toLowerCase();
  let h = seed.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(h)) h = "s_" + h;
  h = h.slice(0, 30);
  if (h.length < 3) h = (h + "_user").slice(0, 30);
  return h;
}

export async function isHandleAvailable(
  handle: string,
  excludeUserId?: string,
): Promise<{
  available: boolean;
  reason?: "format" | "reserved" | "taken";
}> {
  if (!isValidHandleFormat(handle)) return { available: false, reason: "format" };

  const { data: reserved } = await supabase
    .from("reserved_handles")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();
  if (reserved) return { available: false, reason: "reserved" };

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (taken && taken.id !== excludeUserId) return { available: false, reason: "taken" };

  return { available: true };
}

export async function claimHandle(userId: string, handle: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ handle }).eq("id", userId);
  if (error) throw error;
}

export async function getOwnHandle(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
  return data?.handle ?? null;
}

export async function getOwnBoard(userId: string): Promise<Board | null> {
  const { data } = await supabase.from("boards").select("*").eq("user_id", userId).maybeSingle();
  return (data as Board | null) ?? null;
}

export async function upsertOwnBoard(
  userId: string,
  patch: Partial<Omit<Board, "user_id" | "created_at" | "updated_at">>,
): Promise<Board> {
  const { data, error } = await supabase
    .from("boards")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Board;
}

export async function listOwnBoardItems(userId: string): Promise<BoardItem[]> {
  const { data, error } = await supabase
    .from("board_items")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BoardItem[];
}

type NewBoardItemInput = Omit<
  BoardItem,
  | "id"
  | "created_at"
  | "updated_at"
  | "position"
  | "video_provider"
  | "video_id"
  | "audio_reflection"
  | "subkind"
> & {
  position?: number;
  video_provider?: VideoProvider | null;
  video_id?: string | null;
  audio_reflection?: boolean;
  subkind?: string | null;
};

export async function addBoardItem(item: NewBoardItemInput): Promise<BoardItem> {
  const { data, error } = await supabase
    .from("board_items")
    .insert({
      ...item,
      position: item.position ?? 0,
      video_provider: item.video_provider ?? null,
      video_id: item.video_id ?? null,
      audio_reflection: item.audio_reflection ?? false,
      subkind: item.subkind ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as BoardItem;
}

export async function deleteBoardItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("board_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function updateBoardItem(
  itemId: string,
  patch: Partial<
    Pick<
      BoardItem,
      | "title"
      | "caption"
      | "thumbnail_url"
      | "external_url"
      | "position"
      | "video_provider"
      | "video_id"
      | "audio_reflection"
    >
  >,
): Promise<void> {
  const { error } = await supabase.from("board_items").update(patch).eq("id", itemId);
  if (error) throw error;
}

/* ─── Profile / avatar ─── */

export async function updateOwnProfileMedia(
  userId: string,
  patch: { avatar_url?: string | null; avatar_mode?: AvatarMode },
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/* ─── Storage helpers ─── */

const BOARD_BUCKET = "board-media";

/** Compress an image client-side to a JPEG blob with a max dimension. */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<Blob> {
  const maxDim = opts.maxDim ?? 1200;
  const quality = opts.quality ?? 0.82;

  const bitmap = await createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise<ImageBitmap>((resolve, reject) => {
        const img = new Image();
        img.onload = () => createImageBitmap(img).then(resolve, reject);
        img.onerror = reject;
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality,
    );
  });
}

async function uploadToBoardMedia(path: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage
    .from(BOARD_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from(BOARD_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function uploadAvatarImage(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file, { maxDim: 512, quality: 0.85 });
  return uploadToBoardMedia(`${userId}/avatar.jpg`, blob);
}

export async function uploadItemThumbnail(
  userId: string,
  itemId: string,
  file: File,
): Promise<string> {
  const blob = await compressImage(file, { maxDim: 1200, quality: 0.82 });
  return uploadToBoardMedia(`${userId}/items/${itemId}.jpg`, blob);
}

export async function deleteItemThumbnail(userId: string, itemId: string): Promise<void> {
  await supabase.storage.from(BOARD_BUCKET).remove([`${userId}/items/${itemId}.jpg`]);
}

/* ─── Video helpers (YouTube + Vimeo only) ─── */

export function parseVideoUrl(
  url: string | null | undefined,
): { provider: VideoProvider; id: string } | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return { provider: "youtube", id: v };
    const m = u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,})/);
    if (m) return { provider: "youtube", id: m[1] };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return { provider: "youtube", id };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,})/);
    if (m) return { provider: "vimeo", id: m[1] };
  }
  return null;
}

export function youtubePosterUrl(id: string): string {
  // maxresdefault is sharp HD when available; consumers should fall back to hqdefault on error.
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

export function youtubePosterFallbackUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export async function vimeoPosterUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://vimeo.com/api/v2/video/${id}.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ thumbnail_large?: string }>;
    return json?.[0]?.thumbnail_large ?? null;
  } catch {
    return null;
  }
}

/** Resolve the immediately-available thumbnail for an item (manual or YouTube poster). Vimeo needs async fetch. */
export function resolveItemThumbnail(
  item: Pick<BoardItem, "thumbnail_url" | "video_provider" | "video_id">,
): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.video_provider === "youtube" && item.video_id) return youtubePosterUrl(item.video_id);
  return null;
}

/** Public lookup by handle. Returns null if not published or handle missing. */
export async function getPublicBoardByHandle(handle: string): Promise<{
  profile: PublicBoardProfile;
  board: Board;
  items: BoardItem[];
} | null> {
  const normalized = handle.trim().toLowerCase();
  if (!isValidHandleFormat(normalized)) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, handle, bio, avatar_mode")
    .eq("handle", normalized)
    .maybeSingle();
  if (!profile) return null;

  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", profile.id)
    .eq("published", true)
    .maybeSingle();
  if (!board) return null;

  const { data: items } = await supabase
    .from("board_items")
    .select("*")
    .eq("user_id", profile.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return {
    profile: profile as PublicBoardProfile,
    board: board as Board,
    items: (items ?? []) as BoardItem[],
  };
}
