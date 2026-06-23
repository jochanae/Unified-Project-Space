/**
 * PoemLibraryPanel — Poem Library section embedded inside /vault.
 *
 * Slice 1 of the Poem Library roadmap:
 *  - Lists the user's saved poems (newest first)
 *  - Search across title, body, inspiration, tags
 *  - Filter by template
 *  - Copy to clipboard
 *  - Delete (with toast undo? — out of scope for slice 1; hard delete with confirm)
 *  - Open in editor (navigates to /notes?poemId=…)
 *
 * Storage layer lives in src/lib/poems.ts.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Copy,
  Feather,
  Globe,
  Heart,
  Loader2,
  Plus,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PoemImportDialog } from "@/components/notes/PoemImportDialog";
import {
  deletePoem,
  listPoems,
  matchesPoemQuery,
  poemFullText,
  poemPreview,
  TEMPLATE_LABEL,
  type PoemRecord,
  type PoemTemplate,
} from "@/lib/poems";
import { addBoardItem } from "@/lib/boards";

const TEMPLATE_ICON: Record<PoemTemplate, React.FC<{ className?: string }>> = {
  heart_cry: Heart,
  psalm: Sparkles,
  proverb: Feather,
};

export function PoemLibraryPanel({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [poems, setPoems] = useState<PoemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PoemTemplate | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const refresh = async () => {
    try {
      const list = await listPoems(userId);
      setPoems(list);
    } catch {
      toast.error("Couldn't load your writings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filtered = useMemo(() => {
    return poems.filter((p) => {
      if (filter !== "all" && p.template !== filter) return false;
      return matchesPoemQuery(p, query);
    });
  }, [poems, query, filter]);

  const handleCopy = async (record: PoemRecord) => {
    try {
      await navigator.clipboard.writeText(poemFullText(record));
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  };

  const handleDelete = async (record: PoemRecord) => {
    const ok = window.confirm("Delete this poem? This can't be undone.");
    if (!ok) return;
    setBusy(record.id);
    try {
      await deletePoem(record.id);
      setPoems((prev) => prev.filter((p) => p.id !== record.id));
      toast("Poem deleted.");
    } catch {
      toast.error("Couldn't delete. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleOpen = (record: PoemRecord) => {
    void navigate({ to: "/notes", search: { poemId: record.id } as never });
  };

  const handleAddToBoard = async (record: PoemRecord) => {
    setBusy(record.id);
    try {
      await addBoardItem({
        user_id: userId,
        kind: "poem",
        ref_id: record.id,
        title: record.title || "Untitled poem",
        caption: poemPreview(record).slice(0, 240),
        thumbnail_url: null,
        external_url: null,
      });
      toast.success("Added to your board.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to board.");
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<PoemTemplate, number> = { heart_cry: 0, psalm: 0, proverb: 0 };
    for (const p of poems) c[p.template]++;
    return c;
  }, [poems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground/60">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Writing Library</p>
          <h2 className="font-display text-xl text-foreground mt-0.5">Your writings</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold/20 bg-obsidian-elevated/20 px-3 py-1.5 text-xs text-muted-foreground/80 hover:text-gold-soft hover:bg-gold/5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
          <Link
            to="/notes"
            search={{ newPoem: 1 } as never}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-obsidian-elevated/30 px-3 py-1.5 text-xs text-gold-soft hover:bg-gold/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New writing
          </Link>
        </div>
      </div>

      <PoemImportDialog
        open={importOpen}
        userId={userId}
        onClose={() => setImportOpen(false)}
        onImported={(poemId) => {
          setImportOpen(false);
          void refresh();
          void navigate({ to: "/notes", search: { poemId } as never });
        }}
      />

      {poems.length === 0 ? (
        <div className="hairline rounded-xl bg-obsidian-elevated/20 p-6 text-center space-y-2">
          <p className="font-display italic text-muted-foreground/80">
            Your writings will gather here.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Heart cries, psalms, proverbs, reflections — saved for the long road.
          </p>
          <Link
            to="/notes"
            search={{ newPoem: 1 } as never}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-obsidian-elevated/30 px-3 py-1.5 text-xs text-gold-soft hover:bg-gold/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Write your first
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/45" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, words, scripture, tags…"
              className="w-full hairline rounded-md bg-obsidian-elevated/30 pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 caret-gold"
              aria-label="Search poems"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Template filters */}
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              label={`All (${poems.length})`}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {(["heart_cry", "psalm", "proverb"] as const).map((t) => {
              const Icon = TEMPLATE_ICON[t];
              return (
                <FilterChip
                  key={t}
                  label={`${TEMPLATE_LABEL[t]} (${counts[t]})`}
                  icon={Icon}
                  active={filter === t}
                  onClick={() => setFilter(filter === t ? "all" : t)}
                />
              );
            })}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground/60 italic py-4">
              No writings match that search.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((p) => {
                const Icon = TEMPLATE_ICON[p.template];
                return (
                  <li
                    key={p.id}
                    className="hairline rounded-lg bg-obsidian-elevated/25 p-3 transition-colors hover:bg-obsidian-elevated/40"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpen(p)}
                      className="w-full text-left space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold/60">
                        <Icon className="h-3 w-3" />
                        {TEMPLATE_LABEL[p.template]}
                        {p.inspiration && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="normal-case tracking-normal text-muted-foreground/70 truncate">
                              {p.inspiration}
                            </span>
                          </>
                        )}
                        <span className="ml-auto normal-case tracking-normal text-muted-foreground/50">
                          {new Date(p.updated_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      {p.title && (
                        <p className="font-display text-sm text-foreground italic">{p.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground/85 leading-relaxed line-clamp-3">
                        {poemPreview(p)}
                      </p>
                    </button>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <IconAction label="Copy" onClick={() => handleCopy(p)} icon={Copy} />
                      <IconAction
                        label="To board"
                        disabled={busy === p.id}
                        onClick={() => handleAddToBoard(p)}
                        icon={Globe}
                      />
                      <IconAction
                        label="Delete"
                        disabled={busy === p.id}
                        onClick={() => handleDelete(p)}
                        icon={Trash2}
                        destructive
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function FilterChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.FC<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] hairline transition-colors",
        active
          ? "bg-gold/15 text-gold-soft border-gold/40"
          : "text-muted-foreground/60 hover:text-foreground bg-obsidian-elevated/20",
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors disabled:opacity-40",
        destructive
          ? "text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground/70 hover:text-gold-soft hover:bg-gold/5",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
