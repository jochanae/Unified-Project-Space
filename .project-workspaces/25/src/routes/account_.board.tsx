import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Eye,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/board/AvatarCropDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { primeProfileCache, useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  addBoardItem,
  claimHandle,
  deleteBoardItem,
  deleteItemThumbnail,
  getOwnBoard,
  getOwnHandle,
  isHandleAvailable,
  isValidHandleFormat,
  listOwnBoardItems,
  parseVideoUrl,
  resolveItemThumbnail,
  suggestHandle,
  updateBoardItem,
  updateOwnProfileMedia,
  uploadAvatarImage,
  uploadItemThumbnail,
  upsertOwnBoard,
  type AvatarMode,
  type Board,
  type BoardItem,
} from "@/lib/boards";
import {
  BOARD_THEMES,
  DEFAULT_THEME,
  type BoardThemeId,
  type BoardThemeTokens,
} from "@/lib/board-themes";
import { useRoles } from "@/hooks/useRoles";
import {
  canAddAnotherItem,
  canUseKind,
  canUseTheme,
  entitlementFor,
  PAID_GATE_COPY,
} from "@/lib/board-entitlements";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/account_/board")({
  head: () => ({
    meta: [
      { title: "Your Board — SanctumIQ" },
      { name: "description", content: "Claim your handle and shape your public board." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BoardSettingsPage,
});

function DisplayNameEditor({ userId, currentName }: { userId: string; currentName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", userId);
      if (error) throw error;
      primeProfileCache(userId, { displayName: trimmed });
      toast.success("Display name updated.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update name.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(currentName);
          setEditing(true);
        }}
        className="group flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground hover:bg-gold/10 transition-colors w-full text-left"
      >
        <span className="flex-1 truncate">{currentName || "Tap to set name"}</span>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-gold-soft transition-colors" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        maxLength={100}
        className="flex-1 rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
        placeholder="Your display name"
        aria-label="Display name"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-gold/90 hover:bg-gold text-obsidian px-3 py-2.5"
        aria-label="Save name"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-md hairline px-3 py-2.5 text-muted-foreground hover:text-foreground"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function BoardSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const profile = useProfile(user?.id);

  const { roles } = useRoles(user?.id);
  const entitlement = useMemo(() => entitlementFor(roles), [roles]);

  const [loading, setLoading] = useState(true);

  const [handle, setHandle] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);

  // Handle claim / edit form
  const [draftHandle, setDraftHandle] = useState("");
  const [checkState, setCheckState] = useState<
    "idle" | "checking" | "ok" | "format" | "reserved" | "taken"
  >("idle");
  const [claiming, setClaiming] = useState(false);
  const [editingHandle, setEditingHandle] = useState(false);

  // Board edit form
  const [bio, setBio] = useState("");
  const [scripture, setScripture] = useState("");
  const [showBibleLink, setShowBibleLink] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  // Publish confirm
  const [publishOpen, setPublishOpen] = useState(false);

  // Inline editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // New link/video/audio item form
  const [newKind, setNewKind] = useState<"link" | "video" | "audio">("link");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [adding, setAdding] = useState(false);

  // Avatar
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("default");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Item thumbnail upload
  const [thumbBusyId, setThumbBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [h, b, its, prof] = await Promise.all([
        getOwnHandle(user.id),
        getOwnBoard(user.id),
        listOwnBoardItems(user.id),
        supabase.from("profiles").select("avatar_mode, avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setHandle(h);
      setBoard(b);
      setItems(its);
      setBio(b?.bio ?? "");
      setScripture(b?.featured_scripture_ref ?? "");
      setShowBibleLink(b?.show_bible_link ?? false);
      setAvatarMode((prof.data?.avatar_mode as AvatarMode | undefined) ?? "default");
      setAvatarUrl(prof.data?.avatar_url ?? null);
      if (!h) setDraftHandle(suggestHandle(profile.displayName, user.email));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user?.id, user?.email, profile.displayName]);

  useEffect(() => {
    if (!draftHandle || (handle && !editingHandle)) return;
    if (!isValidHandleFormat(draftHandle)) {
      setCheckState("format");
      return;
    }
    if (draftHandle === handle) {
      setCheckState("ok");
      return;
    }
    setCheckState("checking");
    const t = setTimeout(async () => {
      const r = await isHandleAvailable(draftHandle, user?.id);
      setCheckState(r.available ? "ok" : (r.reason ?? "taken"));
    }, 350);
    return () => clearTimeout(t);
  }, [draftHandle, handle, editingHandle, user?.id]);

  const publicUrl = useMemo(
    () =>
      handle
        ? `${typeof window !== "undefined" ? window.location.origin : "https://sanctumiq.app"}/@${handle}`
        : null,
    [handle],
  );

  // NOTE: must be declared before any early return to keep hook order stable.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (authLoading || (user && loading)) {
    return (
      <LoadingAppShell pageTitle="Your Board">
        <AccountSkeleton text="Opening your board…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Board"
        title="Sign in to claim your board"
        description="Boards are public sanctuaries you opt into."
        redirectTo="/account/board"
      />
    );
  }

  const handleClaim = async () => {
    const next = draftHandle.trim().toLowerCase();
    if (!isValidHandleFormat(next)) {
      toast.error("Handle must be 3–30 chars, start with a letter, lowercase/numbers/underscore.");
      return;
    }
    if (next === handle) {
      setEditingHandle(false);
      return;
    }
    setClaiming(true);
    try {
      const r = await isHandleAvailable(next, user.id);
      if (!r.available) {
        toast.error(
          r.reason === "reserved"
            ? "That handle is reserved."
            : r.reason === "format"
              ? "Invalid format."
              : "That handle is taken.",
        );
        setClaiming(false);
        return;
      }
      await claimHandle(user.id, next);
      if (!board) {
        const b = await upsertOwnBoard(user.id, {});
        setBoard(b);
      }
      setHandle(next);
      setEditingHandle(false);
      toast.success(`@${next} is yours.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not claim handle.");
    } finally {
      setClaiming(false);
    }
  };

  const handleSaveBoard = async () => {
    setSavingBoard(true);
    try {
      const b = await upsertOwnBoard(user.id, {
        bio: bio.trim() || null,
        featured_scripture_ref: scripture.trim() || null,
        show_bible_link: showBibleLink,
      });
      setBoard(b);
      toast.success("Board saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingBoard(false);
    }
  };

  const handleThemeChange = async (next: BoardThemeId) => {
    if ((board?.theme ?? DEFAULT_THEME) === next) return;
    if (!canUseTheme(entitlement, next)) {
      toast.error(PAID_GATE_COPY.themeLock);
      return;
    }
    setSavingTheme(true);
    const previous = board;
    setBoard((b) => (b ? { ...b, theme: next } : b));
    try {
      const b = await upsertOwnBoard(user.id, { theme: next });
      setBoard(b);
      toast.success("Theme updated.");
    } catch (err) {
      setBoard(previous);
      toast.error(err instanceof Error ? err.message : "Could not update theme.");
    } finally {
      setSavingTheme(false);
    }
  };

  const setPublished = async (next: boolean) => {
    try {
      const b = await upsertOwnBoard(user.id, { published: next });
      setBoard(b);
      toast.success(next ? "Board is now public." : "Board is now private.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not toggle.");
    }
  };

  const handlePublishToggle = (next: boolean) => {
    if (next) setPublishOpen(true);
    else setPublished(false);
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const handleAddItem = async () => {
    if (!canUseKind(entitlement, newKind)) {
      toast.error(PAID_GATE_COPY.kindLock(newKind));
      return;
    }
    if (!canAddAnotherItem(entitlement, items.length)) {
      toast.error(PAID_GATE_COPY.itemLimit(entitlement.itemLimit ?? 0));
      return;
    }
    const url = newUrl.trim();
    if (!url) {
      toast.error("Add a URL.");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("Enter a valid URL (include https://).");
      return;
    }
    setAdding(true);
    try {
      const maxPos = items.reduce((m, it) => Math.max(m, it.position ?? 0), -1);
      const video = newKind === "video" ? parseVideoUrl(url) : null;
      const item = await addBoardItem({
        user_id: user.id,
        kind: newKind,
        ref_id: null,
        title: newTitle.trim() || null,
        caption: newCaption.trim() || null,
        thumbnail_url: null,
        external_url: url,
        video_provider: video?.provider ?? null,
        video_id: video?.id ?? null,
        position: maxPos + 1,
      });
      setItems((prev) => [...prev, item]);
      setNewTitle("");
      setNewUrl("");
      setNewCaption("");
      toast.success("Added to board.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Best-effort cleanup of any uploaded thumbnail
      await deleteItemThumbnail(user.id, id).catch(() => {});
      await deleteBoardItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    }
  };

  /* ─── Avatar handlers ─── */
  const handleAvatarMode = async (mode: AvatarMode) => {
    setAvatarBusy(true);
    try {
      // "upload" / "default" both keep the existing avatar_url (default falls back to Google photo).
      // Only "none" clears it (initials-only).
      const patch: { avatar_mode: AvatarMode; avatar_url?: string | null } =
        mode === "none" ? { avatar_mode: mode, avatar_url: null } : { avatar_mode: mode };
      await updateOwnProfileMedia(user.id, patch);
      setAvatarMode(mode);
      if (mode === "none") setAvatarUrl(null);
      primeProfileCache(user.id, { avatarUrl: mode === "none" ? null : avatarUrl });
      toast.success("Avatar updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    setCropFile(file);
    if (avatarFileRef.current) avatarFileRef.current.value = "";
  };

  const handleCropConfirm = async (cropped: File) => {
    setAvatarBusy(true);
    try {
      const url = await uploadAvatarImage(user.id, cropped);
      await updateOwnProfileMedia(user.id, { avatar_url: url, avatar_mode: "upload" });
      setAvatarUrl(url);
      setAvatarMode("upload");
      primeProfileCache(user.id, { avatarUrl: url });
      toast.success("Avatar uploaded.");
      setCropFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarBusy(false);
    }
  };

  /* ─── Item thumbnail handlers ─── */
  const handleThumbFile = async (item: BoardItem, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    setThumbBusyId(item.id);
    try {
      const url = await uploadItemThumbnail(user.id, item.id, file);
      await updateBoardItem(item.id, { thumbnail_url: url });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, thumbnail_url: url } : i)));
      toast.success("Image added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setThumbBusyId(null);
    }
  };

  const handleRemoveThumb = async (item: BoardItem) => {
    setThumbBusyId(item.id);
    try {
      await deleteItemThumbnail(user.id, item.id).catch(() => {});
      await updateBoardItem(item.id, { thumbnail_url: null });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, thumbnail_url: null } : i)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setThumbBusyId(null);
    }
  };

  const startEdit = (it: BoardItem) => {
    setEditingId(it.id);
    setEditTitle(it.title ?? "");
    setEditUrl(it.external_url ?? "");
    setEditCaption(it.caption ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (editUrl.trim()) {
      try {
        new URL(editUrl.trim());
      } catch {
        toast.error("Enter a valid URL.");
        return;
      }
    }
    setSavingItem(true);
    try {
      const url = editUrl.trim() || null;
      const original = items.find((i) => i.id === id);
      const video = original?.kind === "video" ? parseVideoUrl(url) : null;
      const patch = {
        title: editTitle.trim() || null,
        external_url: url,
        caption: editCaption.trim() || null,
        video_provider: video?.provider ?? null,
        video_id: video?.id ?? null,
      };
      await updateBoardItem(id, patch);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      setEditingId(null);
      toast.success("Updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingItem(false);
    }
  };

  const moveItem = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    const reordered = [...items];
    reordered[idx] = b;
    reordered[swapIdx] = a;
    // Reassign sequential positions to be safe
    const withPos = reordered.map((it, i) => ({ ...it, position: i }));
    setItems(withPos);
    try {
      await Promise.all([
        updateBoardItem(a.id, { position: withPos.find((i) => i.id === a.id)!.position }),
        updateBoardItem(b.id, { position: withPos.find((i) => i.id === b.id)!.position }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    }
  };

  const handleAudioReflectionToggle = async (item: BoardItem, next: boolean) => {
    try {
      await updateBoardItem(item.id, { audio_reflection: next });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, audio_reflection: next } : i)),
      );
      toast.success(next ? "Showing as voice reflection." : "Showing as video.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update.");
    }
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((it, i) => ({ ...it, position: i }));
    const previous = items;
    setItems(reordered);
    try {
      await Promise.all(
        reordered.map((it, i) => {
          const prev = previous.find((p) => p.id === it.id)?.position;
          return prev !== i ? updateBoardItem(it.id, { position: i }) : null;
        }),
      );
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    }
  };

  return (
    <AppShell pageTitle="Your Board">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Account
        </Link>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Board</p>
          <h1 className="font-display text-3xl text-foreground">Your public sanctuary</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Opt-in. Private by default. You choose what shows.
          </p>
        </div>

        {!handle ? (
          <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-4">
            <h2 className="font-display text-lg text-foreground">Claim your handle</h2>
            <p className="text-sm text-muted-foreground/80">
              Your board lives at <span className="text-gold-soft">sanctumiq.app/@yourhandle</span>.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-gold font-display text-lg">@</span>
              <input
                type="text"
                value={draftHandle}
                onChange={(e) =>
                  setDraftHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                maxLength={30}
                className="flex-1 rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                placeholder="yourhandle"
                aria-label="yourhandle"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/70 min-h-[1em]">
              {checkState === "checking" && "Checking…"}
              {checkState === "ok" && <span className="text-emerald-400">✓ Available</span>}
              {checkState === "format" &&
                "3–30 chars, lowercase letters/numbers/underscore, starts with a letter."}
              {checkState === "reserved" && (
                <span className="text-amber-400">Reserved by SanctumIQ.</span>
              )}
              {checkState === "taken" && <span className="text-amber-400">Already taken.</span>}
            </p>
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming || checkState !== "ok"}
              className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim handle"}
            </button>
          </section>
        ) : (
          <>
            {/* URL + publish toggle + preview/copy actions */}
            <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                    Your board
                  </p>
                  {editingHandle ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gold font-display text-lg">@</span>
                        <input
                          type="text"
                          value={draftHandle}
                          onChange={(e) =>
                            setDraftHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                          }
                          maxLength={30}
                          autoFocus
                          className="flex-1 rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                          placeholder="yourhandle"
                          aria-label="New handle"
                          onKeyDown={(e) =>
                            e.key === "Enter" && checkState === "ok" && handleClaim()
                          }
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 min-h-[1em]">
                        {checkState === "checking" && "Checking…"}
                        {checkState === "ok" && draftHandle !== handle && (
                          <span className="text-emerald-400">✓ Available</span>
                        )}
                        {checkState === "ok" && draftHandle === handle && (
                          <span className="text-muted-foreground/60">Current handle</span>
                        )}
                        {checkState === "format" &&
                          "3–30 chars, lowercase letters/numbers/underscore, starts with a letter."}
                        {checkState === "reserved" && (
                          <span className="text-amber-400">Reserved by SanctumIQ.</span>
                        )}
                        {checkState === "taken" && (
                          <span className="text-amber-400">Already taken.</span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleClaim}
                          disabled={claiming || checkState !== "ok" || draftHandle === handle}
                          className="inline-flex items-center justify-center rounded-md bg-gold px-4 py-2 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
                        >
                          {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHandle(false);
                            setDraftHandle("");
                            setCheckState("idle");
                          }}
                          className="rounded-md hairline px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a
                        href={`/@${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-foreground hover:text-gold-soft truncate"
                      >
                        <span className="font-display truncate">@{handle}</span>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftHandle(handle!);
                          setEditingHandle(true);
                          setCheckState("idle");
                        }}
                        className="ml-1 rounded-md p-1.5 text-muted-foreground/50 hover:text-gold-soft hover:bg-gold/10 transition-colors"
                        aria-label="Edit handle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {!editingHandle && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {board?.published ? "Public" : "Private"}
                    </span>
                    <Switch checked={!!board?.published} onCheckedChange={handlePublishToggle} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/@${handle}`}
                  className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground hover:bg-gold/10 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {board?.published ? "View" : "Preview"}
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground hover:bg-gold/10 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </button>
                <Link
                  to="/account/board/share"
                  className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
                >
                  Share Your Anchor
                </Link>
                {!board?.published && (
                  <span className="text-[11px] text-muted-foreground/70">
                    Only you can see your board until you publish.
                  </span>
                )}
              </div>
            </section>

            {/* Profile image */}
            <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-4">
              <h2 className="font-display text-lg text-foreground">Profile image</h2>
              <p className="text-[11px] text-muted-foreground/70">
                How you appear at the top of <span className="text-gold-soft">@{handle}</span>.
              </p>
              <div className="flex items-center gap-5">
                {avatarMode === "none" ? (
                  <div className="h-20 w-20 rounded-full hairline bg-obsidian/40 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                ) : (
                  <Avatar className="h-20 w-20 border-2 border-gold/30">
                    {avatarMode === "upload" && avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-gold/10 font-display text-2xl tracking-[0.2em] text-gold-soft">
                      {(profile.displayName || handle || "S")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() ?? "")
                        .join("") || "S"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 space-y-2">
                  {(["upload", "default", "none"] as const).map((m) => (
                    <label key={m} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="avatar-mode"
                        checked={avatarMode === m}
                        disabled={avatarBusy}
                        onChange={() => handleAvatarMode(m)}
                        className="mt-0.5 accent-gold"
                      />
                      <span className="text-sm text-foreground">
                        {m === "upload" && "Upload an image"}
                        {m === "default" && "Default avatar"}
                        {m === "none" && "No image"}
                        <span className="block text-[11px] text-muted-foreground/70">
                          {m === "upload" && "Your photo, shown to anyone who visits."}
                          {m === "default" && "Your initials on a quiet gold backdrop."}
                          {m === "none" && "Hide the avatar entirely on your public page."}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {avatarMode === "upload" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={avatarBusy}
                    className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    {avatarBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {avatarUrl ? "Replace image" : "Upload image"}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => handleAvatarMode("default")}
                      disabled={avatarBusy}
                      className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Bio + featured scripture */}
            <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-8">
              <h2 className="font-display text-lg text-foreground">Identity</h2>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Display name
                </label>
                <DisplayNameEditor userId={user.id} currentName={profile.displayName ?? ""} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Bio{" "}
                  <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
                    {bio.length}/280
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 280))}
                  rows={3}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
                  placeholder="A line about your sanctuary."
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Anchor scripture
                  <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
                    {scripture.length}/280
                  </span>
                </label>
                <textarea
                  value={scripture}
                  onChange={(e) => setScripture(e.target.value.slice(0, 280))}
                  rows={2}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
                  placeholder="Psalm 23:1 — The Lord is my shepherd; I shall not want."
                  aria-label="Anchor scripture"
                />
                <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                  A reference (e.g. <span className="text-foreground/80">Psalm 23:1</span>) or the
                  full verse text.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 pt-2 border-t border-gold/10">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">Show SanctumIQ Bible link in footer</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Adds a small gold Bible mark next to the footer that links visitors back to the
                    SanctumIQ Bible.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBibleLink}
                  aria-label="Show SanctumIQ Bible link in footer"
                  onClick={() => setShowBibleLink((v) => !v)}
                  className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${
                    showBibleLink ? "bg-gold" : "bg-obsidian/60 hairline"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-obsidian transition-transform ${
                      showBibleLink ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveBoard}
                disabled={savingBoard}
                className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
              >
                {savingBoard ? "Saving…" : "Save"}
              </button>
            </section>

            {/* Theme picker */}
            <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-4">
              <h2 className="font-display text-lg text-foreground">Theme</h2>
              <p className="text-[11px] text-muted-foreground/70">
                The palette your visitors and your share card will see.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.values(BOARD_THEMES) as BoardThemeTokens[]).map((t) => {
                  const active = (board?.theme ?? DEFAULT_THEME) === t.id;
                  const locked = !canUseTheme(entitlement, t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemeChange(t.id)}
                      disabled={savingTheme}
                      aria-pressed={active}
                      aria-disabled={locked}
                      title={locked ? PAID_GATE_COPY.themeLock : t.label}
                      className="relative rounded-lg p-3 text-left transition-all disabled:opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${t.bg}, ${t.surface})`,
                        border: active ? `1.5px solid ${t.accent}` : `1px solid ${t.hairline}`,
                        boxShadow: active ? `0 0 0 3px ${t.accent}25` : "none",
                        opacity: locked ? 0.55 : undefined,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: t.accentSoft }}
                        />
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: t.text, opacity: 0.5 }}
                        />
                      </div>
                      <p className="font-display text-sm" style={{ color: t.text }}>
                        {t.label}
                      </p>
                      <p className="text-[10px] mt-0.5 leading-snug" style={{ color: t.textMuted }}>
                        {t.description}
                      </p>
                      {active && !locked && (
                        <span
                          className="absolute top-2 right-2 inline-flex h-4 w-4 items-center justify-center rounded-full"
                          style={{ background: t.accent, color: t.bg }}
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                      {locked && (
                        <span
                          className="absolute top-2 right-2 inline-flex h-4 w-4 items-center justify-center rounded-full"
                          style={{
                            background: t.surface,
                            border: `1px solid ${t.accent}55`,
                            color: t.accent,
                          }}
                        >
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!entitlement.isPaid && (
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                  <Link
                    to="/pricing"
                    className="text-gold-soft hover:text-gold underline decoration-gold/40 underline-offset-4"
                  >
                    Upgrade to Scribe
                  </Link>{" "}
                  to unlock the full theme palette.
                </p>
              )}
            </section>

            <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-5">
              <h2 className="font-display text-lg text-foreground">Items</h2>

              {items.length === 0 ? (
                <div className="hairline rounded-lg bg-obsidian/40 px-5 py-6 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">
                      Your Sanctuary is empty
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      Curate the scriptures, poetry, and media that anchor your soul. Three ways to
                      add your first piece:
                    </p>
                  </div>
                  <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
                    <li className="flex gap-3">
                      <span className="text-gold/70 shrink-0">✦</span>
                      <span>
                        <span className="text-foreground/90">Poem</span> — open a piece in your{" "}
                        <Link
                          to="/notes"
                          className="text-gold hover:text-gold-soft underline-offset-4 hover:underline"
                        >
                          Poetry Library
                        </Link>{" "}
                        and tap “Add to Board.”
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-gold/70 shrink-0">✦</span>
                      <span>
                        <span className="text-foreground/90">Video or Audio</span> — paste a
                        YouTube, Vimeo, or audio link in the field below. We’ll pull the thumbnail
                        automatically.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-gold/70 shrink-0">✦</span>
                      <span>
                        <span className="text-foreground/90">Scripture</span> — add an anchor verse
                        above to greet visitors before they scroll.
                      </span>
                    </li>
                  </ul>
                  <div className="mt-6 hairline rounded-lg bg-obsidian-elevated/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gold/80 mb-2">
                      Sharing a personal video?
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Upload it to YouTube as <span className="text-foreground/90">“Unlisted”</span>{" "}
                      and paste the link here. It stays off public search, but plays on your board
                      with professional speed.
                    </p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {items.map((item, idx) => {
                        const isEditing = editingId === item.id;
                        return (
                          <SortableBoardRow key={item.id} id={item.id} disabled={isEditing}>
                            {(dragHandleProps) => (
                              <>
                                {isEditing ? (
                                  <div
                                    className="space-y-2"
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEdit();
                                      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        saveEdit(item.id);
                                      }
                                    }}
                                  >
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
                                      {item.kind}{" "}
                                      <span className="ml-2 normal-case tracking-normal text-muted-foreground/50">
                                        ⌘↵ save · Esc cancel
                                      </span>
                                    </p>
                                    <input
                                      ref={(el) => {
                                        if (
                                          el &&
                                          editingId === item.id &&
                                          document.activeElement !== el &&
                                          !el.dataset.autofocused
                                        ) {
                                          el.dataset.autofocused = "1";
                                          el.focus();
                                          el.select();
                                        }
                                      }}
                                      type="text"
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      maxLength={120}
                                      placeholder="Title (optional)"
                                      className="w-full rounded-md hairline bg-obsidian/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                                      aria-label="Title (optional)"
                                    />
                                    {item.kind !== "poem" && item.kind !== "scripture" && (
                                      <input
                                        type="url"
                                        value={editUrl}
                                        onChange={(e) => setEditUrl(e.target.value)}
                                        placeholder="https://…"
                                        className="w-full rounded-md hairline bg-obsidian/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                                        aria-label="https://…"
                                      />
                                    )}
                                    <textarea
                                      value={editCaption}
                                      onChange={(e) => setEditCaption(e.target.value.slice(0, 280))}
                                      rows={2}
                                      placeholder="Caption (optional)"
                                      className="w-full rounded-md hairline bg-obsidian/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => saveEdit(item.id)}
                                        disabled={savingItem}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
                                      >
                                        {savingItem ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        )}
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="inline-flex items-center gap-1.5 rounded-md hairline bg-obsidian/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-4">
                                      <button
                                        type="button"
                                        {...dragHandleProps}
                                        className="mt-1 flex-shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground/40 hover:text-gold-soft active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-gold/40"
                                        aria-label="Drag to reorder"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </button>
                                      <ItemThumbCell
                                        item={item}
                                        busy={thumbBusyId === item.id}
                                        onPick={(file) => handleThumbFile(item, file)}
                                        onRemove={() => handleRemoveThumb(item)}
                                      />
                                      <div className="min-w-0 flex-1 pr-1">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
                                          {item.kind}
                                          {item.video_provider && (
                                            <span className="ml-2 text-gold/70 normal-case tracking-normal">
                                              · {item.video_provider} poster
                                            </span>
                                          )}
                                        </p>
                                        {item.title && (
                                          <p className="text-sm text-foreground mt-1 break-words">
                                            {item.title}
                                          </p>
                                        )}
                                        {item.external_url && (
                                          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                                            {item.external_url}
                                          </p>
                                        )}
                                        {item.caption && (
                                          <p className="text-[11px] text-muted-foreground/70 mt-1.5 line-clamp-2 whitespace-pre-wrap">
                                            {item.caption}
                                          </p>
                                        )}
                                        {item.kind === "video" && (
                                          <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/80 cursor-pointer">
                                            <Switch
                                              checked={item.audio_reflection}
                                              onCheckedChange={(v) =>
                                                handleAudioReflectionToggle(item, v)
                                              }
                                              aria-label="Show as voice reflection with gold headphones cover"
                                            />
                                            <span>
                                              Turn on Voice
                                              <span className="ml-1 text-muted-foreground/50">
                                                for sermons or spoken messages
                                              </span>
                                            </span>
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 pt-1 border-t border-white/5">
                                      <button
                                        type="button"
                                        onClick={() => moveItem(item.id, -1)}
                                        disabled={idx === 0}
                                        className="p-1.5 text-muted-foreground/60 hover:text-gold-soft transition-colors disabled:opacity-30"
                                        aria-label="Move up"
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveItem(item.id, 1)}
                                        disabled={idx === items.length - 1}
                                        className="p-1.5 text-muted-foreground/60 hover:text-gold-soft transition-colors disabled:opacity-30"
                                        aria-label="Move down"
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </button>
                                      <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
                                      <button
                                        type="button"
                                        onClick={() => startEdit(item)}
                                        className="p-1.5 text-muted-foreground/60 hover:text-gold-soft transition-colors"
                                        aria-label="Edit"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(item.id)}
                                        className="p-1.5 text-muted-foreground/60 hover:text-rose-400 transition-colors"
                                        aria-label="Remove from board"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </SortableBoardRow>
                        );
                      })}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}

              <div className="hairline rounded-md bg-obsidian/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                    Add a link
                  </p>
                  {entitlement.itemLimit !== null && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      <span
                        className={
                          items.length >= entitlement.itemLimit ? "text-rose-300" : "text-gold-soft"
                        }
                      >
                        {items.length}
                      </span>
                      <span className="mx-1 text-muted-foreground/50">/</span>
                      {entitlement.itemLimit}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {(["link", "video", "audio"] as const).map((k) => {
                    const locked = !canUseKind(entitlement, k);
                    const selected = newKind === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            toast.error(PAID_GATE_COPY.kindLock(k));
                            return;
                          }
                          setNewKind(k);
                        }}
                        aria-disabled={locked}
                        title={locked ? PAID_GATE_COPY.kindLock(k) : k}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] uppercase tracking-[0.2em] transition-colors ${
                          selected && !locked
                            ? "bg-gold text-obsidian"
                            : locked
                              ? "hairline bg-obsidian/40 text-muted-foreground/50"
                              : "hairline bg-obsidian/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {k}
                        {locked && <Lock className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  {newKind === "link" && "Share an article, website, or external resource."}
                  {newKind === "video" &&
                    "Watch on YouTube or Vimeo. Use for visual content. Turn on \u201CVoice\u201D below for sermons or spoken messages."}
                  {newKind === "audio" &&
                    "Upload or link an audio file (.mp3, .wav, .m4a). Music or recordings."}
                </p>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                  placeholder="Title (optional)"
                  aria-label="Title (optional)"
                />
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                  placeholder="https://…"
                  aria-label="https://…"
                />
                {newKind === "video" && /(?:youtube\.com|youtu\.be)/i.test(newUrl) && (
                  <div className="rounded-md hairline bg-obsidian/40 px-3 py-2 flex gap-2 items-start">
                    <span className="text-gold text-xs leading-none mt-0.5">✦</span>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <span className="text-gold-soft">For private sharing,</span> set this video to{" "}
                      <span className="text-foreground/90">Unlisted</span> in YouTube Studio.
                      Private videos won't play here, and Public ones can be discovered in search.
                    </p>
                  </div>
                )}
                <textarea
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value.slice(0, 280))}
                  rows={2}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
                  placeholder="Caption (optional)"
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={adding || !canAddAnotherItem(entitlement, items.length)}
                    className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-4 py-2 text-sm text-foreground hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Add
                  </button>
                  {!entitlement.isPaid && !canAddAnotherItem(entitlement, items.length) && (
                    <Link
                      to="/pricing"
                      className="text-[11px] uppercase tracking-[0.2em] text-gold hover:text-gold-soft"
                    >
                      Upgrade for unlimited →
                    </Link>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent className="bg-obsidian-elevated border-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Publish your board?</AlertDialogTitle>
            <AlertDialogDescription>
              Your board will be visible to anyone at{" "}
              <span className="text-gold-soft">{publicUrl}</span>. You can switch back to private at
              any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPublishOpen(false);
                setPublished(true);
              }}
              className="bg-gold text-obsidian hover:bg-gold-soft"
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AvatarCropDialog
        file={cropFile}
        open={cropFile !== null}
        busy={avatarBusy}
        onCancel={() => setCropFile(null)}
        onConfirm={handleCropConfirm}
      />
    </AppShell>
  );
}

function ItemThumbCell({
  item,
  busy,
  onPick,
  onRemove,
}: {
  item: BoardItem;
  busy: boolean;
  onPick: (file: File | null) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Auto-detect YouTube/Vimeo URLs even when the item wasn't saved with video metadata.
  const parsed =
    !item.video_provider && item.external_url ? parseVideoUrl(item.external_url) : null;
  const effective = parsed
    ? { ...item, video_provider: parsed.provider, video_id: parsed.id }
    : item;
  const thumb = resolveItemThumbnail(effective);
  const isAuto = !item.thumbnail_url && !!thumb;

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="relative h-20 w-20 rounded-md hairline bg-obsidian/40 overflow-hidden flex items-center justify-center hover:bg-gold/10 transition-colors disabled:opacity-50"
        aria-label={item.thumbnail_url ? "Replace image" : "Upload image"}
      >
        {thumb ? (
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-obsidian/70">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      {item.thumbnail_url ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-rose-400 transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      ) : isAuto ? (
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">Auto</span>
      ) : null}
    </div>
  );
}

type DragHandleProps = {
  ref: (el: HTMLElement | null) => void;
  [key: string]: unknown;
};

function SortableBoardRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (dragHandleProps: DragHandleProps) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  const dragHandleProps: DragHandleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
  };

  return (
    <li ref={setNodeRef} style={style} className="hairline rounded-md bg-obsidian/40 px-5 py-5">
      {children(dragHandleProps)}
    </li>
  );
}
