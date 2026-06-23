/**
 * SermonCompanionPanel
 *
 * Four-tab right-hand panel for the unified editor.
 * Desktop: fixed right column (collapsible).
 * Mobile: Sheet drawer triggered by a floating button.
 *
 * Tabs:
 *   Scratchpad   — free-text notes, debounced upsert to sermon_scratchpads
 *   Pinned Verses — sermon_pins for this sermon
 *   Selah Lenses — AI revision (Tighten / Clarify / Strengthen / Illustrate)
 *   Versions     — sermon_versions history with restore
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Link2,
  NotebookPen,
  Pin,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AiRevisionLenses } from "@/components/workspace/AiRevisionLenses";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Tab = "scratchpad" | "pins" | "research" | "lenses" | "versions";

interface SermonPin {
  id: string;
  scripture_ref: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  version: string;
  position: number;
  created_at: string;
}

interface ResearchItem {
  id: string;
  kind: "snippet" | "quote" | "link" | "note";
  title: string | null;
  body: string;
  source_url: string | null;
  source_label: string | null;
  position: number;
  created_at: string;
}

interface VersionRow {
  id: string;
  version_number: number;
  manuscript: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  sermonId: string;
  userId: string;
  manuscript: string;
  /** Bumped after every save to trigger version re-fetch */
  historyKey: number;
  onBeforeApply: () => Promise<void>;
  onApply: (next: string, lensLabel: string) => void;
  onRestore: (manuscript: string, versionNumber: number) => void;
  /** Append text into the manuscript (used by Research → "Insert into draft") */
  onInsertIntoManuscript?: (text: string) => void;
  saving?: boolean;
}

/* ─── Main component ────────────────────────────────────────────────────── */

