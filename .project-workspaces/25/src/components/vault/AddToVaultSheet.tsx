import { useEffect, useState } from "react";
import { Plus, Star, Loader2, X, BookmarkPlus, Pencil, Check } from "lucide-react";
// Note: SheetContent ships its own close button; we no longer render a custom X in the header.
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  listCollections,
  createCollection,
  updateCollection,
  addVerseToCollection,
  getActiveCollectionId,
  DuplicateNameError,
  type VaultCollection,
} from "@/lib/vault";
import { CollectionAccentBar } from "@/components/vault/CollectionColor";
import { cn } from "@/lib/utils";

export function AddToVaultSheet({
  open,
  onOpenChange,
  verse,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verse: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end?: number;
    version?: string;
    quote_text?: string;
    reference: string;
  } | null;
  onAdded?: () => void;
}) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<VaultCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const startEdit = (c: VaultCollection) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !user) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    const id = editingId;
    const original = collections.find((c) => c.id === id);
    if (!original || original.title === trimmed) {
      cancelEdit();
      return;
    }
    const localDup = collections.some(
      (c) => c.id !== id && c.title.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (localDup) {
      setEditError("A collection with that name already exists.");
      return;
    }
    // Optimistic update
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
    setEditingId(null);
    setEditError(null);
    try {
      await updateCollection(id, { title: trimmed }, { userId: user.id });
      toast("Renamed.");
    } catch (err) {
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: original.title } : c)),
      );
      if (err instanceof DuplicateNameError) {
        setEditingId(id);
        setEditTitle(trimmed);
        setEditError("A collection with that name already exists.");
      } else {
        toast.error("Could not rename.");
      }
    }
  };

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setLoading(true);
    setActiveId(getActiveCollectionId());
    listCollections(user.id)
      .then((data) => {
        if (active) setCollections(data);
      })
      .catch(() => {
        if (active) toast.error("Could not load collections.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, user]);

  const handleAdd = async (collectionId: string) => {
    if (!user || !verse) return;
    setSavingId(collectionId);
    try {
      await addVerseToCollection(user.id, collectionId, {
        book: verse.book,
        chapter: verse.chapter,
        verse_start: verse.verse_start,
        verse_end: verse.verse_end,
        version: verse.version,
        quote_text: verse.quote_text,
      });
      // Note: we intentionally do NOT auto-promote this collection to the
      // Active Study. Auto-promotion turned long-press into a silent
      // quick-save and hid the picker without the user ever opting in.
      // Active Study is now set explicitly via the reader's collection chip.
      const collection = collections.find((c) => c.id === collectionId);
      toast(`Added to ${collection?.title ?? "collection"}`);
      onAdded?.();
      onOpenChange(false);
    } catch {
      toast.error("Could not add to Vault.");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    const title = newTitle.trim() || "Untitled Study";
    const localDup = collections.some((c) => c.title.trim().toLowerCase() === title.toLowerCase());
    if (localDup) {
      setCreateError("A collection with that name already exists.");
      return;
    }
    try {
      const created = await createCollection(user.id, title);
      setNewTitle("");
      setCreating(false);
      setCreateError(null);
      await handleAdd(created.id);
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        setCreateError("A collection with that name already exists.");
      } else {
        toast.error("Could not create collection.");
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-t border-gold/18 bg-[rgba(20,20,20,0.92)] backdrop-blur-2xl backdrop-saturate-150 p-0 max-h-[80svh] flex flex-col rounded-t-2xl"
      >
        {/* Drag handle */}
        <div
          className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-gold/30"
          aria-hidden
        />

        <SheetHeader className="px-5 py-3 pr-12 border-b border-gold/12">
          <div className="min-w-0 text-left">
            <SheetTitle className="font-display text-base text-gold-soft truncate">
              Add to Vault
            </SheetTitle>
            {verse && (
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground truncate">
                {verse.reference}
              </p>
            )}
          </div>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {collections.map((c) => {
                const isActive = c.id === activeId;
                const isSaving = savingId === c.id;
                const isEditing = editingId === c.id;

                if (isEditing) {
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "hairline rounded-xl bg-obsidian-elevated/40 p-2 space-y-1.5",
                        editError && "border-destructive/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => {
                            setEditTitle(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          aria-invalid={editError ? true : undefined}
                          aria-describedby={editError ? `rename-err-${c.id}` : undefined}
                          className="bg-background/30 h-9"
                        />
                        <button
                          onClick={cancelEdit}
                          aria-label="Cancel rename"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void saveEdit()}
                          aria-label="Save rename"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-soft hover:bg-gold/25"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                      {editError && (
                        <p
                          id={`rename-err-${c.id}`}
                          role="alert"
                          className="px-1 text-[11px] text-destructive"
                        >
                          {editError}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-stretch gap-1 rounded-xl pr-1 pl-2 py-1 transition-colors hairline",
                      isActive
                        ? "bg-gold/8 border-gold/30"
                        : "bg-obsidian-elevated/30 hover:bg-gold/5",
                      isSaving && "opacity-60",
                    )}
                  >
                    <CollectionAccentBar color={c.color} className="my-1" />
                    <button
                      onClick={() => handleAdd(c.id)}
                      disabled={isSaving || savingId !== null}
                      className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-base text-gold-soft truncate">{c.title}</p>
                        {c.master_thought && (
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-1 italic">
                            "{c.master_thought}"
                          </p>
                        )}
                      </div>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gold/70" />
                      ) : isActive ? (
                        <Star className="h-3.5 w-3.5 text-gold/70 fill-gold/70" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(c)}
                      aria-label={`Rename ${c.title}`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-md text-muted-foreground/50 hover:bg-white/5 hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* New Collection */}
              {creating ? (
                <div
                  className={cn(
                    "hairline rounded-xl bg-obsidian-elevated/40 p-3 space-y-2",
                    createError && "border-destructive/50",
                  )}
                >
                  <Input
                    autoFocus
                    value={newTitle}
                    placeholder="Collection title"
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      if (createError) setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreate();
                    }}
                    aria-invalid={createError ? true : undefined}
                    aria-describedby={createError ? "create-err" : undefined}
                    className="bg-background/30"
                  />
                  {createError && (
                    <p id="create-err" role="alert" className="text-[11px] text-destructive">
                      {createError}
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCreating(false);
                        setNewTitle("");
                        setCreateError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => void handleCreate()}>
                      Create & Add
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setCreating(true);
                    setCreateError(null);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left hairline border-dashed bg-transparent hover:bg-gold/5 transition-colors"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-gold-soft">New Collection</span>
                </button>
              )}

              {collections.length === 0 && !creating && (
                <p className="text-center text-xs text-muted-foreground/60 pt-4">
                  No collections yet. Create your first one above.
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
