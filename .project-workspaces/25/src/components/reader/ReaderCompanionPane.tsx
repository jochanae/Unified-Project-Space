import { useEffect, useRef, useState } from "react";
import { NotebookPen, X, Check, Loader2, ExternalLink, Compass } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import {
  ScripturalBlueprint,
  BlueprintSkeleton,
  type BlueprintData,
} from "@/components/blueprint/ScripturalBlueprint";
import { BlueprintInterruption } from "@/components/blueprint/BlueprintInterruption";
import { useBlueprint } from "@/hooks/useBlueprint";
import { toast } from "sonner";
import { useActiveCollection } from "@/hooks/useActiveCollection";
import {
  addBlueprintToCollection,
  ensureBlueprintsCollection,
  findBlueprintForRef,
  updateBlueprintSnapshot,
  type VaultItem,
} from "@/lib/vault";
import { buildDeepDiveLink, buildDeepDivePrompt } from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import { useIntelligencePref } from "@/hooks/useIntelligencePref";
import { resolveProvider } from "@/lib/intelligencePref";
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

type SaveState = "idle" | "saving" | "saved";
type Tab = "notes" | "blueprint";

/**
 * ReaderCompanionPane — desktop-only (xl:) right-side companion.
 *
 * Houses two tabs:
 *  - Notes: per-chapter quick scratchpad, autosaved to `notes` table.
 *  - Blueprint (admin-only for now): the Scriptural Blueprint card,
 *    static shell wired to sample data. Gated by `admin` role until
 *    the AI hand-off + Minister/Church Partner unlock ships.
 */