export function SermonCompanionPanel({
  sermonId,
  userId,
  manuscript,
  historyKey,
  onBeforeApply,
  onApply,
  onRestore,
  onInsertIntoManuscript,
  saving = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("scratchpad");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const panelContent = (
    <PanelContent
      sermonId={sermonId}
      userId={userId}
      manuscript={manuscript}
      historyKey={historyKey}
      onBeforeApply={onBeforeApply}
      onApply={onApply}
      onRestore={onRestore}
      onInsertIntoManuscript={onInsertIntoManuscript}
      saving={saving}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );

  return (
    <>
      {/* ── Desktop panel ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden xl:flex flex-col shrink-0 transition-all duration-300",
          "border-l border-gold/15 bg-obsidian-elevated/30 backdrop-blur-xl",
          collapsed ? "w-10" : "w-80",
        )}
        style={{ height: "calc(100vh - 4rem)", position: "sticky", top: "4rem" }}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          className="flex h-10 w-full items-center justify-center border-b border-gold/12 text-muted-foreground/50 hover:text-gold-soft transition-colors"
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {!collapsed && <div className="flex-1 overflow-hidden">{panelContent}</div>}
      </aside>

      {/* ── Mobile trigger button ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open companion panel"
        className={cn(
          "xl:hidden fixed bottom-24 right-4 z-40",
          "flex h-11 w-11 items-center justify-center rounded-full",
          "border border-gold/35 bg-obsidian shadow-[0_0_20px_rgba(201,168,76,0.2)]",
          "text-gold transition-all hover:shadow-[0_0_28px_rgba(201,168,76,0.35)]",
        )}
      >
        <Wand2 className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {/* ── Mobile Sheet ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="xl:hidden fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-gold/18 bg-[rgba(10,10,10,0.97)] backdrop-blur-2xl"
            style={{ maxHeight: "82svh", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <div className="mx-auto h-1 w-10 rounded-full bg-gold/20" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-3 text-muted-foreground/50 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(82svh - 2.5rem)" }}>
              {panelContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Panel content (shared desktop + mobile) ───────────────────────────── */

function PanelContent({
  sermonId,
  userId,
  manuscript,
  historyKey,
  onBeforeApply,
  onApply,
  onRestore,
  onInsertIntoManuscript,
  saving,
  activeTab,
  setActiveTab,
}: Props & { activeTab: Tab; setActiveTab: (t: Tab) => void }) {
  const TABS: Array<{ id: Tab; icon: typeof NotebookPen; label: string }> = [
    { id: "scratchpad", icon: NotebookPen, label: "Notes" },
    { id: "pins", icon: BookMarked, label: "Verses" },
    { id: "research", icon: Pin, label: "Research" },
    { id: "lenses", icon: Wand2, label: "Lenses" },
    { id: "versions", icon: History, label: "History" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gold/12 shrink-0">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 px-1.5 py-2.5 text-[9px] uppercase tracking-[0.16em] transition-colors",
              activeTab === id
                ? "border-b-2 border-gold/70 text-gold-soft"
                : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "scratchpad" && <ScratchpadTab sermonId={sermonId} userId={userId} />}
        {activeTab === "pins" && <PinsTab sermonId={sermonId} userId={userId} />}
        {activeTab === "research" && (
          <ResearchTab
            sermonId={sermonId}
            userId={userId}
            onInsertIntoManuscript={onInsertIntoManuscript}
          />
        )}
        {activeTab === "lenses" && (
          <LensesTab
            manuscript={manuscript}
            saving={saving ?? false}
            onBeforeApply={onBeforeApply}
            onApply={onApply}
          />
        )}
        {activeTab === "versions" && (
          <VersionsTab
            sermonId={sermonId}
            userId={userId}
            historyKey={historyKey}
            currentManuscript={manuscript}
            onRestore={onRestore}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Scratchpad tab ────────────────────────────────────────────────────── */

function ScratchpadTab({ sermonId, userId }: { sermonId: string; userId: string }) {
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("sermon_scratchpads")
      .select("body")
      .eq("sermon_id", sermonId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setBody((data?.body as string) ?? "");
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [sermonId]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void supabase
        .from("sermon_scratchpads")
        .upsert({ sermon_id: sermonId, user_id: userId, body }, { onConflict: "sermon_id" });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [body, loaded, sermonId, userId]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">Scratchpad</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Rough thoughts, phrases, cross-references…"
        className="w-full min-h-[16rem] resize-none bg-transparent text-sm text-foreground/85 placeholder:text-muted-foreground/35 outline-none leading-relaxed"
      />
      <p className="text-[10px] text-muted-foreground/30">Auto-saves as you type</p>
    </div>
  );
}

/* ─── Pinned Verses tab ─────────────────────────────────────────────────── */

function PinsTab({ sermonId, userId }: { sermonId: string; userId: string }) {
  const [pins, setPins] = useState<SermonPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("sermon_pins")
      .select("*")
      .eq("sermon_id", sermonId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setPins(data as SermonPin[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sermonId]);

  const handleRemove = useCallback(async (id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("sermon_pins").delete().eq("id", id);
  }, []);

  if (loading) return <LoadingSpinner context="inline" />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">Pinned Verses</p>
      {pins.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/45 leading-relaxed pt-2">
          No pinned verses yet. Tap a verse in the reader and choose "Pin to Sermon" to add it here.
        </p>
      ) : (
        <ul className="space-y-2">
          {pins.map((pin) => (
            <li
              key={pin.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-gold/15 bg-obsidian/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold/65 mb-0.5">
                  {pin.scripture_ref}
                </p>
                <p className="text-[10px] text-muted-foreground/50">{pin.version}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(pin.id)}
                className="shrink-0 text-muted-foreground/35 hover:text-destructive transition-colors mt-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Lenses tab ────────────────────────────────────────────────────────── */

function LensesTab({
  manuscript,
  saving,
  onBeforeApply,
  onApply,
}: {
  manuscript: string;
  saving: boolean;
  onBeforeApply: () => Promise<void>;
  onApply: (next: string, lensLabel: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">AI Lenses</p>
      <p className="text-[11px] text-muted-foreground/50 leading-relaxed mb-3">
        Each lens revises the full manuscript. Your current version is saved first.
      </p>
      <AiRevisionLenses
        manuscript={manuscript}
        disabled={saving}
        onBeforeApply={onBeforeApply}
        onApply={onApply}
      />
    </div>
  );
}

/* ─── Versions tab ──────────────────────────────────────────────────────── */

function VersionsTab({
  sermonId,
  userId,
  historyKey,
  currentManuscript,
  onRestore,
}: {
  sermonId: string;
  userId: string;
  historyKey: number;
  currentManuscript: string;
  onRestore: (manuscript: string, versionNumber: number) => void;
}) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<VersionRow | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("sermon_versions")
      .select("id, version_number, manuscript, notes, created_at")
      .eq("sermon_id", sermonId)
      .eq("user_id", userId)
      .order("version_number", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setVersions(data as VersionRow[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sermonId, userId, historyKey]);

  if (loading) return <LoadingSpinner context="inline" />;

  if (previewing) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setPreviewing(null)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> All versions
        </button>
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">
          Version {previewing.version_number}
        </p>
        {previewing.notes && (
          <p className="text-[11px] text-muted-foreground/60 italic">{previewing.notes}</p>
        )}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-gold/15 bg-obsidian/60 p-3">
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/85 font-serif">
            {previewing.manuscript || "Empty"}
          </pre>
        </div>
        <button
          type="button"
          disabled={previewing.manuscript === currentManuscript}
          onClick={() => {
            onRestore(previewing.manuscript, previewing.version_number);
            toast.success(`Restored v${previewing.version_number}. Save to keep changes.`);
            setPreviewing(null);
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft disabled:opacity-40 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {previewing.manuscript === currentManuscript
            ? "Current version"
            : `Restore v${previewing.version_number}`}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">Version History</p>
      {versions.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/45 leading-relaxed pt-2">
          No saved versions yet. Save your manuscript to create the first version.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {versions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setPreviewing(v)}
                className="w-full text-left rounded-xl border border-gold/12 bg-obsidian/40 px-3 py-2.5 hover:border-gold/30 hover:bg-obsidian/70 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm text-gold/80">v{v.version_number}</span>
                  <span className="text-[10px] text-muted-foreground/45">
                    {new Date(v.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {v.notes && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/55 line-clamp-1">
                    {v.notes}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground/35">
                  {v.manuscript.length.toLocaleString()} chars
                  {v.manuscript === currentManuscript ? " · current" : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Research tab ──────────────────────────────────────────────────────── */

function ResearchTab({
  sermonId,
  userId,
  onInsertIntoManuscript,
}: {
  sermonId: string;
  userId: string;
  onInsertIntoManuscript?: (text: string) => void;
}) {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [draftSource, setDraftSource] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("sermon_research" as any) as any)
      .select("*")
      .eq("sermon_id", sermonId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: any) => {
        if (!active) return;
        if (!error && data) setItems(data as ResearchItem[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sermonId]);

  const detectKind = (body: string, source: string): ResearchItem["kind"] => {
    const trimmed = body.trim();
    if (source.trim().match(/^https?:\/\//i) && trimmed.length < 200) return "link";
    if (trimmed.startsWith('"') || trimmed.startsWith("\u201c")) return "quote";
    if (trimmed.length < 60) return "note";
    return "snippet";
  };

  const handleAdd = useCallback(async () => {
    const body = draftBody.trim();
    if (!body) return;
    const sourceUrl = draftSource.trim().match(/^https?:\/\//i) ? draftSource.trim() : null;
    const sourceLabel = !sourceUrl && draftSource.trim() ? draftSource.trim() : null;
    const kind = detectKind(body, draftSource);
    const optimistic: ResearchItem = {
      id: `temp-${Date.now()}`,
      kind,
      title: null,
      body,
      source_url: sourceUrl,
      source_label: sourceLabel,
      position: 0,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setDraftBody("");
    setDraftSource("");
    setAdding(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("sermon_research" as any) as any)
      .insert({
        sermon_id: sermonId,
        user_id: userId,
        kind,
        body,
        source_url: sourceUrl,
        source_label: sourceLabel,
      })
      .select("*")
      .single();
    if (error) {
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      toast.error("Could not save research item.");
      return;
    }
    setItems((prev) => [data as ResearchItem, ...prev.filter((i) => i.id !== optimistic.id)]);
  }, [draftBody, draftSource, sermonId, userId]);

  const handleRemove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("sermon_research" as any) as any).delete().eq("id", id);
  }, []);

  const handleInsert = useCallback(
    (item: ResearchItem) => {
      if (!onInsertIntoManuscript) {
        // Fallback: copy to clipboard
        void navigator.clipboard?.writeText(item.body);
        toast.success("Copied. Paste into your manuscript.");
        return;
      }
      const attribution = item.source_url
        ? ` — ${item.source_label ?? item.source_url}`
        : item.source_label
          ? ` — ${item.source_label}`
          : "";
      onInsertIntoManuscript(`\n\n${item.body}${attribution}\n`);
      toast.success("Inserted into draft.");
    },
    [onInsertIntoManuscript],
  );

  if (loading) return <LoadingSpinner context="inline" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/55">Research</p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-gold/25 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gold-soft hover:bg-gold/10"
        >
          <Plus className="h-3 w-3" /> {adding ? "Cancel" : "Add"}
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl border border-gold/20 bg-obsidian/50 p-3">
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            placeholder="Paste a quote, snippet, or note…"
            rows={4}
            autoFocus
            className="w-full resize-none rounded-md border border-gold/15 bg-obsidian/60 p-2 text-xs text-foreground/90 outline-none focus:border-gold/35"
          />
          <input
            value={draftSource}
            onChange={(e) => setDraftSource(e.target.value)}
            placeholder="Source URL or label (optional)"
            className="w-full rounded-md border border-gold/15 bg-obsidian/60 px-2 py-1.5 text-[11px] text-foreground/90 outline-none focus:border-gold/35"
            aria-label="Source URL or label (optional)"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draftBody.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-[11px] font-medium text-obsidian hover:bg-gold-soft disabled:opacity-40"
          >
            <Pin className="h-3 w-3" /> Pin to sermon
          </button>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p className="pt-2 text-[12px] leading-relaxed text-muted-foreground/45">
          No research yet. Tap <span className="text-gold-soft">Add</span> to pin quotes, snippets,
          or links from your global search results into this sermon.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-gold/15 bg-obsidian/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-gold/55">
                  {item.kind}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="text-muted-foreground/35 hover:text-destructive transition-colors"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/85">
                {item.body}
              </p>
              {(item.source_url || item.source_label) && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                  <Link2 className="h-3 w-3" />
                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate hover:text-gold-soft"
                    >
                      {item.source_label ?? item.source_url}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <span className="truncate">{item.source_label}</span>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleInsert(item)}
                className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-gold-soft hover:text-gold"
              >
                <Sparkles className="h-3 w-3" /> Insert into draft
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
