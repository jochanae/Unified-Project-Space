/**
 * ReaderLibrarySheet — Sanctuary Navigation surface.
 *
 * Two presentations:
 *  - Mobile / undocked: overlay bottom sheet (existing behavior)
 *  - Desktop docked (lg+): persistent right-rail sidebar, no overlay,
 *    sized at 380px so the reader can shift left without crowding.
 *
 * Top: Quick Actions row (Notes, Deep Dive, Print, Service, Vault, Immersive,
 * Stroll, Focus). Below: tabbed content (Marks · History · Search).
 *
 * Marks tab includes a "Hit List" mode (single-tap fire) for live sermon use.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Clock3,
  Crosshair,
  Footprints,
  KeyRound,
  Library as LibraryIcon,
  Lock,
  Maximize2,
  Mic2,
  MoonStar,
  NotebookPen,
  Pin,
  Play,
  PinOff,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Compass,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceSettings, applyVoiceSettings } from "@/hooks/useVoiceSettings";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { useAuth } from "@/hooks/useAuth";
import { DeepDiveCustomInquiry } from "@/components/reader/DeepDiveCustomInquiry";
import { DeepDiveJournals } from "@/components/reader/DeepDiveJournals";
import type { DeepDiveContext } from "@/lib/deepDive";

type LibraryTab = "marks" | "history" | "search";

export function ReaderLibrarySheet({
  open,
  onOpenChange,
  docked = false,
  onToggleDocked,
  bookmarks,
  allBookmarks = [],
  history,
  verses,
  book,
  chapter,
  currentVerse,
  immersive,
  focusMode,
  serviceModeActive,
  strollActive,
  showVerseDotHelp,
  deepDiveProvider,
  deepDivePassageContext,
  deepDivePassageReference,
  onJumpToVerse,
  onJumpToHistory,
  onJumpToCurrent,
  onOpenNotes,
  onDeepDiveHandshake,
  onPrint,
  onOpenVault,
  onOpenBlueprint,
  onToggleServiceMode,
  onToggleImmersive,
  onToggleFocusMode,
  onToggleStroll,
  onResetVerseDotHint,
  onDeleteBookmark,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, render as a persistent right-rail sidebar at lg+ (no overlay). */
  docked?: boolean;
  /** Pin / unpin the sidebar. Only shown when the docked variant is rendering. */
  onToggleDocked?: () => void;
  bookmarks: number[];
  allBookmarks?: Array<{ book: string; chapter: number; verse: number; version: string }>;
  history: Array<{ book: string; chapter: number; verse: number | null }>;
  verses: string[];
  book: string;
  chapter: number;
  currentVerse: number | null;
  immersive: boolean;
  focusMode: boolean;
  serviceModeActive: boolean;
  strollActive: boolean;
  showVerseDotHelp: boolean;
  deepDiveProvider: string;
  deepDivePassageContext: DeepDiveContext;
  deepDivePassageReference: string;
  onJumpToVerse: (verse: number) => void;
  onJumpToHistory: (entry: { book: string; chapter: number; verse: number | null }) => void;
  onJumpToCurrent: () => void;
  onOpenNotes: () => void;
  onDeepDiveHandshake: () => void;
  onPrint: () => void;
  onOpenVault: () => void;
  /** Opens the Scriptural Blueprint surface (mobile sheet OR desktop pane). */
  onOpenBlueprint: () => void;
  onToggleServiceMode: () => void;
  onToggleImmersive: () => void;
  onToggleFocusMode: () => void;
  onToggleStroll: () => void;
  onResetVerseDotHint: () => void;
  onDeleteBookmark?: (entry: {
    book: string;
    chapter: number;
    verse: number;
    version?: string;
  }) => void;
}) {
  const [tab, setTab] = useState<LibraryTab>("marks");
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [hitList, setHitList] = useState(false);
  const [marksScope, setMarksScope] = useState<"chapter" | "all">("chapter");
  const dragStartYRef = useRef<number | null>(null);

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [] as Array<{ verse: number; text: string }>;
    return verses
      .map((text, index) => ({ verse: index + 1, text }))
      .filter(
        ({ text, verse }) =>
          text.toLowerCase().includes(trimmed) || `${chapter}:${verse}`.includes(trimmed),
      )
      .slice(0, 20);
  }, [chapter, query, verses]);

  if (!open) return null;

  // ── DESKTOP DOCKED VARIANT ─────────────────────────────────────────────
  if (docked) {
    return (
      <aside
        aria-label={`Library — ${book} ${chapter}`}
        className={cn(
          "fixed right-0 top-0 z-30 hidden h-dvh w-[380px] flex-col border-l border-gold/15 bg-popover/95 text-popover-foreground backdrop-blur-2xl backdrop-saturate-150 shadow-[-24px_0_60px_rgba(0,0,0,0.45)] lg:flex",
          "animate-in slide-in-from-right-4 duration-200",
        )}
      >
        <DockedHeader
          book={book}
          chapter={chapter}
          onClose={() => onOpenChange(false)}
          onToggleDocked={onToggleDocked}
          docked
        />
        <DockedBody
          tab={tab}
          setTab={setTab}
          query={query}
          setQuery={setQuery}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          hitList={hitList}
          setHitList={setHitList}
          marksScope={marksScope}
          setMarksScope={setMarksScope}
          bookmarks={bookmarks}
          allBookmarks={allBookmarks}
          history={history}
          verses={verses}
          book={book}
          chapter={chapter}
          currentVerse={currentVerse}
          immersive={immersive}
          focusMode={focusMode}
          serviceModeActive={serviceModeActive}
          strollActive={strollActive}
          showVerseDotHelp={showVerseDotHelp}
          deepDiveProvider={deepDiveProvider}
          deepDivePassageContext={deepDivePassageContext}
          deepDivePassageReference={deepDivePassageReference}
          searchResults={searchResults}
          onClose={() => onOpenChange(false)}
          onJumpToVerse={onJumpToVerse}
          onJumpToHistory={onJumpToHistory}
          onJumpToCurrent={onJumpToCurrent}
          onOpenNotes={onOpenNotes}
          onDeepDiveHandshake={onDeepDiveHandshake}
          onPrint={onPrint}
          onOpenVault={onOpenVault}
          onOpenBlueprint={onOpenBlueprint}
          onToggleServiceMode={onToggleServiceMode}
          onToggleImmersive={onToggleImmersive}
          onToggleFocusMode={onToggleFocusMode}
          onToggleStroll={onToggleStroll}
          onResetVerseDotHint={onResetVerseDotHint}
          onDeleteBookmark={onDeleteBookmark}
          dockedVariant
        />
      </aside>
    );
  }

  // ── MOBILE / FLOATING OVERLAY VARIANT ──────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Library — ${book} ${chapter}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/65 backdrop-blur-sm md:items-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "flex w-full max-h-[82svh] flex-col rounded-t-2xl border border-gold/22 bg-popover/95 text-popover-foreground",
          "shadow-[0_-24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150",
          "md:m-4 md:max-h-[85vh] md:max-w-lg md:rounded-2xl",
          "animate-in fade-in slide-in-from-bottom-4 duration-200",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Swipe down or press Enter to close"
          className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-gold/30 md:hidden"
          onPointerDown={(e) => {
            dragStartYRef.current = e.clientY;
          }}
          onPointerMove={(e) => {
            if (dragStartYRef.current === null) return;
            if (e.clientY - dragStartYRef.current > 56) {
              dragStartYRef.current = null;
              onOpenChange(false);
            }
          }}
          onPointerUp={() => {
            dragStartYRef.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onOpenChange(false);
          }}
        />

        <DockedHeader
          book={book}
          chapter={chapter}
          onClose={() => onOpenChange(false)}
          onToggleDocked={onToggleDocked}
          docked={false}
        />

        <DockedBody
          tab={tab}
          setTab={setTab}
          query={query}
          setQuery={setQuery}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          hitList={hitList}
          setHitList={setHitList}
          marksScope={marksScope}
          setMarksScope={setMarksScope}
          bookmarks={bookmarks}
          allBookmarks={allBookmarks}
          history={history}
          verses={verses}
          book={book}
          chapter={chapter}
          currentVerse={currentVerse}
          immersive={immersive}
          focusMode={focusMode}
          serviceModeActive={serviceModeActive}
          strollActive={strollActive}
          showVerseDotHelp={showVerseDotHelp}
          deepDiveProvider={deepDiveProvider}
          deepDivePassageContext={deepDivePassageContext}
          deepDivePassageReference={deepDivePassageReference}
          searchResults={searchResults}
          onClose={() => onOpenChange(false)}
          onJumpToVerse={onJumpToVerse}
          onJumpToHistory={onJumpToHistory}
          onJumpToCurrent={onJumpToCurrent}
          onOpenNotes={onOpenNotes}
          onDeepDiveHandshake={onDeepDiveHandshake}
          onPrint={onPrint}
          onOpenVault={onOpenVault}
          onOpenBlueprint={onOpenBlueprint}
          onToggleServiceMode={onToggleServiceMode}
          onToggleImmersive={onToggleImmersive}
          onToggleFocusMode={onToggleFocusMode}
          onToggleStroll={onToggleStroll}
          onResetVerseDotHint={onResetVerseDotHint}
          onDeleteBookmark={onDeleteBookmark}
          dockedVariant={false}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components

