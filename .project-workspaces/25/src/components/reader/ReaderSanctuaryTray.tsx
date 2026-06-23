import { useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookOpenText,
  Clock3,
  Crosshair,
  Lock,
  Maximize2,
  Mic2,
  MoonStar,
  NotebookPen,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DeepDiveCustomInquiry } from "@/components/reader/DeepDiveCustomInquiry";
import type { DeepDiveContext } from "@/lib/deepDive";

type TrayTab = "bookmarks" | "history" | "search";

export function ReaderSanctuaryTray({
  open,
  onOpenChange,
  bookmarks,
  history,
  verses,
  book,
  chapter,
  focusMode,
  aggressivePrefetch,
  isAggressivePrefetchOverrideActive,
  showVerseDotHelp,
  immersive,
  onToggleImmersive,
  onToggleFocusMode,
  onToggleAggressivePrefetch,
  onDismissVerseDotHelp,
  onResetVerseDotHint,
  onJumpToVerse,
  onJumpToHistory,
  onOpenPicker,
  currentVerse,
  deepDiveProvider,
  deepDivePassageContext,
  deepDivePassageReference,
  onJumpToCurrent,
  onOpenNotes,
  onDeepDiveHandshake,
  onPrint,
  onOpenVault,
  serviceModeActive,
  onToggleServiceMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: number[];
  history: Array<{ book: string; chapter: number; verse: number | null }>;
  verses: string[];
  book: string;
  chapter: number;
  focusMode: boolean;
  aggressivePrefetch: boolean;
  isAggressivePrefetchOverrideActive: boolean;
  showVerseDotHelp: boolean;
  immersive: boolean;
  onToggleImmersive: () => void;
  onToggleFocusMode: () => void;
  onToggleAggressivePrefetch: () => void;
  onDismissVerseDotHelp: () => void;
  onResetVerseDotHint: () => void;
  onJumpToVerse: (verse: number) => void;
  onJumpToHistory: (entry: { book: string; chapter: number; verse: number | null }) => void;
  onOpenPicker: () => void;
  currentVerse: number | null;
  deepDiveProvider: string;
  deepDivePassageContext: DeepDiveContext;
  deepDivePassageReference: string;
  onJumpToCurrent: () => void;
  onOpenNotes: () => void;
  onDeepDiveHandshake: () => void;
  onPrint: () => void;
  onOpenVault: () => void;
  serviceModeActive: boolean;
  onToggleServiceMode: () => void;
}) {
  const [tab, setTab] = useState<TrayTab>("bookmarks");
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const dragStartXRef = useRef<number | null>(null);

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [] as Array<{ verse: number; text: string }>;
    return verses
      .map((text, index) => ({ verse: index + 1, text }))
      .filter(
        ({ text, verse }) =>
          text.toLowerCase().includes(trimmed) || `${chapter}:${verse}`.includes(trimmed),
      )
      .slice(0, 12);
  }, [chapter, query, verses]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id="sanctuary-tray"
        side="right"
        aria-label={`Sanctuary tray for ${book} ${chapter}`}
        style={{
          padding: 0,
          top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)",
          height: "calc(100dvh - env(safe-area-inset-top, 0px) - 3.5rem)",
          maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 3.5rem)",
        }}
        className="flex w-[88vw] flex-col overflow-hidden border-l border-t border-gold/18 bg-[rgba(14,14,14,0.78)] text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl backdrop-saturate-150 sm:max-w-md"
      >
        <SheetTitle className="sr-only">
          Sanctuary Tray — {book} {chapter}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Quick actions, bookmarks, history, and search for the current passage. Press Escape to
          close.
        </SheetDescription>

        {/* PINNED HEADER */}
        <div className="shrink-0 px-4 pt-3">
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Drag handle. Swipe right or press Escape to close the tray."
            className="mx-auto h-1.5 w-12 rounded-full bg-gold/22"
            onPointerDown={(event) => {
              dragStartXRef.current = event.clientX;
            }}
            onPointerMove={(event) => {
              if (dragStartXRef.current === null) return;
              if (event.clientX - dragStartXRef.current > 64) {
                dragStartXRef.current = null;
                onOpenChange(false);
              }
            }}
            onPointerUp={() => {
              dragStartXRef.current = null;
            }}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.28em] text-gold/70">Sanctuary</p>
              <p className="truncate font-display text-base text-gold-soft">
                {book} {chapter}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenPicker();
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/25 bg-gold/8 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/14"
            >
              <BookOpenText className="h-3.5 w-3.5" />
              Browse
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-full border border-gold/14 bg-background/20 p-1">
            {[
              { key: "bookmarks", label: "Marks", icon: Bookmark },
              { key: "history", label: "History", icon: Clock3 },
              { key: "search", label: "Search", icon: Search },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as TrayTab)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors",
                  tab === key
                    ? "bg-gold/14 text-gold-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SCROLLING CONTENT — everything below scrolls */}
        <ScrollArea className="mt-3 min-h-0 flex-1">
          <div className="px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            {/* Quick action grid */}
            <div className="grid grid-cols-3 gap-2 pb-3">
              <QuickAction
                icon={<Crosshair className="h-4 w-4" />}
                label="Jump"
                sublabel={currentVerse ? `v${currentVerse}` : "current"}
                onClick={() => {
                  onJumpToCurrent();
                  onOpenChange(false);
                }}
              />
              <QuickAction
                icon={<NotebookPen className="h-4 w-4" />}
                label="Notes"
                sublabel="Open"
                onClick={() => {
                  onOpenNotes();
                  onOpenChange(false);
                }}
              />
              <QuickAction
                icon={<Sparkles className="h-4 w-4" />}
                label="Deep Dive"
                sublabel={deepDiveProvider}
                onClick={() => {
                  onDeepDiveHandshake();
                  onOpenChange(false);
                }}
              />
              <QuickAction
                icon={<Printer className="h-4 w-4" />}
                label="Print"
                sublabel="PDF"
                onClick={() => {
                  onPrint();
                  onOpenChange(false);
                }}
              />
              <QuickAction
                icon={<Mic2 className={cn("h-4 w-4", serviceModeActive && "text-gold")} />}
                label="Service"
                sublabel={serviceModeActive ? "On" : "Off"}
                onClick={onToggleServiceMode}
                active={serviceModeActive}
              />
              <QuickAction
                icon={<Lock className="h-4 w-4" />}
                label="Vault"
                sublabel="Open"
                onClick={() => {
                  onOpenVault();
                  onOpenChange(false);
                }}
              />
              <QuickAction
                icon={<Maximize2 className={cn("h-4 w-4", immersive && "text-gold")} />}
                label="Immersive"
                sublabel={immersive ? "On" : "Off"}
                onClick={() => {
                  onToggleImmersive();
                  onOpenChange(false);
                }}
                active={immersive}
              />
            </div>

            {/* Custom Deep Dive composer — header-level "Seek Wisdom" */}
            <div className="mb-3 rounded-md border border-gold/14 bg-background/20 p-3">
              <DeepDiveCustomInquiry
                reference={deepDivePassageReference}
                passageContext={deepDivePassageContext}
                onAfterSubmit={() => onOpenChange(false)}
              />
            </div>

            {/* Tab content */}
            {tab === "bookmarks" && (
              <div className="space-y-2 pb-3">
                {bookmarks.length ? (
                  bookmarks.map((verse) => (
                    <RowButton
                      key={verse}
                      title={`${book} ${chapter}:${verse}`}
                      body={verses[verse - 1] ?? ""}
                      onClick={() => {
                        onJumpToVerse(verse);
                        onOpenChange(false);
                      }}
                    />
                  ))
                ) : (
                  <EmptyState label="Tap a verse, then choose Bookmark from the menu to pin it here." />
                )}
              </div>
            )}

            {tab === "history" && (
              <div className="space-y-2 pb-3">
                {history.length ? (
                  history.map((entry, index) => (
                    <RowButton
                      key={`${entry.book}-${entry.chapter}-${entry.verse ?? "chapter"}-${index}`}
                      title={`${entry.book} ${entry.chapter}${entry.verse ? `:${entry.verse}` : ""}`}
                      body={
                        entry.book === book && entry.chapter === chapter && entry.verse
                          ? (verses[entry.verse - 1] ?? "Return to chapter")
                          : "Return to recent reading"
                      }
                      onClick={() => {
                        onJumpToHistory(entry);
                        onOpenChange(false);
                      }}
                    />
                  ))
                ) : (
                  <EmptyState label="Your recent passages will settle here as you read." />
                )}
              </div>
            )}

            {tab === "search" && (
              <div className="space-y-2 pb-3">
                <label className="block rounded-2xl border border-gold/14 bg-background/20 px-4 py-3">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.26em] text-gold/70">
                    Search this chapter
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Verse text or 3:16"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                    aria-label="Verse text or 3:16"
                  />
                </label>
                {query.trim().length === 0 ? (
                  <EmptyState
                    icon={<Search className="h-4 w-4 text-gold/70" />}
                    label={`Find any verse in ${book} ${chapter} — type a word or a verse number.`}
                  />
                ) : searchResults.length ? (
                  searchResults.map((result) => (
                    <RowButton
                      key={result.verse}
                      title={`${book} ${chapter}:${result.verse}`}
                      body={result.text}
                      onClick={() => {
                        onJumpToVerse(result.verse);
                        onOpenChange(false);
                      }}
                    />
                  ))
                ) : (
                  <EmptyState label="No verse in this chapter matches that phrase." />
                )}
              </div>
            )}

            {/* Settings (collapsed by default to save vertical space) */}
            <div className="mt-2 border-t border-gold/12 pt-3">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.22em] text-gold/70 hover:text-gold-soft"
              >
                <span>Settings</span>
                <span className="text-gold/50">{showSettings ? "Hide" : "Show"}</span>
              </button>

              {showSettings && (
                <div className="mt-3 space-y-3">
                  <button
                    type="button"
                    onClick={onToggleFocusMode}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors",
                      focusMode
                        ? "border-gold/35 bg-gold/12 text-gold-soft"
                        : "border-border/70 bg-background/20 text-muted-foreground hover:border-gold/25 hover:text-gold-soft",
                    )}
                  >
                    <MoonStar className="h-3.5 w-3.5" />
                    Focus Mode {focusMode ? "· On" : ""}
                  </button>

                  <div className="rounded-2xl border border-gold/14 bg-background/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70">
                          Advanced prefetch
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Fill the next segment even when not charging.
                        </p>
                        {isAggressivePrefetchOverrideActive ? (
                          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-gold/75">
                            Override active
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={onToggleAggressivePrefetch}
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors",
                          aggressivePrefetch
                            ? "border-gold/35 bg-gold/12 text-gold-soft"
                            : "border-border/70 bg-background/20 text-muted-foreground hover:border-gold/25 hover:text-gold-soft",
                        )}
                      >
                        {aggressivePrefetch ? "On" : "Off"}
                      </button>
                    </div>
                  </div>

                  {showVerseDotHelp && (
                    <div className="rounded-2xl border border-gold/14 bg-background/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold/45 animate-pulse" />
                            <span className="h-1.5 w-1.5 rounded-full bg-gold/70 shadow-[0_0_10px_rgba(201,168,76,0.25)]" />
                            Verse dots
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            Pulsing = buffering. Glowing = ready.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onDismissVerseDotHelp}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={onResetVerseDotHint}
                        className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold/75 transition-colors hover:text-gold-soft"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Show first-run hint again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function QuickAction({
  icon,
  label,
  sublabel,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-2xl border px-1.5 py-2.5 text-center transition-colors hover:border-gold/30 hover:bg-gold/8",
        active ? "border-gold/35 bg-gold/12" : "border-gold/14 bg-background/20",
      )}
    >
      <span className="text-gold-soft">{icon}</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gold-soft">
        {label}
      </span>
      <span className="truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {sublabel}
      </span>
    </button>
  );
}

function RowButton({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-2xl border border-gold/12 bg-background/16 px-4 py-3 text-left transition-colors hover:border-gold/25 hover:bg-gold/6"
    >
      <p className="font-display text-sm text-gold-soft">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </button>
  );
}

function EmptyState({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-gold/14 bg-background/12 px-4 py-5">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <p className="text-sm leading-relaxed text-muted-foreground">{label}</p>
    </div>
  );
}
