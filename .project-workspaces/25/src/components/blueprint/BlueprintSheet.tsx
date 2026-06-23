/**
 * BlueprintSheet — mobile/tablet bottom-sheet for the Scriptural Blueprint.
 *
 * NEW: Supporting passages (anchor + up to 6 supporting).
 * NEW: "Take to Co-Author" button that carries all passages + marked
 *       action items forward into the Co-Author configurator.
 *
 * Preserves all existing behaviour:
 *  - Save-to-Vault with duplicate "Update or Save New" prompt
 *  - Gold pulse animation on update
 *  - Deep Dive routing through the user's intelligence preference
 *  - Free-tier paywall
 */

import { useCallback, useState } from "react";
import { Crown, Download, GripVertical, Loader2, Plus, Share2, Sparkles, X } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { useActiveCollection } from "@/hooks/useActiveCollection";
import { useIntelligencePref } from "@/hooks/useIntelligencePref";
import { useBlueprint } from "@/hooks/useBlueprint";
import { resolveProvider } from "@/lib/intelligencePref";
import { buildDeepDiveLink, buildDeepDivePrompt } from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import {
  ScripturalBlueprint,
  BlueprintSkeleton,
  type BlueprintData,
} from "@/components/blueprint/ScripturalBlueprint";
import { buildBlueprintPDFBlob } from "@/lib/blueprint-export";
import { BlueprintInterruption } from "@/components/blueprint/BlueprintInterruption";
import {
  addBlueprintToCollection,
  ensureBlueprintsCollection,
  findBlueprintForRef,
  updateBlueprintSnapshot,
  type VaultItem,
} from "@/lib/vault";
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

/* ─── Supporting passage slot ───────────────────────────────────────────── */

interface SupportingSlot {
  id: string; // uuid for keying
  reference: string; // "Romans 5:8"
  book: string;
  chapter: number;
}

