import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadBible } from "@/lib/scripture";
import { deleteItem, updateItemNote, type VaultItem } from "@/lib/vault";
import {
  ScripturalBlueprint,
  type BlueprintData,
} from "@/components/blueprint/ScripturalBlueprint";
import { cn } from "@/lib/utils";

/**
 * VaultItemSheet — open a single saved Vault item to view its quote,
 * edit your note, jump to that verse in the Reader, or remove it.
 *
 * Auto-saves the note on blur (and exposes a Save button for clarity).
 */
export function VaultItemSheet({
  item,
  open,
  onOpenChange,
  onRemoved,
  onUpdated,
}: {
  item: VaultItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: (id: string) => void;
  onUpdated?: (id: string, patch: Partial<VaultItem>) => void;
}) {
  const [note, setNote] = useState(item?.note_text ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [bookIndex, setBookIndex] = useState<number | null>(null);

  useEffect(() => {
    setNote(item?.note_text ?? "");
  }, [item?.id, item?.note_text]);

  // Resolve book name → bookIndex for the Reader link.
  useEffect(() => {
    if (!item?.book) {
      setBookIndex(null);
      return;
    }
    let alive = true;
    loadBible()
      .then((bible) => {
        if (!alive) return;
        const idx = bible.books.findIndex((b) => b.name === item.book);
        setBookIndex(idx >= 0 ? idx : null);
      })
      .catch(() => {
        if (alive) setBookIndex(null);
      });
    return () => {
      alive = false;
    };
  }, [item?.book]);

  if (!item) return null;

  const dirty = (note.trim() || null) !== (item.note_text ?? null);

  const saveNote = async () => {
    if (!dirty) return;
    setSaving(true);
    const next = note.trim() || null;
    try {
      await updateItemNote(item.id, next);
      onUpdated?.(item.id, { note_text: next });
    } catch {
      toast.error("Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove this item from the Collection?")) return;
    setRemoving(true);
    try {
      await deleteItem(item.id);
      onRemoved?.(item.id);
      onOpenChange(false);
      toast("Removed from Vault");
    } catch {
      toast.error("Could not remove.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-t border-gold/18 bg-[rgba(20,20,20,0.92)] backdrop-blur-2xl backdrop-saturate-150 p-0 max-h-[85svh] flex flex-col rounded-t-2xl"
      >
        {/* Drag handle */}
        <div
          className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-gold/30"
          aria-hidden
        />

        <SheetHeader className="px-5 py-3 border-b border-gold/12">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <SheetTitle className="font-display text-base text-gold-soft truncate">
                {item.scripture_ref ?? "Saved item"}
              </SheetTitle>
              {item.version && (
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  {item.version}
                </p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-gold/10 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          {/* Blueprint items: parse JSON from note_text and render the full card */}
          {item.item_type === "blueprint" && item.note_text ? (
            <BlueprintBodyFromNote noteText={item.note_text} />
          ) : (
            <>
              {item.quote_text && (
                <blockquote className="border-l-2 border-gold/40 pl-4 italic text-foreground/85 leading-relaxed">
                  "{item.quote_text}"
                </blockquote>
              )}

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gold/70">Your Note</p>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-[0.22em] transition-opacity",
                      saving ? "text-muted-foreground/60 opacity-100" : "opacity-0",
                    )}
                    aria-live="polite"
                  >
                    Saving…
                  </span>
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                  placeholder="Why does this verse matter to your study?"
                  className="min-h-[120px] resize-none border-border/40 bg-obsidian-elevated/30"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="text-destructive hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-1.5">Remove</span>
            </Button>

            {bookIndex !== null && item.chapter && item.verse_start ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-gold/30 text-gold-soft hover:bg-gold/10"
                onClick={() => {
                  void saveNote();
                  onOpenChange(false);
                }}
              >
                <Link
                  to="/reader"
                  search={{
                    bookIndex,
                    chapter: item.chapter,
                    verse: item.verse_start,
                    vault: item.id,
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="ml-1.5">Open in Reader</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Blueprint body renderer ───────────────────────────────────────────── */
function BlueprintBodyFromNote({ noteText }: { noteText: string }) {
  try {
    const data = JSON.parse(noteText) as BlueprintData;
    if (!data?.reference) throw new Error("Invalid blueprint data");
    return (
      <ScripturalBlueprint
        data={data}
        onCopy={() => {
          navigator.clipboard?.writeText(
            `${data.reference} (${data.version})\n\n${data.passageText}`,
          );
        }}
      />
    );
  } catch {
    return (
      <p className="text-sm text-muted-foreground/60 italic">Blueprint data could not be loaded.</p>
    );
  }
}
