import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Pencil,
  Save,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ScriptureLinkified } from "@/components/workspace/ScriptureLinkified";
import { jsPDF } from "jspdf";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SermonDetailSkeleton } from "@/components/ui/page-skeletons";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { SermonCompanionPanel } from "@/components/workspace/SermonCompanionPanel";
import { useSermonComposer, type SermonOutline } from "@/hooks/useSermonComposer";

const searchSchema = z.object({
  prefilledScripture: fallback(z.string(), "").optional(),
  prefilledTheme: fallback(z.string(), "").optional(),
});

export const Route = createFileRoute("/workspace/sermons/$sermonId")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [{ title: "Edit Sermon — SanctumIQ" }, { name: "robots", content: "noindex" }],
  }),
  component: SermonEditorPage,
});

interface SermonRow {
  id: string;
  title: string;
  manuscript: string;
  scripture_ref: string | null;
  scripture_text: string | null;
  theme: string | null;
  audience: string | null;
  tone: string | null;
  length_target: "short" | "standard" | "long" | null;
  status: string;
  updated_at: string;
  current_version: number;
}

/** Auto-snapshot interval — 10 minutes of dirty state triggers a silent version. */
const AUTO_SNAPSHOT_MS = 10 * 60 * 1000;

function SermonEditorPage() {
  const { sermonId } = Route.useParams();
  const { prefilledScripture, prefilledTheme } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasAnyRole, loading: rolesLoading } = useRoles(user?.id);
  const hasPaidAccess = hasAnyRole(["minister", "church_partner", "admin"]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [sermon, setSermon] = useState<SermonRow | null>(null);
  const [title, setTitle] = useState("");
  const [manuscript, setManuscript] = useState("");
  const [theme, setTheme] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "read">("edit");
  /** Bumps after every saved version so the history panel re-fetches. */
  const [historyKey, setHistoryKey] = useState(0);
  /** Tracks the manuscript text last persisted to a version, to avoid duplicates. */
  const lastSnapshotRef = useRef<string>("");
  const autoSnapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Ensure prefilled search params are applied at most once per load. */
  const prefillAppliedRef = useRef(false);
  /** Ensure first-draft auto-generation only fires once per sermon load. */
  const autoGenAttemptedRef = useRef(false);

  /* ── AI composer (outline → manuscript) ─────────────────────────────── */
  const composer = useSermonComposer();
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<
    "outline" | "manuscript" | "finalizing" | null
  >(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  /** Hard guard against parallel generation runs (double-tap, effect re-run). */
  const generatingRef = useRef(false);

  useEffect(() => {
    if (!user || !hasPaidAccess) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sermons")
        .select(
          "id, title, manuscript, scripture_ref, scripture_text, theme, audience, tone, length_target, status, updated_at, current_version",
        )
        .eq("id", sermonId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setSermon(data as SermonRow);
        setTitle(data.title ?? "");
        setManuscript(data.manuscript ?? "");
        lastSnapshotRef.current = data.manuscript ?? "";
        setTheme(data.theme ?? "");
        setScriptureRef(data.scripture_ref ?? "");
        setDirty(false);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [sermonId, user, hasPaidAccess]);

  /**
   * Bible bridge — if the user arrived from the reader with prefilled values,
   * fold them into empty fields and clear them from the URL so a refresh
   * doesn't re-apply them.
   */
  useEffect(() => {
    if (loading || !sermon || prefillAppliedRef.current) return;
    if (!prefilledScripture && !prefilledTheme) return;
    prefillAppliedRef.current = true;
    let touched = false;
    if (prefilledScripture && !scriptureRef.trim()) {
      setScriptureRef(prefilledScripture);
      touched = true;
    }
    if (prefilledTheme && !theme.trim()) {
      setTheme(prefilledTheme);
      touched = true;
    }
    if (touched) setDirty(true);
    navigate({
      to: "/workspace/sermons/$sermonId",
      params: { sermonId },
      search: { prefilledScripture: undefined, prefilledTheme: undefined },
      replace: true,
    });
  }, [
    loading,
    sermon,
    prefilledScripture,
    prefilledTheme,
    scriptureRef,
    theme,
    navigate,
    sermonId,
  ]);

  /**
   * First-draft generation — outline → manuscript via the sermon-composer
   * edge function. Persists both into the sermon row and creates a v1 version.
   * Caller-supplied flag controls whether to auto-fire on load.
   */
  const generateFirstDraft = useCallback(async () => {
    if (!user || !sermon) return;
    // Hard guard: ref check is synchronous and survives effect re-runs / double-taps.
    if (generatingRef.current) return;
    const themeVal = theme.trim();
    const scriptureVal = scriptureRef.trim();
    if (!themeVal && !scriptureVal) {
      toast.error("Add a theme or scripture reference first.");
      return;
    }
    generatingRef.current = true;
    setGenerating(true);
    setGenerationStage("outline");
    setGenerationError(null);
    try {
      const inputs = {
        theme: themeVal,
        scriptureRef: scriptureVal,
        scriptureText: sermon.scripture_text ?? "",
        audience: sermon.audience ?? "General",
        tone: sermon.tone ?? "Encouraging",
        lengthTarget: (sermon.length_target ?? "standard") as "short" | "standard" | "long",
      };

      // 1. Outline
      const { data: outlineData, error: outlineErr } = await supabase.functions.invoke(
        "sermon-composer",
        {
          body: {
            action: "outline",
            theme: inputs.theme,
            scripture_ref: inputs.scriptureRef,
            scripture_text: inputs.scriptureText,
            audience: inputs.audience,
            tone: inputs.tone,
            length_target: inputs.lengthTarget,
          },
        },
      );
      if (outlineErr || !outlineData?.outline) {
        const msg = outlineData?.error ?? "Outline generation failed.";
        setGenerationError(msg);
        toast.error(msg);
        return;
      }
      const outline = outlineData.outline as SermonOutline;

      // 2. Manuscript
      setGenerationStage("manuscript");
      const { data: manuData, error: manuErr } = await supabase.functions.invoke(
        "sermon-composer",
        {
          body: {
            action: "manuscript",
            outline,
            scripture_ref: inputs.scriptureRef,
            scripture_text: inputs.scriptureText,
            audience: inputs.audience,
            tone: inputs.tone,
            length_target: inputs.lengthTarget,
          },
        },
      );
      if (manuErr || !manuData?.manuscript) {
        const msg = manuData?.error ?? "Manuscript generation failed.";
        setGenerationError(msg);
        toast.error(msg);
        return;
      }
      const newManuscript = manuData.manuscript as string;
      const newTitle = outline.title || title || "Untitled sermon";

      // 3. Persist
      setGenerationStage("finalizing");
      setManuscript(newManuscript);
      setTitle(newTitle);
      setDirty(false);
      lastSnapshotRef.current = newManuscript;

      const { error: updateErr } = await supabase
        .from("sermons")
        .update({
          manuscript: newManuscript,
          title: newTitle,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outline: outline as any,
        })
        .eq("id", sermon.id)
        .eq("user_id", user.id);
      if (updateErr) {
        toast.error("Generated, but couldn't save. Please click Save.");
        setDirty(true);
        return;
      }

      await supabase.from("sermon_versions").insert({
        sermon_id: sermon.id,
        user_id: user.id,
        version_number: 1,
        manuscript: newManuscript,
        outline: outline as unknown as Record<string, unknown>,
        notes: "Initial AI draft",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      setHistoryKey((k) => k + 1);
      toast.success("First draft ready. Edit, refine, or apply a Lens.");
    } catch (err) {
      console.error("generateFirstDraft error:", err);
      const msg = "Connection error. Please try again.";
      setGenerationError(msg);
      toast.error(msg);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
      setGenerationStage(null);
    }
    // composer is included so re-renders pick up the latest hasPaidAccess gating
  }, [user, sermon, theme, scriptureRef, title]);

  /**
   * Auto-trigger first draft when the editor loads an empty sermon that has
   * enough metadata to compose from. Fires at most once per load.
   */
  useEffect(() => {
    if (loading || !sermon || autoGenAttemptedRef.current) return;
    if (manuscript.trim()) return; // already has content
    if (!sermon.theme && !sermon.scripture_ref) return; // need at least one
    autoGenAttemptedRef.current = true;
    void generateFirstDraft();
  }, [loading, sermon, manuscript, generateFirstDraft]);
  void composer; // keep the hook in scope (usage gating + future expansion)

  /**
   * Insert a new sermon_versions row using the supplied manuscript text and
   * bump the parent sermon's current_version. Returns the new version number,
   * or null if no work was done (e.g. unchanged text or no auth).
   */
  const snapshotVersion = useCallback(
    async (text: string, note: string): Promise<number | null> => {
      if (!user || !sermon) return null;
      if (text === lastSnapshotRef.current) return null;
      const { data: latest } = await supabase
        .from("sermon_versions")
        .select("version_number")
        .eq("sermon_id", sermon.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (latest?.version_number ?? 0) + 1;
      const { error: insertErr } = await supabase.from("sermon_versions").insert({
        sermon_id: sermon.id,
        user_id: user.id,
        version_number: nextVersion,
        manuscript: text,
        notes: note,
      });
      if (insertErr) return null;
      await supabase
        .from("sermons")
        .update({ current_version: nextVersion })
        .eq("id", sermon.id)
        .eq("user_id", user.id);
      lastSnapshotRef.current = text;
      setSermon((s) => (s ? { ...s, current_version: nextVersion } : s));
      setHistoryKey((k) => k + 1);
      return nextVersion;
    },
    [user, sermon],
  );

  const handleSave = async () => {
    if (!user || !sermon) return;
    setSaving(true);
    const { error } = await supabase
      .from("sermons")
      .update({
        title: title.trim() || "Untitled Sermon",
        manuscript,
        theme: theme.trim() || null,
        scripture_ref: scriptureRef.trim() || null,
      })
      .eq("id", sermon.id)
      .eq("user_id", user.id);

    if (!error) {
      await snapshotVersion(manuscript, `Saved ${new Date().toLocaleString()}`);
    }

    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save sermon.");
    } else {
      toast.success("Sermon updated.");
      setDirty(false);
    }
  };

  /**
   * Auto-snapshot timer — every 10 minutes while dirty, take a silent
   * snapshot so the user can recover even if they never click Save.
   */
  useEffect(() => {
    if (!user || !sermon) return;
    if (!dirty) {
      if (autoSnapshotTimerRef.current) {
        clearInterval(autoSnapshotTimerRef.current);
        autoSnapshotTimerRef.current = null;
      }
      return;
    }
    autoSnapshotTimerRef.current = setInterval(() => {
      void snapshotVersion(manuscript, `Auto-saved ${new Date().toLocaleString()}`);
    }, AUTO_SNAPSHOT_MS);
    return () => {
      if (autoSnapshotTimerRef.current) {
        clearInterval(autoSnapshotTimerRef.current);
        autoSnapshotTimerRef.current = null;
      }
    };
  }, [dirty, manuscript, snapshotVersion, user, sermon]);

  const handleDelete = async () => {
    if (!user || !sermon) return;
    if (!confirm("Delete this sermon draft? This cannot be undone.")) return;
    setDeleting(true);
    const { error } = await supabase
      .from("sermons")
      .delete()
      .eq("id", sermon.id)
      .eq("user_id", user.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message || "Could not delete.");
    } else {
      toast.success("Sermon deleted.");
      navigate({ to: "/workspace/sermons" });
    }
  };

  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 56;
    const maxW = pageW - margin * 2;
    let y = margin;

    doc.setFont("times", "bold");
    doc.setFontSize(20);
    const titleLines = doc.splitTextToSize(title.trim() || "Untitled Sermon", maxW);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 24 + 6;

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    const metaBits = [scriptureRef.trim(), theme.trim()].filter(Boolean).join(" · ");
    if (metaBits) {
      const metaLines = doc.splitTextToSize(metaBits, maxW);
      doc.text(metaLines, margin, y);
      y += metaLines.length * 14 + 8;
    }

    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 18;

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    const bodyLines = doc.splitTextToSize(manuscript || "", maxW);
    const lineH = 16;
    for (const line of bodyLines) {
      if (y + lineH > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineH;
    }
    return doc;
  };

  const fileSlug =
    (title.trim() || "sermon")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "sermon";

  const handleExportPdf = () => {
    try {
      const doc = buildPdf();
      doc.save(`${fileSlug}.pdf`);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not export PDF.");
    }
  };

  const handleSharePdf = async () => {
    try {
      const doc = buildPdf();
      const blob = doc.output("blob");
      const file = new File([blob], `${fileSlug}.pdf`, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: title.trim() || "Sermon draft",
          text: scriptureRef.trim() || undefined,
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.message("Sharing isn't supported here — opened the PDF instead.");
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name !== "AbortError") toast.error("Could not share PDF.");
    }
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <LoadingAppShell pageTitle="Sermon">
        <SermonDetailSkeleton text="Fetching your sermon…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Sermon Composer"
        title="Sign in to edit sermons"
        description="Your sermon drafts are tied to your account."
        redirectTo={`/workspace/sermons/${sermonId}`}
      />
    );
  }

  if (!hasPaidAccess) {
    return (
      <AppShell pageTitle="Sermon">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="font-display text-2xl text-foreground">
            Sermon editing requires an Architect plan
          </h1>
          <Link
            to="/pricing"
            className="mt-6 inline-flex rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-obsidian"
          >
            View pricing
          </Link>
        </div>
      </AppShell>
    );
  }

  if (notFound || !sermon) {
    return (
      <AppShell pageTitle="Sermon">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="font-display text-2xl text-foreground">Sermon not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            It may have been deleted, or it doesn't belong to your account.
          </p>
          <Link
            to="/workspace/sermons"
            className="mt-6 inline-flex items-center gap-2 text-sm text-gold hover:text-gold-soft"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sermons
          </Link>
        </div>
      </AppShell>
    );
  }

  const outlineDone = Boolean(theme.trim() || scriptureRef.trim());
  const manuscriptDone = manuscript.trim().length >= 80;
  const reviseDone = (sermon.current_version ?? 1) > 1;

  return (
    <AppShell pageTitle="Sermon">
      <div className="xl:flex xl:gap-6 xl:max-w-7xl xl:mx-auto xl:px-6">
        <div className="mx-auto max-w-3xl px-6 py-10 xl:px-0 xl:flex-1">
          {/* Header strip — back link, status meta, and progress beats together. */}
          <div className="mb-6 rounded-xl border border-gold/15 bg-obsidian-elevated/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/workspace/sermons"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Sermons
              </Link>
              <span className="text-[10px] uppercase tracking-[0.28em] text-gold/60">
                {sermon.status} · v{sermon.current_version} · updated{" "}
                {new Date(sermon.updated_at).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-3">
              <ComposerProgress
                outlineDone={outlineDone}
                manuscriptDone={manuscriptDone}
                reviseDone={reviseDone}
              />
            </div>
          </div>

          <header className="mb-6">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              className="w-full bg-transparent font-display text-3xl text-foreground outline-none border-b border-transparent focus:border-gold/30"
              placeholder="Sermon title"
              aria-label="Sermon title"
            />
          </header>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-[0.28em] text-gold/70">
                Theme
              </label>
              <input
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  setDirty(true);
                }}
                placeholder="What is this sermon about?"
                className="w-full rounded-lg border border-gold/20 bg-obsidian/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/40"
                aria-label="What is this sermon about?"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-[0.28em] text-gold/70">
                Scripture reference
              </label>
              <input
                value={scriptureRef}
                onChange={(e) => {
                  setScriptureRef(e.target.value);
                  setDirty(true);
                }}
                placeholder="e.g. Romans 8:28"
                className="w-full rounded-lg border border-gold/20 bg-obsidian/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/40"
                aria-label="e.g. Romans 8:28"
              />
            </div>
          </div>

          <div className="relative rounded-xl border border-gold/15 bg-obsidian-elevated/40 p-6 mb-5">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="block text-[10px] uppercase tracking-[0.28em] text-gold/70">
                Manuscript
              </label>
              <div className="flex items-center gap-2">
                {!manuscript.trim() && (theme.trim() || scriptureRef.trim()) && (
                  <button
                    type="button"
                    onClick={generateFirstDraft}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-[11px] font-medium text-obsidian hover:bg-gold-soft disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    {generating ? "Drafting…" : "Generate first draft"}
                  </button>
                )}
                <div className="inline-flex rounded-md border border-gold/20 overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setViewMode("edit")}
                    aria-pressed={viewMode === "edit"}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === "edit" ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-gold active:bg-gold/10"}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("read")}
                    aria-pressed={viewMode === "read"}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === "read" ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-gold active:bg-gold/10"}`}
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Read
                  </button>
                </div>
              </div>
            </div>
            {viewMode === "edit" ? (
              <textarea
                value={manuscript}
                onChange={(e) => {
                  setManuscript(e.target.value);
                  setDirty(true);
                }}
                rows={28}
                placeholder={
                  generating ? "Selah is composing your draft…" : "Your sermon manuscript…"
                }
                disabled={generating}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none resize-y leading-relaxed disabled:opacity-50"
              />
            ) : (
              <ScriptureLinkified
                text={manuscript}
                className="font-serif text-base text-foreground/90 leading-relaxed min-h-[20rem]"
              />
            )}
            {generating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-obsidian/92 backdrop-blur-md">
                <div className="flex flex-col items-center gap-4 text-center px-6 max-w-sm">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-gold/20" />
                    <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-gold animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-gold animate-pulse" />
                  </div>
                  <p className="font-display text-base text-gold">Composing your first draft</p>
                  <ol className="w-full space-y-1.5 text-left">
                    {(
                      [
                        ["outline", "Drafting outline"],
                        ["manuscript", "Writing manuscript"],
                        ["finalizing", "Saving draft"],
                      ] as const
                    ).map(([stage, label]) => {
                      const order = { outline: 0, manuscript: 1, finalizing: 2 } as const;
                      const current = generationStage ? order[generationStage] : 0;
                      const idx = order[stage];
                      const state = idx < current ? "done" : idx === current ? "active" : "pending";
                      return (
                        <li
                          key={stage}
                          className={`flex items-center gap-2 text-[12px] ${
                            state === "done"
                              ? "text-gold-soft"
                              : state === "active"
                                ? "text-gold"
                                : "text-muted-foreground/50"
                          }`}
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                              state === "done"
                                ? "border-gold-soft bg-gold-soft/20"
                                : state === "active"
                                  ? "border-gold animate-pulse"
                                  : "border-muted-foreground/30"
                            }`}
                          >
                            {state === "done" ? "✓" : state === "active" ? "•" : ""}
                          </span>
                          {label}
                          {state === "active" && <span className="text-gold/70">…</span>}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="w-full h-1 overflow-hidden rounded-full bg-gold/10">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent animate-[shimmer_1.6s_ease-in-out_infinite]" />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">
                    This usually takes 20–40 seconds. Don't refresh.
                  </p>
                </div>
              </div>
            )}
            {!generating && generationError && !manuscript.trim() && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-[12px] text-destructive/90">
                  <span className="font-medium">Generation failed.</span> {generationError}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Your theme and scripture are preserved. Try again when you're ready.
                </p>
                <button
                  type="button"
                  onClick={generateFirstDraft}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-[11px] font-medium text-obsidian hover:bg-gold-soft transition-colors"
                >
                  <Sparkles className="h-3 w-3" /> Retry generation
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/5"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button
              onClick={handleSharePdf}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/5"
            >
              <Share2 className="h-3.5 w-3.5" /> Share PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2 text-sm font-medium text-obsidian hover:bg-gold-soft disabled:opacity-40"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>

        <SermonCompanionPanel
          sermonId={sermon.id}
          userId={user.id}
          manuscript={manuscript}
          historyKey={historyKey}
          saving={saving}
          onBeforeApply={async () => {
            await snapshotVersion(manuscript, "Pre-revision snapshot");
          }}
          onApply={(next, lensLabel) => {
            setManuscript(next);
            setDirty(true);
            void snapshotVersion(next, `${lensLabel} (AI revision)`);
          }}
          onRestore={(text, versionNumber) => {
            setManuscript(text);
            setDirty(true);
            toast.success(`Restored v${versionNumber}.`);
          }}
          onInsertIntoManuscript={(text) => {
            setManuscript((prev) =>
              prev.endsWith("\n") || !prev ? prev + text.trimStart() : prev + text,
            );
            setDirty(true);
          }}
        />
      </div>
    </AppShell>
  );
}

/* ──────────────────────────────────────────────────────────
   ComposerProgress — three-step Outline → Manuscript → Revise
   indicator. Each beat lights bronze when its stage is reached.
   ────────────────────────────────────────────────────────── */
function ComposerProgress({
  outlineDone,
  manuscriptDone,
  reviseDone,
}: {
  outlineDone: boolean;
  manuscriptDone: boolean;
  reviseDone: boolean;
}) {
  const steps = [
    { label: "Outline", done: outlineDone },
    { label: "Manuscript", done: manuscriptDone },
    { label: "Revise", done: reviseDone },
  ] as const;

  const reached = steps.filter((s) => s.done).length;

  return (
    <ol
      aria-label={`Sermon progress: ${reached} of 3 stages reached`}
      className="flex items-center gap-3"
    >
      {steps.map((step, i) => (
        <li key={step.label} className="flex flex-1 items-center gap-2">
          <span
            aria-hidden
            className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-500 ${
              step.done ? "bg-gold shadow-[0_0_12px_rgba(201,168,76,0.7)]" : "bg-gold/15"
            }`}
          />
          <span
            className={`text-[11px] font-medium uppercase tracking-[0.22em] transition-colors ${
              step.done ? "text-gold" : "text-muted-foreground/70"
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={`ml-1 h-px flex-1 transition-colors ${
                step.done ? "bg-gradient-to-r from-gold/60 to-gold/15" : "bg-gold/10"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