function DockedHeader({
  book,
  chapter,
  onClose,
  onToggleDocked,
  docked,
}: {
  book: string;
  chapter: number;
  onClose: () => void;
  onToggleDocked?: () => void;
  docked: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gold/12 px-5 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <LibraryIcon className="h-4 w-4 shrink-0 text-gold/80" strokeWidth={1.5} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Library</p>
          <p className="mt-0.5 truncate font-display text-sm text-gold-soft">
            {book} {chapter}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-x-4">
        {/* Auth-aware account control — shares the same menu as the rest of the app */}
        <LibraryAccountControl />
        {onToggleDocked && (
          <button
            type="button"
            onClick={onToggleDocked}
            aria-label={docked ? "Unpin sidebar" : "Pin to right rail"}
            title={docked ? "Unpin sidebar" : "Pin to right rail"}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold-soft lg:inline-flex"
          >
            {docked ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function DockedBody({
  tab,
  setTab,
  query,
  setQuery,
  showSettings,
  setShowSettings,
  hitList,
  setHitList,
  marksScope,
  setMarksScope,
  bookmarks,
  allBookmarks,
  history,
  verses,
  book,
  chapter,
  currentVerse,
  immersive,
  focusMode,
  serviceModeActive,
  strollActive,
  showVerseDotHelp,
  deepDiveProvider,
  deepDivePassageContext,
  deepDivePassageReference,
  searchResults,
  onClose,
  onJumpToVerse,
  onJumpToHistory,
  onJumpToCurrent,
  onOpenNotes,
  onDeepDiveHandshake,
  onPrint,
  onOpenVault,
  onOpenBlueprint,
  onToggleServiceMode,
  onToggleImmersive,
  onToggleFocusMode,
  onToggleStroll,
  onResetVerseDotHint,
  onDeleteBookmark,
  dockedVariant,
}: {
  tab: LibraryTab;
  setTab: (tab: LibraryTab) => void;
  query: string;
  setQuery: (query: string) => void;
  showSettings: boolean;
  setShowSettings: (fn: (v: boolean) => boolean) => void;
  hitList: boolean;
  setHitList: (fn: (v: boolean) => boolean) => void;
  marksScope: "chapter" | "all";
  setMarksScope: (scope: "chapter" | "all") => void;
  bookmarks: number[];
  allBookmarks?: Array<{ book: string; chapter: number; verse: number; version: string }>;
  history: Array<{ book: string; chapter: number; verse: number | null }>;
  verses: string[];
  book: string;
  chapter: number;
  currentVerse: number | null;
  immersive: boolean;
  focusMode: boolean;
  serviceModeActive: boolean;
  strollActive: boolean;
  showVerseDotHelp: boolean;
  deepDiveProvider: string;
  deepDivePassageContext: DeepDiveContext;
  deepDivePassageReference: string;
  searchResults: Array<{ verse: number; text: string }>;
  onClose: () => void;
  onJumpToVerse: (verse: number) => void;
  onJumpToHistory: (entry: { book: string; chapter: number; verse: number | null }) => void;
  onJumpToCurrent: () => void;
  onOpenNotes: () => void;
  onDeepDiveHandshake: () => void;
  onPrint: () => void;
  onOpenVault: () => void;
  onOpenBlueprint: () => void;
  onToggleServiceMode: () => void;
  onToggleImmersive: () => void;
  onToggleFocusMode: () => void;
  onToggleStroll: () => void;
  onResetVerseDotHint: () => void;
  onDeleteBookmark?: (entry: {
    book: string;
    chapter: number;
    verse: number;
    version?: string;
  }) => void;
  /** When true, jump-to-verse keeps the sidebar open (docked stays put). */
  dockedVariant: boolean;
}) {
  // Closes the sheet on mobile after a jump; leaves the docked rail open.
  const closeIfMobile = () => {
    if (!dockedVariant) onClose();
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSettings) return;
    // Wait for panel to render, then scroll it into view within the sheet container.
    const id = window.requestAnimationFrame(() => {
      settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showSettings]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-1.5 pb-3">
        <QuickAction
          icon={<Crosshair className="h-4 w-4" />}
          label="Jump"
          sublabel={currentVerse ? `v${currentVerse}` : "current"}
          onClick={() => {
            onJumpToCurrent();
            closeIfMobile();
          }}
        />
        <QuickAction
          icon={<Footprints className={cn("h-4 w-4", strollActive && "text-gold")} />}
          label="Stroll"
          sublabel={strollActive ? "On" : "Off"}
          onClick={onToggleStroll}
          active={strollActive}
        />
        <QuickAction
          icon={<NotebookPen className="h-4 w-4" />}
          label="Notes"
          sublabel="Open"
          onClick={() => {
            onOpenNotes();
            closeIfMobile();
          }}
        />
        <QuickAction
          icon={<Sparkles className="h-4 w-4" />}
          label="Deep Dive"
          sublabel={deepDiveProvider}
          onClick={() => {
            onDeepDiveHandshake();
            closeIfMobile();
          }}
        />
        <QuickAction
          icon={<Lock className="h-4 w-4" />}
          label="Vault"
          sublabel="Open"
          onClick={() => {
            onOpenVault();
            closeIfMobile();
          }}
        />
        <QuickAction
          icon={<Compass className="h-4 w-4" />}
          label="Blueprint"
          sublabel="Architect"
          onClick={() => {
            onOpenBlueprint();
            closeIfMobile();
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
          icon={<Maximize2 className={cn("h-4 w-4", immersive && "text-gold")} />}
          label="Immersive"
          sublabel={immersive ? "On" : "Off"}
          onClick={() => {
            onToggleImmersive();
            closeIfMobile();
          }}
          active={immersive}
        />
        <QuickAction
          icon={<Printer className="h-4 w-4" />}
          label="Print"
          sublabel="PDF"
          onClick={() => {
            onPrint();
            closeIfMobile();
          }}
        />
      </div>

      {/* Custom Deep Dive composer — header-level "Seek Wisdom" */}
      <div className="mb-3 rounded-md border border-gold/14 bg-background/20 p-3">
        <DeepDiveCustomInquiry
          reference={deepDivePassageReference}
          passageContext={deepDivePassageContext}
          onAfterSubmit={closeIfMobile}
        />
      </div>

      {/* Deep Dive Journals — grouped, paid-tier archive */}
      <DeepDiveJournals />

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 rounded-full border border-gold/14 bg-background/20 p-1">
        {(
          [
            { key: "marks", label: "Marks", icon: Bookmark },
            { key: "history", label: "History", icon: Clock3 },
            { key: "search", label: "Search", icon: Search },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-all duration-200",
              tab === key
                ? "bg-gold/14 text-gold-soft shadow-[0_0_18px_rgba(201,168,76,0.18)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-3">
        {tab === "marks" && (
          <div className="space-y-2 pb-3">
            {/* Scope toggle — chapter (this view) vs all (every book) */}
            <div className="flex items-center gap-1 rounded-full border border-gold/14 bg-background/15 p-1 text-[10px] uppercase tracking-[0.22em]">
              {(
                [
                  { key: "chapter", label: `${book} ${chapter}` },
                  { key: "all", label: `All · ${(allBookmarks ?? []).length}` },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMarksScope(key)}
                  aria-pressed={marksScope === key}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1 transition-colors",
                    marksScope === key
                      ? "bg-gold/16 text-gold-soft"
                      : "text-muted-foreground hover:text-gold-soft",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Hit-List toggle — only meaningful in chapter scope */}
            {marksScope === "chapter" && (
              <div className="flex items-center justify-between rounded-full border border-gold/14 bg-background/15 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/70">
                  {hitList ? "Hit List · single-tap fires" : "Marks"}
                </span>
                <button
                  type="button"
                  onClick={() => setHitList((v) => !v)}
                  aria-pressed={hitList}
                  aria-label="Toggle Hit List mode"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors",
                    hitList
                      ? "bg-gold/16 text-gold-soft shadow-[0_0_12px_rgba(201,168,76,0.22)]"
                      : "text-muted-foreground hover:text-gold-soft",
                  )}
                >
                  <Zap className="h-3 w-3" />
                  Hit List
                </button>
              </div>
            )}

            {marksScope === "chapter" ? (
              bookmarks.length ? (
                hitList ? (
                  <div className="space-y-1.5">
                    {bookmarks.map((verse, index) => (
                      <HitRow
                        key={verse}
                        index={index + 1}
                        verse={verse}
                        book={book}
                        chapter={chapter}
                        isCurrent={currentVerse === verse}
                        onFire={() => {
                          onJumpToVerse(verse);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  bookmarks.map((verse) => (
                    <RowButton
                      key={verse}
                      title={`${book} ${chapter}:${verse}`}
                      body={verses[verse - 1] ?? ""}
                      onClick={() => {
                        onJumpToVerse(verse);
                        closeIfMobile();
                      }}
                      onDelete={
                        onDeleteBookmark
                          ? () => onDeleteBookmark({ book, chapter, verse })
                          : undefined
                      }
                    />
                  ))
                )
              ) : (
                <EmptyState label="Tap a verse, then choose Bookmark from the menu to pin it here. Switch to All to see marks from every book." />
              )
            ) : (
              <AllBookmarksList
                items={allBookmarks ?? []}
                onJump={(entry) => {
                  onJumpToHistory({ book: entry.book, chapter: entry.chapter, verse: entry.verse });
                  closeIfMobile();
                }}
                onDelete={onDeleteBookmark}
              />
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
                    closeIfMobile();
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
                autoFocus
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
                    closeIfMobile();
                  }}
                />
              ))
            ) : (
              <EmptyState label="No verse in this chapter matches that phrase." />
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div ref={settingsRef} className="mt-2 border-t border-gold/12 pt-3">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.22em] text-gold/70 hover:text-gold-soft"
        >
          <span>Settings</span>
          <span className="text-gold/50">{showSettings ? "Hide" : "Show"}</span>
        </button>

        {showSettings && (
          <div ref={settingsPanelRef} className="mt-3 space-y-3">
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

            {showVerseDotHelp && (
              <button
                type="button"
                onClick={onResetVerseDotHint}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-background/20 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-gold/25 hover:text-gold-soft"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Show first-run hint again
              </button>
            )}

            {/* Voice controls */}
            <VoiceControls />
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceControls() {
  const { settings, update } = useVoiceSettings();
  const [previewing, setPreviewing] = useState(false);

  const handlePreview = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("The LORD is my shepherd; I shall not want.");
    applyVoiceSettings(utterance, settings);
    utterance.onstart = () => setPreviewing(true);
    utterance.onend = () => setPreviewing(false);
    utterance.onerror = () => setPreviewing(false);
    window.speechSynthesis.speak(utterance);
  }, [settings]);

  const stopPreview = useCallback(() => {
    window.speechSynthesis?.cancel();
    setPreviewing(false);
  }, []);

  return (
    <div className="space-y-3 pt-2 border-t border-gold/10">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/50">Voice</p>

      {/* Speed */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
            Speed
          </span>
          <span className="text-[10px] font-mono text-gold/60">{settings.rate.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.2}
          step={0.01}
          value={settings.rate}
          onChange={(e) => update({ rate: parseFloat(e.target.value) })}
          className="w-full h-1 accent-gold rounded-full"
          aria-label="Range"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground/30 uppercase tracking-[0.12em]">
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
            Pitch
          </span>
          <span className="text-[10px] font-mono text-gold/60">{settings.pitch.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.7}
          max={1.2}
          step={0.01}
          value={settings.pitch}
          onChange={(e) => update({ pitch: parseFloat(e.target.value) })}
          className="w-full h-1 accent-gold rounded-full"
          aria-label="Range"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground/30 uppercase tracking-[0.12em]">
          <span>Deep</span>
          <span>High</span>
        </div>
      </div>

      {/* Preview */}
      <button
        type="button"
        onClick={previewing ? stopPreview : handlePreview}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors",
          previewing
            ? "border-gold/35 bg-gold/12 text-gold-soft"
            : "border-border/70 bg-background/20 text-muted-foreground hover:border-gold/25 hover:text-gold-soft",
        )}
      >
        <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
        {previewing ? "Stop" : "Preview voice"}
      </button>
    </div>
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
        active
          ? "border-gold/35 bg-gold/12 shadow-[0_0_14px_rgba(201,168,76,0.18)]"
          : "border-gold/14 bg-background/20",
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

function RowButton({
  title,
  body,
  onClick,
  onDelete,
}: {
  title: string;
  body: string;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-2xl border border-gold/12 bg-background/16 px-4 py-3 pr-10 text-left transition-colors hover:border-gold/25 hover:bg-gold/6"
      >
        <p className="font-display text-sm text-gold-soft">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`Remove ${title}`}
          title="Remove bookmark"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Hit-List row — large tap target, ordinal index on the left, "Fire" cue on the right.
 * Designed for live service: minister taps and the verse jumps + scrolls into view.
 */
function HitRow({
  index,
  verse,
  book,
  chapter,
  isCurrent,
  onFire,
}: {
  index: number;
  verse: number;
  book: string;
  chapter: number;
  isCurrent: boolean;
  onFire: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFire}
      aria-label={`Fire ${book} ${chapter}:${verse}`}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-150",
        isCurrent
          ? "border-gold/45 bg-gold/14 text-gold-soft shadow-[0_0_18px_rgba(201,168,76,0.22)]"
          : "border-gold/14 bg-background/16 hover:border-gold/35 hover:bg-gold/8 active:scale-[0.98]",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm tabular-nums",
          isCurrent ? "bg-gold/25 text-gold-soft" : "bg-gold/10 text-gold/85",
        )}
      >
        {index}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-base text-foreground">
        {book} {chapter}:{verse}
      </span>
      <Zap
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity",
          isCurrent ? "text-gold" : "text-gold/55 opacity-0 group-hover:opacity-100",
        )}
      />
    </button>
  );
}

function LibraryAccountControl() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="Sign In"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 text-gold-soft transition-colors hover:border-gold/55 hover:bg-gold/8"
      >
        <KeyRound className="h-5 w-5" strokeWidth={1.5} />
      </Link>
    );
  }
  return <AvatarMenu />;
}

function EmptyState({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-gold/14 bg-background/12 px-4 py-5">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <p className="text-sm leading-relaxed text-muted-foreground">{label}</p>
    </div>
  );
}

type AllMark = { book: string; chapter: number; verse: number; version: string };

function AllBookmarksList({
  items,
  onJump,
  onDelete,
}: {
  items: AllMark[];
  onJump: (entry: AllMark) => void;
  onDelete?: (entry: AllMark) => void;
}) {
  if (!items.length) {
    return <EmptyState label="No bookmarks yet. Pin a verse from any book to see it here." />;
  }

  // Group by "Book Chapter"
  const groups = new Map<string, AllMark[]>();
  for (const m of items) {
    const key = `${m.book} ${m.chapter}`;
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([heading, marks]) => (
        <div key={heading} className="space-y-1.5">
          <p className="px-1 text-[10px] uppercase tracking-[0.26em] text-gold/70">
            {heading} <span className="text-muted-foreground/70">· {marks.length}</span>
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {marks.map((m) => (
              <div
                key={`${m.book}-${m.chapter}-${m.verse}-${m.version}`}
                className="group relative"
              >
                <button
                  type="button"
                  onClick={() => onJump(m)}
                  className="w-full rounded-xl border border-gold/14 bg-background/15 px-2 py-2 text-center text-xs font-medium text-gold-soft transition-colors hover:bg-gold/10 hover:border-gold/30"
                  aria-label={`Jump to ${m.book} ${m.chapter}:${m.verse}`}
                >
                  {m.chapter}:{m.verse}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(m);
                    }}
                    aria-label={`Remove ${m.book} ${m.chapter}:${m.verse}`}
                    title="Remove bookmark"
                    className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold/20 bg-obsidian/90 text-muted-foreground/80 opacity-0 shadow-md transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
