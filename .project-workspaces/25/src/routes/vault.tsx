import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  BookOpen,
  Loader2,
  Trash2,
  Star,
  ArrowLeft,
  Sparkles,
  GripVertical,
  Archive,
  ArchiveRestore,
  Share2,
  Copy,
  Download,
  Search,
  X,
  Play,
  ArrowUpDown,
  Bookmark,
  Check,
  Link2,
} from "lucide-react";
import { loadBible } from "@/lib/scripture";
import { startStudyCircuit, type CircuitStop } from "@/lib/studyCircuit";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { VaultSkeleton } from "@/components/ui/page-skeletons";
import { SearchHintsPopover } from "@/components/search/SearchHintsPopover";
import { SmartEmptyState, buildVaultSuggestions } from "@/components/search/SmartEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCollection } from "@/hooks/useActiveCollection";
import {
  listItems,
  listCollections,
  updateCollection,
  deleteCollection,
  deleteItem,
  reorderCollections,
  reorderItems,
  archiveCollection,
  DuplicateNameError,
  type VaultCollection,
  type VaultItem,
} from "@/lib/vault";
import { VaultItemSheet } from "@/components/vault/VaultItemSheet";
import {
  CollectionAccentBar,
  CollectionColorPicker,
  colorHex,
  type CollectionColor,
} from "@/components/vault/CollectionColor";
import { collectionToMarkdown, downloadTextFile, slugify } from "@/lib/vault-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  parseVaultQuery,
  matchesVaultQuery,
  sortVaultCollections,
  loadVaultSavedViews,
  saveVaultSavedViews,
  type VaultSortKey,
  type VaultSavedView,
} from "@/lib/vault-search";
import {
  decodeViewFromSearch,
  syncViewToUrl,
  buildShareUrl,
  copyShareLink,
} from "@/lib/share-view";
import { PoemLibraryPanel } from "@/components/vault/PoemLibraryPanel";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Study Vault — SanctumIQ" },
      {
        name: "description",
        content: "Gather verses, notes, and master thoughts across the Bible.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingAppShell pageTitle="Vault">
        <VaultSkeleton text="Opening your Vault…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Study Vault"
        title="Where master thoughts come together"
        description="Sign in to create collections that gather verses across the Bible."
        redirectTo="/vault"
        showReaderLink
      />
    );
  }

  return (
    <AppShell pageTitle="Vault">
      <VaultContent userId={user.id} />
    </AppShell>
  );
}

