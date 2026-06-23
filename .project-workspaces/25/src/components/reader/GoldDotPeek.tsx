/**
 * GoldDotPeek — glassmorphic popover showing the user's last 3 reading
 * locations plus saved "Resume later" pins. Tap the gold dot to open it;
 * tap any row to jump.
 */

import { useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, Crosshair, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReaderPositionHistory } from "@/hooks/useReaderPositionHistory";
import { listResumeLater, removeResumeLater, type ResumeLaterPin } from "@/lib/resume-later";

export function GoldDotPeek({
  open,
  onClose,
  onJump,
  resumeLabel,
  onResume,
  onSaveResumeLater,
  canSaveResumeLater = true,
}: {
  open: boolean;
  onClose: () => void;
  onJump: (entry: {
    bookIndex: number;
    book: string;
    chapter: number;
    verse: number | null;
    version?: string;
  }) => void;
  resumeLabel: string;
  onResume: () => void;
  onSaveResumeLater?: () => void;
  canSaveResumeLater?: boolean;
}) {
  const { entries, loading, refresh } = useReaderPositionHistory(3);
  const [pins, setPins] = useState<ResumeLaterPin[]>([]);

  useEffect(() => {
    if (open) {
      void refresh();
      setPins(listResumeLater());
    }
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleRemovePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeResumeLater(id);
    setPins(listResumeLater());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recent reading locations"
      className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/55 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-t-2xl border border-gold/22 bg-[rgba(18,18,18,0.86)] shadow-[0_-24px_80px_rgba(0,0,0,0.55)]",
          "backdrop-blur-2xl backdrop-saturate-150",
          "md:m-4 md:rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gold/12 px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Recent</p>
            <p className="mt-0.5 truncate font-display text-base text-gold-soft">
              Where you've been
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="space-y-2 px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          {/* Pinned resume row */}
          <button
            type="button"
            onClick={() => {
              onResume();
              onClose();
            }}
            className="block w-full rounded-2xl border border-gold/30 bg-gold/8 px-4 py-3 text-left transition-colors hover:bg-gold/14"
          >
            <div className="flex items-center gap-2">
              <Crosshair className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Resume</p>
            </div>
            <p className="mt-1 font-display text-sm text-gold-soft">{resumeLabel}</p>
          </button>

          {/* Save current spot */}
          {onSaveResumeLater && canSaveResumeLater ? (
            <button
              type="button"
              onClick={() => {
                onSaveResumeLater();
                setPins(listResumeLater());
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gold/22 bg-background/8 px-4 py-2.5 text-left transition-colors hover:border-gold/40 hover:bg-gold/8"
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
              <span className="text-[11px] uppercase tracking-[0.18em] text-gold/85">
                Resume later — save this spot
              </span>
            </button>
          ) : null}

          {/* Saved Resume-Later pins */}
          {pins.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <p className="px-1 text-[10px] uppercase tracking-[0.22em] text-gold/55">
                Saved spots
              </p>
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  className="group flex items-stretch gap-1 rounded-2xl border border-gold/16 bg-background/14 transition-colors hover:border-gold/28 hover:bg-gold/6"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onJump({
                        bookIndex: pin.bookIndex,
                        book: pin.book,
                        chapter: pin.chapter,
                        verse: pin.verse,
                        version: pin.version,
                      });
                      onClose();
                    }}
                    className="flex flex-1 items-center gap-2 px-4 py-2.5 text-left"
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0 text-gold/80" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm text-gold-soft">
                        {pin.label}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                        {pin.version} · saved {formatRelative(pin.savedAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRemovePin(pin.id, e)}
                    aria-label={`Remove ${pin.label}`}
                    className="inline-flex w-9 shrink-0 items-center justify-center rounded-r-2xl text-muted-foreground/60 opacity-0 transition-opacity hover:text-gold-soft group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* History */}
          {loading && entries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gold/14 bg-background/12 px-4 py-5 text-center text-xs leading-relaxed text-muted-foreground">
              Gathering your steps…
            </p>
          ) : entries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gold/14 bg-background/12 px-4 py-5 text-center text-xs leading-relaxed text-muted-foreground">
              Your trail will fill in as you read.
            </p>
          ) : (
            entries.map((entry, idx) => (
              <button
                key={`${entry.book}-${entry.chapter}-${entry.visitedAt}-${idx}`}
                type="button"
                onClick={() => {
                  onJump({
                    bookIndex: entry.bookIndex,
                    book: entry.book,
                    chapter: entry.chapter,
                    verse: entry.verse,
                  });
                  onClose();
                }}
                className="block w-full rounded-2xl border border-gold/12 bg-background/16 px-4 py-3 text-left transition-colors hover:border-gold/25 hover:bg-gold/6"
              >
                <p className="font-display text-sm text-gold-soft">
                  {entry.book} {entry.chapter}
                  {entry.verse ? `:${entry.verse}` : ""}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  {formatRelative(entry.visitedAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