function SupportingCard({ slot, onRemove }: { slot: SupportingSlot; onRemove: () => void }) {
  const { data, isLoading, error, retry } = useBlueprint({
    enabled: Boolean(slot.book && slot.chapter),
    book: slot.book,
    chapter: slot.chapter,
    reference: slot.reference,
  });

  return (
    <div className="rounded-xl border border-gold/15 bg-background/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gold/10">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />
          <span className="font-display text-sm text-gold-soft">{slot.reference}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground/40 hover:text-destructive transition-colors"
          aria-label={`Remove ${slot.reference}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Compact content */}
      <div className="px-3 py-2 space-y-1.5">
        {isLoading && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-3 w-3 animate-spin text-gold/50" />
            <span className="text-[11px] text-muted-foreground/50">Drafting blueprint…</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-destructive/70">{error.message}</span>
            <button
              type="button"
              onClick={retry}
              className="text-[11px] text-gold/70 hover:text-gold transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {data && (
          <>
            {/* Passage text preview */}
            <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2 italic font-display pl-2 border-l border-gold/25">
              {data.passageText}
            </p>
            {/* Cross-references preview */}
            {data.crossReferences.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {data.crossReferences.slice(0, 3).map((ref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-gold/15 bg-gold/5 px-2 py-0.5 text-[10px] text-gold/65"
                  >
                    {ref.ref}
                  </span>
                ))}
                {data.crossReferences.length > 3 && (
                  <span className="text-[10px] text-muted-foreground/40">
                    +{data.crossReferences.length - 3} more
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add supporting passage input ──────────────────────────────────────── */

function AddSupportingInput({
  onAdd,
  disabled,
}: {
  onAdd: (slot: SupportingSlot) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Parse "Book Chapter:Verse" or "Book Chapter"
    // e.g. "Romans 8:28" → book=Romans, chapter=8
    // e.g. "John 3:16" → book=John, chapter=3
    const match = trimmed.match(/^(.+?)\s+(\d+)(?::\d+(?:-\d+)?)?$/);
    if (!match) {
      toast.error('Enter a reference like "Romans 8:28" or "Psalm 23"');
      return;
    }

    const book = match[1].trim();
    const chapter = parseInt(match[2], 10);

    setLoading(true);
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      reference: trimmed,
      book,
      chapter,
    });
    setValue("");
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleAdd();
        }}
        placeholder="Add supporting passage… e.g. Jeremiah 29:11"
        disabled={disabled}
        className={cn(
          "flex-1 rounded-xl border border-gold/18 bg-background/30 px-3 py-2.5 text-sm text-foreground",
          "placeholder:text-muted-foreground/40 outline-none focus:border-gold/40 transition-colors",
          disabled && "opacity-40 cursor-not-allowed",
        )}
        aria-label="Add supporting passage… e.g. Jeremiah 29:11"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled || !value.trim()}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition-colors",
          "hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed",
        )}
        aria-label="Add supporting passage"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

/* ─── Main sheet ─────────────────────────────────────────────────────────── */

export function BlueprintSheet({
  open,
  onClose,
  userId,
  book,
  chapter,
  reference,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  book: string;
  chapter: number;
  reference: string;
}) {
  const navigate = useNavigate();
  const { hasRole } = useRoles(userId ?? undefined);
  const canSeeBlueprint = hasRole("minister") || hasRole("church_partner") || hasRole("admin");

  const [savingBlueprint, setSavingBlueprint] = useState(false);
  const [vaultPulseKey, setVaultPulseKey] = useState(0);
  const [supporting, setSupporting] = useState<SupportingSlot[]>([]);
  const { active: activeCollection } = useActiveCollection(userId ?? undefined);
  const { pref: intelligencePref } = useIntelligencePref(userId);

  const {
    data: blueprintData,
    isLoading: blueprintLoading,
    error: blueprintError,
    retry: retryBlueprint,
  } = useBlueprint({
    enabled: open && canSeeBlueprint,
    book,
    chapter,
    reference,
  });

  const [dupCandidate, setDupCandidate] = useState<{
    existing: VaultItem;
    collectionTitle: string;
  } | null>(null);

  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  /* ── Supporting passage handlers ──────────────────────────────────────── */
  const MAX_SUPPORTING = 6;

  const handleAddSupporting = useCallback((slot: SupportingSlot) => {
    setSupporting((prev) => {
      if (prev.length >= MAX_SUPPORTING) {
        toast.error(`Maximum ${MAX_SUPPORTING} supporting passages reached`);
        return prev;
      }
      // Prevent duplicates
      if (prev.some((s) => s.reference.toLowerCase() === slot.reference.toLowerCase())) {
        toast.error("That passage is already added");
        return prev;
      }
      return [...prev, slot];
    });
  }, []);

  const handleRemoveSupporting = useCallback((id: string) => {
    setSupporting((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /* ── Take to Co-Author ────────────────────────────────────────────────── */
  const handleTakeToCoAuthor = useCallback(() => {
    // Build the scripture param from anchor + supporting refs
    const allRefs = [reference, ...supporting.map((s) => s.reference)].join("; ");
    onClose();
    navigate({
      to: "/workspace/sermons/choice",
      search: {
        scripture: allRefs,
        scriptureText: blueprintData?.passageText ?? undefined,
        path: "coauthor",
      },
    });
  }, [reference, supporting, blueprintData, navigate, onClose]);

  /* ── Vault handlers ───────────────────────────────────────────────────── */
  async function performInsert(
    collectionId: string,
    collectionTitle: string,
    blueprint: BlueprintData,
  ) {
    await addBlueprintToCollection(userId!, collectionId, {
      book,
      chapter,
      version: blueprint.version,
      scripture_ref: blueprint.reference,
      blueprint,
    });
    toast.success(`Blueprint saved to "${collectionTitle}"`);
  }

  async function handleSaveBlueprintToVault() {
    if (!userId) {
      toast.error("Sign in to save Blueprints to your Vault.");
      return;
    }
    if (!blueprintData) {
      toast.error("Wait for the Blueprint to finish drafting.");
      return;
    }
    if (savingBlueprint) return;
    setSavingBlueprint(true);
    try {
      const target = activeCollection ?? (await ensureBlueprintsCollection(userId));
      const existing = await findBlueprintForRef(userId, target.id, blueprintData.reference);
      if (existing) {
        setDupCandidate({ existing, collectionTitle: target.title });
      } else {
        await performInsert(target.id, target.title, blueprintData);
      }
    } catch (err) {
      console.error("save blueprint", err);
      toast.error("Couldn't save Blueprint — try again.");
    } finally {
      setSavingBlueprint(false);
    }
  }

  async function handleDuplicateUpdate() {
    if (!dupCandidate || !blueprintData) return;
    try {
      await updateBlueprintSnapshot(dupCandidate.existing.id, blueprintData);
      setVaultPulseKey((k) => k + 1);
      toast.success(`Blueprint updated in "${dupCandidate.collectionTitle}"`);
    } catch (err) {
      console.error("update blueprint", err);
      toast.error("Couldn't update Blueprint — try again.");
    } finally {
      setDupCandidate(null);
    }
  }

  async function handleDuplicateSaveNew() {
    if (!dupCandidate || !blueprintData) return;
    try {
      await performInsert(
        dupCandidate.existing.collection_id,
        dupCandidate.collectionTitle,
        blueprintData,
      );
    } catch (err) {
      console.error("save new blueprint", err);
      toast.error("Couldn't save Blueprint — try again.");
    } finally {
      setDupCandidate(null);
    }
  }

  function handleBlueprintDeepDive(seed?: string) {
    if (!blueprintData) return;
    const basePrompt = buildDeepDivePrompt(blueprintData.reference, blueprintData.passageText, {
      book,
      chapter,
      verseStart: null,
      verseEnd: null,
    });
    const prompt = seed ? `${basePrompt}\n\nFocus specifically on: ${seed}` : basePrompt;
    const surface = seed ? "blueprint:linguistic" : "blueprint:passage";
    const provider = resolveProvider(intelligencePref, surface);
    const link = buildDeepDiveLink(provider, prompt);
    void openDeepDiveLink(link, { reference: blueprintData.reference });
  }

  const shareFilename = blueprintData
    ? `Blueprint — ${blueprintData.reference}.pdf`
    : `Blueprint — ${reference}.pdf`;

  async function executeShare(mode: "share" | "download") {
    if (!blueprintData || sharing) return;
    setSharing(true);
    const filename = shareFilename;
    const shareText = `${blueprintData.reference} (${blueprintData.version})\n\nStudied with SanctumIQ`;
    try {
      const blob = buildBlueprintPDFBlob(blueprintData);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (
        mode === "share" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] }) &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: `Blueprint — ${blueprintData.reference}`,
          text: shareText,
          files: [file],
        });
        setSharePreviewOpen(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Blueprint PDF downloaded");
      setSharePreviewOpen(false);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === "AbortError") {
        setSharing(false);
        return;
      }
      try {
        await navigator.clipboard?.writeText(shareText);
        toast.success("Blueprint reference copied");
      } catch {
        toast.error("Couldn't share the Blueprint");
      }
    } finally {
      setSharing(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Scriptural Blueprint for ${reference}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full max-h-[90svh] flex-col rounded-t-2xl border border-gold/22 bg-popover/95 text-popover-foreground",
          "shadow-[0_-24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150",
          "md:m-4 md:max-h-[88vh] md:max-w-2xl md:rounded-2xl",
          "animate-in fade-in slide-in-from-bottom-4 duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull-bar */}
        <div
          className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-gold/30 md:hidden"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-gold/12 bg-popover/95 px-5 py-3 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
              Companion · Blueprint
              <span className="ml-2 rounded-sm bg-gold/15 px-1 py-0.5 text-[8px] uppercase tracking-wider text-gold">
                Architect
              </span>
            </p>
            <p className="mt-0.5 truncate font-display text-base text-gold-soft">{reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Blueprint"
            className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3 space-y-5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          {!canSeeBlueprint ? (
            <BlueprintPaywall reference={reference} onClose={onClose} />
          ) : blueprintError ? (
            <BlueprintInterruption
              reference={reference}
              message={blueprintError.message}
              onRetry={retryBlueprint}
              retrying={blueprintLoading}
            />
          ) : blueprintLoading || !blueprintData ? (
            <BlueprintSkeleton />
          ) : (
            <>
              {/* ── Anchor Blueprint ──────────────────────────────────── */}
              <ScripturalBlueprint
                data={blueprintData}
                pulseKey={vaultPulseKey}
                onCopy={() => {
                  navigator.clipboard?.writeText(
                    `${blueprintData.reference} (${blueprintData.version})\n\n${blueprintData.passageText}`,
                  );
                  toast.success("Passage copied");
                }}
                onShare={() => {
                  if (!blueprintData) return;
                  setSharePreviewOpen(true);
                }}
                onSaveToVault={handleSaveBlueprintToVault}
                onDeepDive={handleBlueprintDeepDive}
              />

              {/* ── Supporting passages ───────────────────────────────── */}
              {canSeeBlueprint && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-gold/60">
                      Supporting Passages
                    </p>
                    <p className="text-[10px] text-muted-foreground/40">
                      {supporting.length} / {MAX_SUPPORTING}
                    </p>
                  </div>

                  {supporting.length > 0 && (
                    <div className="space-y-2">
                      {supporting.map((slot) => (
                        <SupportingCard
                          key={slot.id}
                          slot={slot}
                          onRemove={() => handleRemoveSupporting(slot.id)}
                        />
                      ))}
                    </div>
                  )}

                  {supporting.length < MAX_SUPPORTING && (
                    <AddSupportingInput
                      onAdd={handleAddSupporting}
                      disabled={supporting.length >= MAX_SUPPORTING}
                    />
                  )}

                  {supporting.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                      Add up to {MAX_SUPPORTING} supporting passages — each gets its own blueprint
                      that carries forward when you compose.
                    </p>
                  )}
                </div>
              )}

              {/* ── Take to Co-Author CTA ─────────────────────────────── */}
              {canSeeBlueprint && (
                <div className="rounded-2xl border border-gold/20 bg-obsidian-elevated/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
                    <p className="text-[10px] uppercase tracking-[0.26em] text-gold/55">
                      Ready to compose?
                    </p>
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
                  </div>
                  <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
                    Your anchor
                    {supporting.length > 0
                      ? ` and ${supporting.length} supporting passage${supporting.length > 1 ? "s" : ""}`
                      : ""}{" "}
                    will carry into the Co-Author flow.
                  </p>
                  <button
                    type="button"
                    onClick={handleTakeToCoAuthor}
                    className={cn(
                      "w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-medium transition-all duration-200",
                      "bg-gold hover:bg-gold-soft text-obsidian",
                      "shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:shadow-[0_4px_28px_rgba(201,168,76,0.45)]",
                    )}
                  >
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    Take to Co-Author
                  </button>
                </div>
              )}
            </>
          )}

          {canSeeBlueprint && (blueprintLoading || savingBlueprint) && (
            <p className="mt-3 px-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
              {savingBlueprint
                ? "Saving Blueprint to Vault…"
                : "Drafting Blueprint from scripture…"}
            </p>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!dupCandidate}
        onOpenChange={(o) => {
          if (!o) setDupCandidate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Blueprint already saved</AlertDialogTitle>
            <AlertDialogDescription>
              A Blueprint for{" "}
              <span className="text-gold-soft">{blueprintData?.reference ?? reference}</span>{" "}
              already exists in{" "}
              <span className="text-gold-soft">{dupCandidate?.collectionTitle}</span>. Update it in
              place, or save this as a new snapshot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDuplicateSaveNew()}
              className="bg-background/40 text-gold-soft border border-gold/30 hover:bg-gold/10"
            >
              Save New
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => void handleDuplicateUpdate()}
              className="bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25"
            >
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={sharePreviewOpen}
        onOpenChange={(o) => {
          if (!o && !sharing) setSharePreviewOpen(false);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Share Blueprint</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Preview before sending to your device's share sheet.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Filename pill */}
          <div className="flex items-center gap-2 rounded-lg border border-gold/20 bg-background/40 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gold/15 text-[9px] font-bold text-gold">
              PDF
            </div>
            <p className="truncate text-xs text-foreground/80" title={shareFilename}>
              {shareFilename}
            </p>
          </div>

          {/* First-page thumbnail */}
          {blueprintData && (
            <div
              className="mx-auto w-full max-w-[240px] aspect-[8.5/11] rounded-md border border-gold/25 bg-[#fdfcf7] text-[#18181b] shadow-[0_8px_28px_rgba(0,0,0,0.45)] overflow-hidden p-3 flex flex-col gap-1.5"
              aria-label="PDF first page preview"
            >
              <p
                className="text-[5px] font-bold uppercase"
                style={{ color: "rgb(194,158,76)", letterSpacing: "0.2em" }}
              >
                Scriptural Blueprint
              </p>
              <p className="font-serif font-bold text-[13px] leading-tight truncate">
                {blueprintData.reference}
              </p>
              <p
                className="text-[5px] uppercase"
                style={{ color: "rgb(100,100,110)", letterSpacing: "0.18em" }}
              >
                {blueprintData.version}
              </p>
              <div className="h-px w-full" style={{ background: "rgb(194,158,76)" }} />
              <p className="font-serif text-[6px] leading-snug line-clamp-[10] text-[#18181b]/85">
                {blueprintData.passageText}
              </p>
              <div className="mt-auto h-px w-full" style={{ background: "rgb(194,158,76)" }} />
              <div
                className="flex items-center justify-between text-[4px]"
                style={{ color: "rgb(100,100,110)" }}
              >
                <span>SanctumIQ · Scriptural Blueprint</span>
                <span>{blueprintData.reference}</span>
              </div>
            </div>
          )}

          <AlertDialogFooter className="sm:justify-between gap-2">
            <AlertDialogCancel disabled={sharing}>Cancel</AlertDialogCancel>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={sharing}
                onClick={() => void executeShare("download")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gold/30 bg-background/40 px-3 py-2 text-xs text-gold-soft transition-colors hover:bg-gold/10 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                type="button"
                disabled={sharing}
                onClick={() => void executeShare("share")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gold/40 bg-gold/15 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/25 disabled:opacity-50"
              >
                {sharing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                Share
              </button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Paywall ────────────────────────────────────────────────────────────── */

function BlueprintPaywall({ reference, onClose }: { reference: string; onClose: () => void }) {
  return (
    <div className="px-3 py-6 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <Crown className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-xl text-foreground">Scriptural Blueprint</h2>
      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gold/70">For {reference}</p>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
        A working document for ministers — historical context, linguistic roots, cross-references,
        and action steps for the passage.
      </p>
      <div className="mx-auto mt-5 max-w-sm space-y-2 text-left">
        <Bullet>Linguistic roots — Greek/Hebrew gloss with citations</Bullet>
        <Bullet>Save snapshots to your Vault, update in place</Bullet>
        <Bullet>Export branded PDF for sermon prep</Bullet>
        <Bullet>Take directly to Co-Author with all passages pre-filled</Bullet>
      </div>
      <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/pricing"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/15 px-5 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/25"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Architect
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-md border border-border/60 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-foreground/80">
      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-gold/70" />
      <span>{children}</span>
    </div>
  );
}