function VaultContent({ userId }: { userId: string }) {
  const { collections, active, activeId, loading, setActive, createAndActivate, refresh } =
    useActiveCollection(userId);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<VaultCollection[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<VaultSortKey>("manual");
  const [savedViews, setSavedViews] = useState<VaultSavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [namingView, setNamingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  useEffect(() => {
    setSavedViews(loadVaultSavedViews());
  }, []);

  // Hydrate filter state from URL on mount (shareable links).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = decodeViewFromSearch(window.location.search);
    if (v.q !== undefined) setQuery(v.q);
    if (v.s) {
      const allowed: VaultSortKey[] = ["manual", "recent", "oldest", "alpha"];
      if (allowed.includes(v.s as VaultSortKey)) setSortKey(v.s as VaultSortKey);
    }
    if (v.c) setColorFilter(v.c);
  }, []);

  // Keep URL in sync when on the collections list (not when a collection is open).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeId) return;
    syncViewToUrl("/vault", {
      q: query || undefined,
      s: sortKey !== "manual" ? sortKey : undefined,
      c: colorFilter,
    });
  }, [query, sortKey, colorFilter, activeId]);

  // Keep a local order that mirrors the fetched collections (for optimistic drag).
  useEffect(() => {
    setOrderedIds(collections.map((c) => c.id));
  }, [collections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled Study";
    const localDup = collections.some((c) => c.title.trim().toLowerCase() === title.toLowerCase());
    if (localDup) {
      setCreateError("A collection with that name already exists.");
      return;
    }
    try {
      await createAndActivate(title);
      setNewTitle("");
      setCreating(false);
      setCreateError(null);
      toast("Collection created — it's now your Active Study.");
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        setCreateError("A collection with that name already exists.");
      } else {
        toast.error("Could not create collection.");
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active: a, over } = event;
    if (!over || a.id === over.id) return;
    const oldIdx = orderedIds.indexOf(String(a.id));
    const newIdx = orderedIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(orderedIds, oldIdx, newIdx);
    setOrderedIds(next);
    try {
      await reorderCollections(next);
      await refresh();
    } catch {
      toast.error("Could not save new order.");
      setOrderedIds(collections.map((c) => c.id));
    }
  };

  const loadArchived = async () => {
    setArchivedLoading(true);
    try {
      setArchived(await listCollections(userId, { archived: true }));
    } finally {
      setArchivedLoading(false);
    }
  };

  const toggleArchived = async () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next) await loadArchived();
  };

  const handleArchive = async (id: string, title: string) => {
    try {
      await archiveCollection(id, true);
      toast("Archived.", {
        action: {
          label: "Undo",
          onClick: async () => {
            await archiveCollection(id, false);
            await refresh();
          },
        },
        description: title,
      });
      if (activeId === id) setActive(null);
      await refresh();
    } catch {
      toast.error("Could not archive.");
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await archiveCollection(id, false);
      await Promise.all([refresh(), loadArchived()]);
      toast("Restored to your collections.");
    } catch {
      toast.error("Could not restore.");
    }
  };

  // Reorder collections according to local optimistic order (computed before early return so hooks stay stable)
  const orderedCollections = orderedIds
    .map((id) => collections.find((c) => c.id === id))
    .filter((c): c is VaultCollection => Boolean(c));

  const parsed = useMemo(() => parseVaultQuery(query), [query]);
  const availableColors = useMemo(() => {
    const seen = new Set<string>();
    for (const c of orderedCollections) seen.add(c.color.toLowerCase());
    return Array.from(seen).sort();
  }, [orderedCollections]);

  const filteredCollections = useMemo(() => {
    let list = orderedCollections.filter((c) => matchesVaultQuery(c, parsed));
    if (colorFilter) list = list.filter((c) => c.color.toLowerCase() === colorFilter);
    return sortVaultCollections(list, sortKey, orderedIds);
  }, [orderedCollections, parsed, colorFilter, sortKey, orderedIds]);

  if (active) {
    return (
      <CollectionDetail
        collection={active}
        userId={userId}
        onBack={() => setActive(null)}
        onDeleted={async () => {
          setActive(null);
          await refresh();
        }}
        onUpdated={refresh}
      />
    );
  }

  const filteredIds = filteredCollections.map((c) => c.id);
  const isFiltering = query.trim().length > 0 || colorFilter !== null;
  const isSearching = isFiltering;
  const dragDisabled = isFiltering || sortKey !== "manual";

  const applyView = (v: VaultSavedView) => {
    setQuery(v.query);
    setColorFilter(v.colorFilter);
    setSortKey(v.sort);
    setActiveViewId(v.id);
  };

  const saveCurrentView = () => {
    const name = newViewName.trim();
    if (!name) return;
    const view: VaultSavedView = {
      id: crypto.randomUUID(),
      name,
      query,
      colorFilter,
      sort: sortKey,
    };
    const next = [...savedViews, view];
    setSavedViews(next);
    saveVaultSavedViews(next);
    setActiveViewId(view.id);
    setNewViewName("");
    setNamingView(false);
    toast(`Saved view "${name}".`);
  };

  const deleteView = (id: string) => {
    const next = savedViews.filter((v) => v.id !== id);
    setSavedViews(next);
    saveVaultSavedViews(next);
    if (activeViewId === id) setActiveViewId(null);
  };

  const shareCurrentView = async () => {
    const url = buildShareUrl("/vault", {
      q: query || undefined,
      s: sortKey !== "manual" ? sortKey : undefined,
      c: colorFilter,
    });
    const ok = await copyShareLink(url);
    if (ok) toast.success("Share link copied to clipboard");
    else toast.error("Couldn't copy — copy from the address bar");
  };

  const sortLabel: Record<VaultSortKey, string> = {
    manual: "Manual order",
    recent: "Recently updated",
    oldest: "Oldest first",
    alpha: "Alphabetical",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Study Vault</p>
        <h1 className="font-display text-3xl text-foreground">Your collections</h1>
        <p className="text-sm text-muted-foreground/70">
          Gather verses across the Bible into a single thought.
        </p>
      </div>

      {/* Writing Library — saved writings live alongside collections */}
      <PoemLibraryPanel userId={userId} />

      <div className="border-t border-gold/10" />

      {/* Create / new */}
      {creating ? (
        <div
          className={cn(
            "hairline rounded-xl bg-obsidian-elevated/30 p-4 space-y-3",
            createError && "border-destructive/50",
          )}
        >
          <Input
            autoFocus
            value={newTitle}
            placeholder="e.g. The Provision of God"
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (createError) setCreateError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            aria-invalid={createError ? true : undefined}
            aria-describedby={createError ? "vault-create-err" : undefined}
          />
          {createError && (
            <p id="vault-create-err" role="alert" className="text-[11px] text-destructive">
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
            <Button size="sm" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => {
            setCreating(true);
            setCreateError(null);
          }}
          variant="outline"
          className="w-full justify-center gap-2 border-gold/30 text-gold-soft hover:bg-gold/5"
        >
          <Plus className="h-4 w-4" /> New Collection
        </Button>
      )}

      {/* Search + filters */}
      {!loading && orderedCollections.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/45" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveViewId(null);
              }}
              placeholder='Search… try color:gold, has:thought, "exact phrase"'
              className="pl-9 pr-16 bg-obsidian-elevated/30"
              aria-label="Search collections"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setActiveViewId(null);
                  }}
                  aria-label="Clear search"
                  className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <SearchHintsPopover
                label="Vault search operators"
                hints={[
                  { token: "color:gold", description: "Filter collections by accent color." },
                  {
                    token: "archived:true",
                    description: "Show archived (or active) collections only.",
                  },
                  {
                    token: "has:thought",
                    description: "Require master thought or description present.",
                  },
                  {
                    token: '"exact phrase"',
                    description: "Match phrase in title, thought, or description.",
                  },
                ]}
                onInsert={(token) => {
                  setQuery((q) => (q ? `${q.trim()} ${token}` : token));
                  setActiveViewId(null);
                }}
              />
            </div>
          </div>

          {/* Color chips + controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            {availableColors.length > 1 && (
              <>
                <button
                  onClick={() => {
                    setColorFilter(null);
                    setActiveViewId(null);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors hairline",
                    colorFilter === null
                      ? "bg-gold/15 text-gold-soft border-gold/40"
                      : "text-muted-foreground/60 hover:text-muted-foreground bg-obsidian-elevated/20",
                  )}
                >
                  All
                </button>
                {availableColors.map((c) => {
                  const active = colorFilter === c;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setColorFilter(active ? null : c);
                        setActiveViewId(null);
                      }}
                      className={cn(
                        "rounded-full pl-1.5 pr-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors hairline inline-flex items-center gap-1.5",
                        active
                          ? "bg-gold/15 text-gold-soft border-gold/40"
                          : "text-muted-foreground/60 hover:text-muted-foreground bg-obsidian-elevated/20",
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorHex(c as CollectionColor) }}
                      />
                      {c}
                    </button>
                  );
                })}
              </>
            )}

            <div className="ml-auto flex items-center gap-1">
              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hairline rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 hover:text-gold-soft inline-flex items-center gap-1.5 bg-obsidian-elevated/20"
                    aria-label="Sort collections"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {sortLabel[sortKey]}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.keys(sortLabel) as VaultSortKey[]).map((k) => (
                    <DropdownMenuItem
                      key={k}
                      onClick={() => {
                        setSortKey(k);
                        setActiveViewId(null);
                      }}
                      className="text-xs"
                    >
                      {sortKey === k && <Check className="h-3 w-3 mr-1.5" />}
                      <span className={sortKey === k ? "" : "ml-[18px]"}>{sortLabel[k]}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Saved views */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hairline rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 hover:text-gold-soft inline-flex items-center gap-1.5 bg-obsidian-elevated/20"
                    aria-label="Saved views"
                  >
                    <Bookmark className="h-3 w-3" />
                    Views
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[220px]">
                  {savedViews.length === 0 && (
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground/60 italic">
                      No saved views yet.
                    </div>
                  )}
                  {savedViews.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => applyView(v)}
                      className="text-xs flex items-center gap-2 group"
                    >
                      {activeViewId === v.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Bookmark className="h-3 w-3 opacity-50" />
                      )}
                      <span className="flex-1 truncate">{v.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteView(v.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity"
                        aria-label={`Delete view ${v.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setNamingView(true);
                    }}
                    className="text-xs gap-1.5 text-gold-soft"
                  >
                    <Plus className="h-3 w-3" /> Save current view…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      shareCurrentView();
                    }}
                    className="text-xs gap-1.5"
                  >
                    <Link2 className="h-3 w-3" /> Copy share link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {namingView && (
            <div className="hairline rounded-xl bg-obsidian-elevated/30 p-3 flex gap-2">
              <Input
                autoFocus
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCurrentView();
                  if (e.key === "Escape") {
                    setNamingView(false);
                    setNewViewName("");
                  }
                }}
                placeholder="Name this view"
                className="h-8 text-sm bg-obsidian/40"
              />
              <Button size="sm" onClick={saveCurrentView}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNamingView(false);
                  setNewViewName("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : orderedCollections.length === 0 ? (
        <div className="hairline rounded-xl border-dashed bg-obsidian/30 px-6 py-10 text-center space-y-2">
          <Sparkles className="h-6 w-6 text-gold/25 mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground/70">No collections yet.</p>
          <p className="text-xs text-muted-foreground/45 leading-relaxed max-w-xs mx-auto">
            Create one, then long-press any verse in the Reader to drop it straight into a study.
          </p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <SmartEmptyState
          query={query}
          suggestions={buildVaultSuggestions({ colorFilter, availableColors })}
          onApply={(q) => {
            setQuery(q);
            setActiveViewId(null);
          }}
          onClearFilters={() => {
            setQuery("");
            setColorFilter(null);
            setSortKey("manual");
            setActiveViewId(null);
          }}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filteredIds}
            strategy={verticalListSortingStrategy}
            disabled={isSearching}
          >
            <div className="space-y-2">
              {filteredCollections.map((c) => (
                <SortableCollectionCard
                  key={c.id}
                  collection={c}
                  isActive={c.id === activeId}
                  onOpen={() => setActive(c.id)}
                  onSetActive={() => {
                    setActive(c.id);
                    toast(`"${c.title}" is now your Active Study.`);
                  }}
                  onArchive={() => handleArchive(c.id, c.title)}
                  dragDisabled={isSearching}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Archived */}
      <div className="pt-2">
        <button
          onClick={toggleArchived}
          className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55 hover:text-gold-soft transition-colors inline-flex items-center gap-1.5"
        >
          <Archive className="h-3 w-3" />
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
        {showArchived && (
          <div className="mt-3 space-y-2">
            {archivedLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
              </div>
            ) : archived.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic px-1">Nothing archived.</p>
            ) : (
              archived.map((c) => (
                <div
                  key={c.id}
                  className="hairline rounded-xl bg-obsidian/20 px-3 py-3 flex items-stretch gap-3"
                >
                  <CollectionAccentBar color={c.color} />
                  <span className="flex-1 min-w-0 text-sm text-muted-foreground/70 truncate self-center">
                    {c.title}
                  </span>
                  <button
                    onClick={() => handleUnarchive(c.id)}
                    className="text-[10px] uppercase tracking-[0.16em] text-gold-soft/70 hover:text-gold-soft inline-flex items-center gap-1 self-center"
                  >
                    <ArchiveRestore className="h-3 w-3" /> Restore
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="text-center pt-4">
        <Link to="/reader" className="text-xs text-gold/60 hover:text-gold-soft transition-colors">
          <BookOpen className="inline h-3.5 w-3.5 mr-1 -mt-0.5" strokeWidth={1.5} />
          Open the Reader
        </Link>
      </div>
    </div>
  );
}

function SortableCollectionCard({
  collection,
  isActive,
  onOpen,
  onSetActive,
  onArchive,
  dragDisabled = false,
}: {
  collection: VaultCollection;
  isActive: boolean;
  onOpen: () => void;
  onSetActive: () => void;
  onArchive: () => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
    disabled: dragDisabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group hairline rounded-xl bg-obsidian-elevated/30 px-2 py-3.5 transition-colors overflow-hidden",
        isActive ? "border-gold/40 bg-gold/5" : "hover:bg-gold/5",
        isDragging && "opacity-60 shadow-lg z-10",
      )}
    >
      <div className="flex items-stretch gap-2">
        <CollectionAccentBar color={collection.color} className="my-0.5" />
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="inline-flex min-h-11 min-w-11 items-center justify-center touch-none text-muted-foreground/35 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors self-center"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left self-center">
          <p className="font-display text-base text-gold-soft truncate">{collection.title}</p>
          {collection.master_thought && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-1 italic">
              "{collection.master_thought}"
            </p>
          )}
        </button>
        <div className="flex items-center gap-2 self-center">
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-gold-soft">
              <Star className="h-3 w-3" /> Active
            </span>
          ) : (
            <button
              onClick={onSetActive}
              className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 hover:text-gold-soft transition-colors"
            >
              Set active
            </button>
          )}
          <button
            onClick={onArchive}
            aria-label="Archive collection"
            className="inline-flex min-h-11 min-w-11 items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-muted-foreground transition-all"
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CollectionDetail({
  collection,
  userId,
  onBack,
  onDeleted,
  onUpdated,
}: {
  collection: VaultCollection;
  userId: string;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(collection.title);
  const [thought, setThought] = useState(collection.master_thought ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [openItem, setOpenItem] = useState<VaultItem | null>(null);
  const [launching, setLaunching] = useState(false);
  const MAX_THOUGHT = 140;

  const verseStops = useMemo<CircuitStop[]>(
    () =>
      items
        .filter((it) => it.item_type === "verse" && it.book && it.chapter && it.verse_start)
        .map((it) => ({
          itemId: it.id,
          book: it.book as string,
          chapter: it.chapter as number,
          verseStart: it.verse_start as number,
          verseEnd: it.verse_end ?? null,
          reference:
            it.scripture_ref ??
            `${it.book} ${it.chapter}:${it.verse_start}${
              it.verse_end && it.verse_end !== it.verse_start ? `-${it.verse_end}` : ""
            }`,
        })),
    [items],
  );

  const startCircuit = async () => {
    if (!verseStops.length) return;
    setLaunching(true);
    try {
      const bible = await loadBible();
      const first = verseStops[0];
      const bookIndex = bible.books.findIndex((b) => b.name === first.book);
      if (bookIndex < 0) {
        toast.error(`Couldn't find ${first.book} in scripture bundle.`);
        return;
      }
      startStudyCircuit({
        collectionId: collection.id,
        collectionTitle: collection.title,
        collectionColor: collection.color,
        stops: verseStops,
      });
      toast(`Study started — ${verseStops.length} verse${verseStops.length === 1 ? "" : "s"}`, {
        description: collection.title,
      });
      navigate({
        to: "/reader",
        search: { bookIndex, chapter: first.chapter, verse: first.verseStart },
      });
    } catch {
      toast.error("Could not start study.");
    } finally {
      setLaunching(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    listItems(collection.id).then((data) => {
      if (active) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [collection.id]);

  const saveMeta = async () => {
    const nextTitle = title.trim() || "Untitled Study";
    const nextThought = thought.trim() || null;
    if (nextTitle === collection.title && nextThought === (collection.master_thought ?? null))
      return;
    try {
      await updateCollection(
        collection.id,
        { title: nextTitle, master_thought: nextThought },
        { userId },
      );
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1400);
      onUpdated();
    } catch (err) {
      if (err instanceof DuplicateNameError) {
        // Revert title in the field; keep thought edits.
        setTitle(collection.title);
        toast.error("A collection with that name already exists.");
      } else {
        toast.error("Could not save.");
      }
    }
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteItem(id);
    } catch {
      toast.error("Could not remove.");
    }
  };

  const removeCollection = async () => {
    if (!confirm("Delete this collection and all its items?")) return;
    try {
      await deleteCollection(collection.id);
      onDeleted();
      toast("Collection deleted.");
    } catch {
      toast.error("Could not delete.");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = collectionToMarkdown(collection, items);
      await navigator.clipboard.writeText(md);
      toast("Copied as Markdown.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      const md = collectionToMarkdown(collection, items);
      downloadTextFile(`${slugify(collection.title)}.md`, md);
      toast("Downloaded.");
    } catch {
      toast.error("Could not download.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All collections
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={startCircuit}
            disabled={launching || verseStops.length === 0}
            title={
              verseStops.length === 0
                ? "Add at least one verse to start a study"
                : `Start study with ${verseStops.length} verse${verseStops.length === 1 ? "" : "s"}`
            }
            className="h-7 gap-1.5 border border-gold/40 bg-gold/12 px-2.5 text-[11px] uppercase tracking-[0.18em] text-gold-soft shadow-[0_0_18px_rgba(201,168,76,0.18)] hover:bg-gold/20 hover:text-gold disabled:opacity-40"
          >
            {launching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Start Study
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={items.length === 0}
                className="text-xs text-muted-foreground hover:text-gold-soft gap-1.5 h-7 px-2"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCopyMarkdown}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadMarkdown}>
                <Download className="h-3.5 w-3.5 mr-2" /> Download .md
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header / meta editor */}
      <div className="space-y-4">
        {/* Cover preview tile */}
        <div
          aria-hidden
          className="hairline rounded-xl overflow-hidden h-20 relative"
          style={{
            background: `linear-gradient(135deg, ${colorHex(collection.color)}cc 0%, ${colorHex(collection.color)}33 60%, transparent 100%), radial-gradient(circle at 80% 20%, ${colorHex(collection.color)}55, transparent 60%)`,
            boxShadow: `inset 0 0 30px ${colorHex(collection.color)}22, 0 0 18px ${colorHex(collection.color)}22`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/60 via-transparent to-obsidian/40" />
          <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between">
            <span className="font-display text-xs uppercase tracking-[0.22em] text-gold-soft/90">
              Cover
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-gold-soft/70">
              {items.length} {items.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-7 w-1.5 shrink-0 rounded-full"
            style={{
              background: colorHex(collection.color),
              boxShadow: `0 0 10px ${colorHex(collection.color)}55`,
            }}
          />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveMeta}
            className="font-display text-2xl border-0 bg-transparent px-0 focus-visible:ring-0 text-gold-soft"
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold/70 mb-2">Cover color</p>
          <CollectionColorPicker
            value={collection.color}
            onChange={async (next: CollectionColor) => {
              try {
                await updateCollection(collection.id, { color: next });
                onUpdated();
              } catch {
                toast.error("Could not update color.");
              }
            }}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold/70">Master Thought</p>
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.22em] transition-opacity duration-300",
                savedFlash ? "text-gold-soft opacity-100" : "opacity-0",
              )}
              aria-live="polite"
            >
              Saved
            </span>
          </div>
          <Textarea
            value={thought}
            onChange={(e) => setThought(e.target.value.slice(0, MAX_THOUGHT))}
            onBlur={saveMeta}
            placeholder="The single idea this study is building toward…"
            maxLength={MAX_THOUGHT}
            className={cn(
              "min-h-[80px] resize-none border-border/40 bg-obsidian-elevated/30 transition-shadow",
              savedFlash &&
                "shadow-[0_0_0_1px_rgba(201,168,76,0.45),0_0_18px_rgba(201,168,76,0.18)]",
            )}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/55">
            <span className="italic">One sentence. Your north star for this study.</span>
            <span className={cn(thought.length >= MAX_THOUGHT - 10 && "text-gold/70")}>
              {thought.length}/{MAX_THOUGHT}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : items.length === 0 ? (
        <div className="hairline rounded-xl border-dashed bg-obsidian/30 px-6 py-10 text-center space-y-2">
          <BookOpen className="h-6 w-6 text-gold/25 mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground/70">Nothing here yet.</p>
          <p className="text-xs text-muted-foreground/45 max-w-xs mx-auto leading-relaxed">
            Open the Reader and long-press a verse — the Vault picker will open so you can drop it
            into this study.
          </p>
        </div>
      ) : (
        <ItemsList
          items={items}
          onOpen={(item) => setOpenItem(item)}
          onRemove={removeItem}
          onReorder={async (next) => {
            setItems(next);
            try {
              await reorderItems(next.map((i) => i.id));
            } catch {
              toast.error("Could not save new order.");
            }
          }}
        />
      )}

      <div className="pt-4 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={removeCollection}
          className="text-destructive hover:text-destructive"
        >
          Delete collection
        </Button>
      </div>

      <VaultItemSheet
        item={openItem}
        open={openItem !== null}
        onOpenChange={(o) => {
          if (!o) setOpenItem(null);
        }}
        onRemoved={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
        onUpdated={(id, patch) =>
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
        }
      />
    </div>
  );
}

function ItemsList({
  items,
  onOpen,
  onRemove,
  onReorder,
}: {
  items: VaultItem[];
  onOpen: (item: VaultItem) => void;
  onRemove: (id: string) => void;
  onReorder: (next: VaultItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((i) => i.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(items, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItemRow
              key={item.id}
              item={item}
              onOpen={() => onOpen(item)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ─── Blueprint list preview ────────────────────────────────────────────── */
function BlueprintPreview({ noteText }: { noteText: string }) {
  try {
    const data = JSON.parse(noteText) as {
      passageText?: string;
      historicalContext?: { heading: string }[];
      actionSteps?: string[];
    };
    return (
      <div className="space-y-1">
        {data.passageText && (
          <p className="text-xs text-foreground/70 italic leading-relaxed line-clamp-2 font-display pl-2 border-l border-gold/25">
            {data.passageText}
          </p>
        )}
        {data.historicalContext?.[0] && (
          <p className="text-[10px] text-muted-foreground/55 uppercase tracking-[0.14em]">
            {data.historicalContext[0].heading}
          </p>
        )}
        {data.actionSteps?.[0] && (
          <p className="text-[10px] text-muted-foreground/50 line-clamp-1">
            ✦ {data.actionSteps[0]}
          </p>
        )}
      </div>
    );
  } catch {
    return null;
  }
}

function SortableItemRow({
  item,
  onOpen,
  onRemove,
}: {
  item: VaultItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group hairline rounded-xl bg-obsidian-elevated/30 transition-colors hover:bg-gold/5",
        isDragging && "opacity-60 shadow-lg z-10",
      )}
    >
      <div className="flex items-start gap-1 px-2 py-3">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="inline-flex min-h-11 min-w-11 items-center justify-center touch-none text-muted-foreground/35 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left space-y-1.5 pr-2"
          aria-label={`Open ${item.scripture_ref ?? "saved item"}`}
        >
          {item.scripture_ref && (
            <p className="font-display text-sm text-gold-soft">{item.scripture_ref}</p>
          )}
          {item.quote_text && (
            <p className="text-sm text-foreground/80 italic leading-relaxed line-clamp-2">
              "{item.quote_text}"
            </p>
          )}
          {/* Blueprint items store JSON in note_text — render a clean preview,
              never dump raw JSON to the screen. */}
          {item.item_type === "blueprint" && item.note_text ? (
            <BlueprintPreview noteText={item.note_text} />
          ) : item.note_text ? (
            <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2">
              {item.note_text}
            </p>
          ) : null}
        </button>
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="inline-flex min-h-11 min-w-11 items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-muted-foreground transition-all"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