export function ReaderCompanionPane({
  open,
  onClose,
  userId,
  book,
  chapter,
  reference,
  initialTab,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  book: string;
  chapter: number;
  reference: string;
  /** When provided, snaps the pane to this tab whenever it opens. */
  initialTab?: Tab;
}) {
  const { hasRole } = useRoles(userId ?? undefined);
  // Minister tier and up — opens the Blueprint to paid users.
  const canSeeBlueprint = hasRole("minister") || hasRole("church_partner") || hasRole("admin");

  const [tab, setTab] = useState<Tab>("notes");
  // If a non-admin somehow has tab=blueprint stored, snap them back to notes.
  useEffect(() => {
    if (tab === "blueprint" && !canSeeBlueprint) setTab("notes");
  }, [tab, canSeeBlueprint]);
  // Honor initialTab on each open so triggers like "Open Blueprint" land correctly.
  useEffect(() => {
    if (open && initialTab && (initialTab !== "blueprint" || canSeeBlueprint)) {
      setTab(initialTab);
    }
  }, [open, initialTab, canSeeBlueprint]);

  // ── Notes state ────────────────────────────────────────────────
  const [body, setBody] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loading, setLoading] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const scriptureRef = `${book} ${chapter}`;

  useEffect(() => {
    if (!open || !userId || tab !== "notes") return;
    let cancelled = false;
    setLoading(true);
    setSaveState("idle");
    void (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, body_text")
        .eq("user_id", userId)
        .eq("book", book)
        .eq("chapter", chapter)
        .is("verse", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setBody("");
        setNoteId(null);
      } else if (data) {
        setBody(data.body_text ?? "");
        setNoteId(data.id);
      } else {
        setBody("");
        setNoteId(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, book, chapter, tab]);

  useEffect(() => {
    if (!open || !userId || loading || tab !== "notes") return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        setSaveState("saving");
        if (noteId) {
          const { error } = await supabase
            .from("notes")
            .update({ body_text: body, updated_at: new Date().toISOString() })
            .eq("id", noteId)
            .eq("user_id", userId);
          if (!error) setSaveState("saved");
        } else if (body.trim().length > 0) {
          const { data, error } = await supabase
            .from("notes")
            .insert({
              user_id: userId,
              body_text: body,
              book,
              chapter,
              scripture_ref: scriptureRef,
            })
            .select("id")
            .single();
          if (!error && data) {
            setNoteId(data.id);
            setSaveState("saved");
          }
        } else {
          setSaveState("idle");
        }
      })();
    }, 600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [body, open, userId, noteId, book, chapter, scriptureRef, loading, tab]);

  // ── Blueprint data (real AI engine via useBlueprint) ───────────
  const [savingBlueprint, setSavingBlueprint] = useState(false);
  // Bumped after a successful in-place update so the card replays the gold pulse.
  const [vaultPulseKey, setVaultPulseKey] = useState(0);
  const { active: activeCollection } = useActiveCollection(userId ?? undefined);
  const { pref: intelligencePref } = useIntelligencePref(userId);

  const {
    data: blueprintData,
    isLoading: blueprintLoading,
    error: blueprintError,
    retry: retryBlueprint,
  } = useBlueprint({
    enabled: open && tab === "blueprint" && canSeeBlueprint,
    book,
    chapter,
    reference: scriptureRef,
  });

  // Duplicate-handling state for the "already saved" prompt.
  const [dupCandidate, setDupCandidate] = useState<{
    existing: VaultItem;
    collectionTitle: string;
  } | null>(null);

  async function performInsert(collectionId: string, collectionTitle: string) {
    if (!blueprintData) return;
    await addBlueprintToCollection(userId!, collectionId, {
      book,
      chapter,
      version: blueprintData.version,
      scripture_ref: blueprintData.reference,
      blueprint: blueprintData,
    });
    toast.success(`Blueprint saved to "${collectionTitle}"`);
  }

  async function handleSaveBlueprintToVault() {
    if (!userId) {
      toast.error("Sign in to save Blueprints to your Vault.");
      return;
    }
    if (!blueprintData) return;
    if (savingBlueprint) return;
    setSavingBlueprint(true);
    try {
      const target = activeCollection ?? (await ensureBlueprintsCollection(userId));
      const existing = await findBlueprintForRef(userId, target.id, blueprintData.reference);
      if (existing) {
        setDupCandidate({ existing, collectionTitle: target.title });
      } else {
        await performInsert(target.id, target.title);
      }
    } catch (err) {
      console.error("save blueprint", err);
      toast.error("Couldn't save Blueprint — try again.");
    } finally {
      setSavingBlueprint(false);
    }
  }

  async function handleDuplicateUpdate() {
    if (!dupCandidate) return;
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
    if (!dupCandidate) return;
    try {
      await performInsert(dupCandidate.existing.collection_id, dupCandidate.collectionTitle);
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
    // Linguistic chips pass a seed → route through the linguistic surface so
    // "Smart" sends them to Perplexity. Primary CTA uses the passage surface.
    const surface = seed ? "blueprint:linguistic" : "blueprint:passage";
    const provider = resolveProvider(intelligencePref, surface);
    const link = buildDeepDiveLink(provider, prompt);
    void openDeepDiveLink(link, { reference: blueprintData.reference });
  }

  if (!open) return null;

  return (
    <aside
      aria-label="Companion pane"
      className={cn(
        "fixed right-0 top-0 z-40 hidden h-dvh w-[380px] flex-col border-l border-gold/12 bg-card/92 backdrop-blur-xl xl:flex",
        "pt-[5rem]",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-gold/10 px-4 py-3">
        <div className="flex items-center gap-2 text-gold-soft min-w-0">
          {tab === "notes" ? (
            <NotebookPen className="h-4 w-4 shrink-0" />
          ) : (
            <Compass className="h-4 w-4 shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
              Companion · {tab === "notes" ? "Notes" : "Blueprint"}
            </span>
            <span className="text-sm font-medium text-foreground/90 truncate">{reference}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {tab === "notes" && (
            <Link
              to="/notes"
              aria-label="Open full notes workspace"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gold-soft transition-colors hover:bg-gold/10 hover:text-gold"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close companion pane"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gold-soft transition-colors hover:bg-gold/10 hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {canSeeBlueprint && (
        <div className="flex items-center gap-1 border-b border-gold/10 px-3 py-2">
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
            Notes
          </TabButton>
          <TabButton active={tab === "blueprint"} onClick={() => setTab("blueprint")}>
            Blueprint
            <span className="ml-1.5 rounded-sm bg-gold/15 px-1 py-0.5 text-[8px] uppercase tracking-wider text-gold">
              Architect
            </span>
          </TabButton>
        </div>
      )}

      {tab === "notes" ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!userId ? (
              <p className="text-sm text-muted-foreground">
                Sign in to take chapter notes that auto-save to your sanctuary.
              </p>
            ) : loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading note…
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setSaveState("idle");
                }}
                placeholder={`Quick thoughts on ${reference}…`}
                className="h-full min-h-[260px] w-full resize-none rounded-md border border-gold/10 bg-background/40 p-3 text-sm leading-relaxed text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            )}
          </div>
          <footer className="flex items-center justify-between border-t border-gold/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            <span>Auto-saved · {scriptureRef}</span>
            <span className="flex items-center gap-1.5">
              {saveState === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="h-3 w-3 text-gold" /> Saved
                </>
              )}
            </span>
          </footer>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {blueprintLoading ? (
            <BlueprintSkeleton />
          ) : blueprintError ? (
            <BlueprintInterruption
              reference={scriptureRef}
              message={blueprintError.message}
              onRetry={retryBlueprint}
            />
          ) : blueprintData ? (
            <ScripturalBlueprint
              data={blueprintData}
              pulseKey={vaultPulseKey}
              onCopy={() => {
                navigator.clipboard?.writeText(
                  `${blueprintData.reference} (${blueprintData.version})\n\n${blueprintData.passageText}`,
                );
                toast.success("Passage copied");
              }}
              onShare={() => toast.info("Share — wired in next pass")}
              onSaveToVault={handleSaveBlueprintToVault}
              onDeepDive={handleBlueprintDeepDive}
            />
          ) : (
            <BlueprintSkeleton />
          )}
          {savingBlueprint && (
            <p className="mt-3 px-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
              Saving Blueprint to Vault…
            </p>
          )}
        </div>
      )}

      <AlertDialog
        open={!!dupCandidate}
        onOpenChange={(open) => {
          if (!open) setDupCandidate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Blueprint already saved</AlertDialogTitle>
            <AlertDialogDescription>
              A Blueprint for{" "}
              <span className="text-gold-soft">{blueprintData?.reference ?? scriptureRef}</span>{" "}
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
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-gold/15 text-gold"
          : "text-muted-foreground hover:bg-gold/5 hover:text-gold-soft",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
