import { createFileRoute, useNavigate, useSearch, Link, useRouter } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Footprints,
  Headphones,
  Library as LibraryIcon,
  Mic2,
  NotebookPen,
  Printer,
  Search,
  Sunrise,
  Trash2,
  Play,
  X,
  PanelRightOpen,
  BookOpenCheck,
  Settings2,
  Lock as LockIcon,
} from "lucide-react";
import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoles } from "@/hooks/useRoles";
import { useEdgeSwipeNavigate } from "@/hooks/useEdgeSwipeNavigate";
import { useDeepDiveHistory } from "@/hooks/useDeepDiveHistory";
import { useNotifications } from "@/hooks/useNotifications";
import {
  ServiceDrawer,
  buildServiceNoteTitle,
  parseEntriesFromText,
  type ServiceEntry,
} from "@/components/reader/ServiceDrawer";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ReaderHeader as MasterHeader } from "@/components/layout/ReaderHeader";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { loadBible, getChapter, VERSION_LABELS, type Version } from "@/lib/scripture";
import { buildReferenceLabels, buildVerseSuffix } from "@/lib/bookAbbrev";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useScriptureNarrator } from "@/hooks/useScriptureNarrator";
import { useSystemNarrator } from "@/hooks/useSystemNarrator";
import { useReaderVoiceEngine } from "@/hooks/useReaderVoiceEngine";
import { AudioBar } from "@/components/reader/AudioBar";
import { TextSizeMenu } from "@/components/reader/TextSizeMenu";
import { QuantumVerseColumn } from "@/components/reader/QuantumVerseColumn";
import { ReaderCompanionPane } from "@/components/reader/ReaderCompanionPane";
import { BlueprintSheet } from "@/components/blueprint/BlueprintSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReaderThreadScroll } from "@/components/reader/ReaderThreadScroll";
// ReaderSanctuaryTray replaced by ReaderLibrarySheet (Sanctuary Navigation Overhaul)
import { ReaderLibrarySheet } from "@/components/reader/ReaderLibrarySheet";
import { GoldDotPeek } from "@/components/reader/GoldDotPeek";
import { AltarModal } from "@/components/altar/AltarModal";
import { StrollProgressPill } from "@/components/reader/StrollProgressPill";
import { useBookmarkStroll } from "@/hooks/useBookmarkStroll";
import { useReaderPositionHistory } from "@/hooks/useReaderPositionHistory";
import { recordPositionVisit } from "@/lib/reader-position-history";
import { AddToVaultSheet } from "@/components/vault/AddToVaultSheet";
import { VaultItemSheet } from "@/components/vault/VaultItemSheet";
import { ActiveCollectionChip } from "@/components/vault/ActiveCollectionChip";
import {
  addVerseToCollection,
  deleteItem,
  getActiveCollectionId,
  getItem as getVaultItem,
  setActiveCollectionId,
  type VaultItem,
} from "@/lib/vault";
import { DailyWordSheet } from "@/components/reader/DailyWordSheet";
import { useVerseHighlights } from "@/hooks/useVerseHighlights";
import { useHighlightsEnabled } from "@/hooks/useHighlightsEnabled";
import { useTextScale, type TextScale, TEXT_SCALE_STYLES } from "@/hooks/useTextScale";
import {
  buildDeepDiveLinks,
  buildDeepDivePrompt,
  formatPassageReference,
  type DeepDiveContext,
} from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import { useQuickSearch } from "@/components/QuickSearchProvider";
import { flushPosition, hydrateFromServer, savePosition } from "@/lib/reader-position";
import { saveResumeLater } from "@/lib/resume-later";
import { trackResumeEvent } from "@/lib/resume-events";
import { useStudyCircuit } from "@/hooks/useStudyCircuit";

import { ReaderErrorBoundary } from "@/components/reader/ReaderErrorBoundary";
import { ReturnToReadingBanner } from "@/components/reader/ReturnToReadingBanner";
import { AvatarMenu } from "@/components/layout/AvatarMenu";

const BookPicker = lazy(() => import("@/components/reader/ReaderBookPicker"));
const QuantumMenu = lazy(() => import("@/components/reader/ReaderQuantumMenu"));

type Bible = Awaited<ReturnType<typeof loadBible>>;
type ReaderAnchor = { book: string; chapter: number; verse: number | null };
type VerseRange = { start: number; end: number };

export const Route = createFileRoute("/reader")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    bookIndex?: number;
    chapter?: number;
    verse?: number;
    highlight?: string;
    vault?: string;
  } => ({
    bookIndex: typeof search.bookIndex === "number" ? search.bookIndex : undefined,
    chapter: typeof search.chapter === "number" ? search.chapter : undefined,
    verse: typeof search.verse === "number" ? search.verse : undefined,
    highlight:
      typeof search.highlight === "string" && search.highlight.length > 0
        ? search.highlight.slice(0, 80)
        : undefined,
    vault:
      typeof search.vault === "string" && search.vault.length > 0
        ? search.vault.slice(0, 64)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reader — SanctumIQ" },
      { name: "description", content: "Parallel KJV & ASV scripture, instant and obsidian-quiet." },
      { property: "og:title", content: "Reader — SanctumIQ" },
      {
        property: "og:description",
        content: "Parallel KJV & ASV scripture, instant and obsidian-quiet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: ReaderPageWithBoundary,
});

function ReaderPageWithBoundary() {
  return (
    <ReaderErrorBoundary>
      <ReaderPage />
    </ReaderErrorBoundary>
  );
}

const STORAGE_KEY = "sanctumiq:reader:position";
const FOCUS_MODE_KEY = "sanctumiq:reader:focus-mode";
const HISTORY_KEY = "sanctumiq:reader:history";
const PREFETCH_HINT_KEY = "sanctumiq:reader:prefetch-hint-seen";
const VERSE_DOT_HELP_DISMISSED_KEY = "sanctumiq:reader:verse-dot-help-dismissed";
const AGGRESSIVE_PREFETCH_KEY = "sanctumiq:reader:aggressive-prefetch";
const SERVICE_MODE_KEY = "sanctumiq:reader:service-mode";
const SERVICE_DRAWER_KEY = "sanctumiq:reader:service-drawer";
const EMPTY_HIGHLIGHTED_VERSES: Set<number> = new Set();
const PICKER_STATE_KEY = "sanctumiq:reader:picker-state";
const VERSION_KEY = "sanctumiq:reader:version";
const IMMERSIVE_HINT_KEY = "sanctumiq:reader:immersive-hint-seen";

type PassageSelection = {
  bookIndex: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
};

function toPassageSelection(
  selection: PassageSelection | VerseRange,
  fallbackBookIndex: number,
  fallbackChapter: number,
): PassageSelection {
  if ("bookIndex" in selection) return selection;

  return {
    bookIndex: fallbackBookIndex,
    chapter: fallbackChapter,
    verseStart: selection.start,
    verseEnd: selection.end,
  };
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function ReaderPage() {
  const { user } = useAuth();
  const readerProfile = useProfile(user?.id);
  const quickSearch = useQuickSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const handleSmartBack = useCallback(() => {
    // Prefer real browser history when there's somewhere to go back to;
    // fall back to The Entry as a safe default (fresh tabs, deep links, PWA cold start).
    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer !== "" &&
      !document.referrer.includes(window.location.pathname);
    if (canGoBack) {
      router.history.back();
    } else {
      navigate({ to: "/" });
    }
  }, [navigate, router]);
  // Edge-swipe RIGHT (from left edge) → Landing. Mirror of the landing→reader gesture.
  // Only left-edge is armed: right-edge would conflict with chapter-swipe inside the reader.
  useEdgeSwipeNavigate({ onSwipeRightTo: "/" });
  const searchParams = useSearch({ from: "/reader" });
  const studyCircuit = useStudyCircuit();
  const [librarySheetOpen, setLibrarySheetOpen] = useState(false);
  const [goldDotPeekOpen, setGoldDotPeekOpen] = useState(false);
  const [altarOpen, setAltarOpen] = useState(false);
  // Library Dock — desktop right rail. Persists across sessions.
  const [libraryDocked, setLibraryDocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sanctumiq:library-docked") === "1";
    } catch {
      return false;
    }
  });
  // Auto-open the library when docked so the rail appears on first load.
  useEffect(() => {
    if (libraryDocked) setLibrarySheetOpen(true);
  }, [libraryDocked]);
  const toggleLibraryDocked = useCallback(() => {
    setLibraryDocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sanctumiq:library-docked", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next) setLibrarySheetOpen(true);
      return next;
    });
  }, []);
  // Effective dock = docked AND open. Used to shift reader content left at lg+.
  const libraryDockedAndOpen = libraryDocked && librarySheetOpen;
  // Companion Pane — desktop-only (xl:) right pane with chapter scratchpad notes.
  const [companionOpen, setCompanionOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sanctumiq:companion-open") === "1";
    } catch {
      return false;
    }
  });
  const toggleCompanion = useCallback(() => {
    setCompanionOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sanctumiq:companion-open", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isMobile = useIsMobile();
  const [blueprintSheetOpen, setBlueprintSheetOpen] = useState(false);
  const [companionInitialTab, setCompanionInitialTab] = useState<"notes" | "blueprint" | undefined>(
    undefined,
  );
  /**
   * Unified Blueprint trigger — works from any surface (LibrarySheet tile,
   * QuantumMenu verse action, header tools menu). Routes to the desktop
   * Companion Pane (with Blueprint tab pre-selected) on xl screens, and to
   * the mobile BlueprintSheet on everything below.
   */
  const handleOpenBlueprint = useCallback(() => {
    if (isMobile) {
      setBlueprintSheetOpen(true);
    } else {
      setCompanionInitialTab("blueprint");
      setCompanionOpen(true);
      try {
        localStorage.setItem("sanctumiq:companion-open", "1");
      } catch {
        /* ignore */
      }
    }
  }, [isMobile]);
  const { hasAnyRole } = useRoles(user?.id);
  const canUseServiceMode = hasAnyRole(["minister", "church_partner", "admin"]);
  const [serviceModeActive, setServiceModeActive] = useState(() => {
    try {
      return localStorage.getItem(SERVICE_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [serviceNoteId, setServiceNoteId] = useState<string | null>(null);
  const [serviceNoteTitle] = useState(() => buildServiceNoteTitle());
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [bible, setBible] = useState<Bible | null>(null);
  const [bookIndex, setBookIndex] = useState(42);
  const [chapter, setChapter] = useState(3);
  const [version, setVersion] = useState<Version>("KJV");
  const [pickerOpen, setPickerOpen] = useState(false);
  const trayOpen = false; // legacy guard — Library Sheet has fully replaced the side tray
  const [menuOpen, setMenuOpen] = useState(false);
  const [vaultSheetOpen, setVaultSheetOpen] = useState(false);
  // Surfaced when arriving via /reader?vault=<id> — opens the saved item card
  // so the note you wrote at this verse is right there with the verse.
  const [openedVaultItem, setOpenedVaultItem] = useState<VaultItem | null>(null);
  const consumedVaultIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = searchParams.vault;
    if (!id || !user?.id) return;
    if (consumedVaultIdRef.current === id) return;
    consumedVaultIdRef.current = id;
    void getVaultItem(id)
      .then((item) => {
        if (item) setOpenedVaultItem(item);
      })
      .catch(() => {
        // Silent — verse already pulses; the item just won't surface.
      });
  }, [searchParams.vault, user?.id]);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<VerseRange | null>(null);
  // When non-null, the next verse tap completes a range from this anchor
  // instead of starting a fresh selection. Set by tapping "Extend selection"
  // inside the open Quantum menu.
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  // Most recent multi-verse range the user committed in this chapter. Lets
  // them "Resume last selection" from the Quantum menu instead of starting
  // over after dismissing the sheet.
  const [lastRange, setLastRange] = useState<{
    bookIndex: number;
    chapter: number;
    start: number;
    end: number;
  } | null>(null);
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [allBookmarks, setAllBookmarks] = useState<
    Array<{ book: string; chapter: number; verse: number; version: string }>
  >([]);
  const [lastAnchor, setLastAnchor] = useState<ReaderAnchor | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [pulsingVerse, setPulsingVerse] = useState<number | null>(null);
  // Track sermon-rail collapsed state so we can reserve right padding on xl+ when it's expanded
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sanctumiq:rail:collapsed") === "1";
    } catch {
      return true;
    }
  });
  // Edge-hover tooltip near the right margin (xl+ only) — surfaces the rail's
  // current state ("Expanded" / "Collapsed") without forcing the user to reach
  // the toggle button. Pure presentation, no layout impact.
  const [edgeHoverState, setEdgeHoverState] = useState<{ y: number } | null>(null);
  // Polite screen-reader announcement for rail state changes triggered via
  // keyboard / external events. Cleared after a short interval so the same
  // message can be re-announced on subsequent toggles.
  const [railAnnouncement, setRailAnnouncement] = useState("");
  const railAnnouncementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceRailState = useCallback((collapsed: boolean) => {
    const message = collapsed ? "Workspace rail collapsed" : "Workspace rail expanded";
    // Toggle through empty string first so SRs reliably re-announce identical
    // messages on rapid repeated activations.
    setRailAnnouncement("");
    requestAnimationFrame(() => setRailAnnouncement(message));
    if (railAnnouncementTimerRef.current) clearTimeout(railAnnouncementTimerRef.current);
    railAnnouncementTimerRef.current = setTimeout(() => setRailAnnouncement(""), 1500);
  }, []);
  // Shortcuts hint panel — toggled by "?" (Shift+/) or the floating help icon.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Tools dropdown (desktop xl+ consolidates Headphones, Companion, Workspace, Rail toggle).
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  // Auto-fade focus: when mouse is idle for >2.4s on xl+, fade chrome to ~10%.
  const [chromeIdle, setChromeIdle] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wake = () => {
      setChromeIdle(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setChromeIdle(true), 2400);
    };
    wake();
    window.addEventListener("mousemove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (chromeIdle) document.body.setAttribute("data-reader-chrome", "idle");
    else document.body.removeAttribute("data-reader-chrome");
    return () => {
      document.body.removeAttribute("data-reader-chrome");
    };
  }, [chromeIdle]);
  // Pulse the Workspace nav icon when activated by the W shortcut.
  const [workspacePulse, setWorkspacePulse] = useState(false);
  // Hide the "Press W" tooltip hint after the user has used the shortcut once.
  // Persisted across sessions so it doesn't keep nagging.
  const [workspaceHintSeen, setWorkspaceHintSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sanctumiq:workspace-shortcut:seen") === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    const sync = () => {
      try {
        setRailCollapsed(localStorage.getItem("sanctumiq:rail:collapsed") === "1");
      } catch {
        /* ignore */
      }
    };
    const onToggle = () => {
      setRailCollapsed((prev) => {
        const next = !prev;
        announceRailState(next);
        return next;
      });
    };
    const onExpand = () => {
      setRailCollapsed(false);
      announceRailState(false);
    };
    // Alt+R — toggle the workspace rail.
    // W      — open /workspace (or /auth with redirect when signed out).
    // Skip when typing in form fields / contenteditable so we don't hijack input.
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      // Alt+R — rail toggle (existing behavior)
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "r" || event.key === "R")
      ) {
        event.preventDefault();
        window.dispatchEvent(new Event("sermon-rail:toggle"));
        return;
      }
      // ? — open/close the keyboard shortcuts hint panel.
      if (event.key === "?" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }
      // Esc — close the shortcuts panel if it's the topmost overlay.
      if (event.key === "Escape" && shortcutsOpen) {
        event.preventDefault();
        setShortcutsOpen(false);
        return;
      }
      // W — Go to Workspace (no modifier keys)
      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "w" || event.key === "W")
      ) {
        event.preventDefault();
        // Brief pulse so the icon visually confirms the shortcut fired.
        setWorkspacePulse(true);
        window.setTimeout(() => setWorkspacePulse(false), 520);
        // Mark hint as seen + persist.
        if (!workspaceHintSeen) {
          setWorkspaceHintSeen(true);
          try {
            localStorage.setItem("sanctumiq:workspace-shortcut:seen", "1");
          } catch {
            /* ignore */
          }
        }
        if (user) {
          void navigate({ to: "/workspace" });
        } else {
          void navigate({ to: "/auth", search: { redirect: "/workspace" } });
        }
      }
    };
    window.addEventListener("sermon-rail:toggle", onToggle);
    window.addEventListener("sermon-rail:expand", onExpand);
    window.addEventListener("storage", sync);
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("sermon-rail:toggle", onToggle);
      window.removeEventListener("sermon-rail:expand", onExpand);
      window.removeEventListener("storage", sync);
      window.removeEventListener("keydown", onKeydown);
    };
  }, [user, navigate, workspaceHintSeen, announceRailState, shortcutsOpen]);

  // Cleanup the announcement timer on unmount so we don't leak setTimeouts.
  useEffect(() => {
    return () => {
      if (railAnnouncementTimerRef.current) clearTimeout(railAnnouncementTimerRef.current);
    };
  }, []);
  const [vaultPulseVerse, setVaultPulseVerse] = useState<number | null>(null);
  const [vaultedVerses, setVaultedVerses] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<ReaderAnchor[]>([]);
  const [showPrefetchHint, setShowPrefetchHint] = useState(false);
  const [showVerseDotHelp, setShowVerseDotHelp] = useState(true);
  const [aggressivePrefetch, setAggressivePrefetch] = useState(false);
  const [visibleVerse, setVisibleVerse] = useState<number | null>(null);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const [anchorDiscovered, setAnchorDiscovered] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sanctumiq:reader:header-discovery-seen") === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!jumpMenuOpen || anchorDiscovered) return;
    setAnchorDiscovered(true);
    try {
      localStorage.setItem("sanctumiq:reader:header-discovery-seen", "1");
    } catch {
      /* ignore */
    }
  }, [jumpMenuOpen, anchorDiscovered]);

  // Anchor jump history — last 5 distinct book/chapter visits.
  // Lazy fetch on popover open so we don't pay for a read every reader mount.
  const anchorHistory = useReaderPositionHistory(5);
  const refreshAnchorHistory = anchorHistory.refresh;
  useEffect(() => {
    if (jumpMenuOpen) void refreshAnchorHistory();
  }, [jumpMenuOpen, refreshAnchorHistory]);
  const [dailyWordOpen, setDailyWordOpen] = useState(false);
  const [jumpVerseDraft, setJumpVerseDraft] = useState("1");
  const [isReaderActive, setIsReaderActive] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<PassageSelection | null>(null);
  const [playbackUI, setPlaybackUI] = useState<"expanded" | "retracted">("expanded");
  const trayGestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const headerActiveTimerRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollIdle, setScrollIdle] = useState(true);
  const priorScaleRef = useRef<TextScale | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { scale, setScale } = useTextScale();
  const deepDiveHistory = useDeepDiveHistory();
  const { notify } = useNotifications();
  const [historyOpen, setHistoryOpen] = useState(false);

  // Service Mode toggle
  const toggleServiceMode = () => {
    if (!canUseServiceMode) {
      toast("Service Mode is available for Architect and Church Partner members.");
      return;
    }
    setServiceModeActive((v) => {
      const next = !v;
      try {
        localStorage.setItem(SERVICE_MODE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next) setServiceDrawerOpen(true);
      return next;
    });
  };

  // Add a verse to the service note from the verse action menu
  const handleAddToServiceNote = (verseText: string, reference: string) => {
    const entry: ServiceEntry = {
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      reference,
      text: verseText,
      isVerse: true,
    };
    setServiceEntries((prev) => {
      const next = [...prev, entry];
      const body = next
        .map((e) => {
          const hdr = e.reference ? `[${e.time}] ${e.reference}` : `[${e.time}]`;
          const bd = e.isVerse ? `"${e.text}"` : e.text;
          return `${hdr}\n${bd}`;
        })
        .join("\n\n");
      if (serviceNoteId) {
        supabase
          .from("notes")
          .update({ body_text: body, updated_at: new Date().toISOString() })
          .eq("id", serviceNoteId)
          .eq("user_id", user!.id)
          .then(() => {});
      } else if (user) {
        supabase
          .from("notes")
          .insert({ user_id: user.id, body_text: body, scripture_ref: serviceNoteTitle })
          .select("id")
          .single()
          .then(({ data }) => {
            if (data) setServiceNoteId(data.id);
          });
      }
      return next;
    });
    setServiceDrawerOpen(true);
    toast.success("Added to service note", { description: reference });
  };

  const markReaderActive = () => {
    setIsReaderActive(true);
    if (headerActiveTimerRef.current) window.clearTimeout(headerActiveTimerRef.current);
    headerActiveTimerRef.current = window.setTimeout(() => setIsReaderActive(false), 1800);
  };

  useEffect(() => {
    loadBible()
      .then(setBible)
      .catch(() => toast.error("Could not load scripture"));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { bookIndex: b, chapter: c } = JSON.parse(raw);
        if (typeof b === "number" && typeof c === "number") {
          setBookIndex(b);
          setChapter(c);
        }
      }
      const anchorRaw = localStorage.getItem("sanctumiq:reader:anchor");
      if (anchorRaw) {
        const parsed = JSON.parse(anchorRaw) as Partial<ReaderAnchor>;
        if (typeof parsed.book === "string" && typeof parsed.chapter === "number") {
          setLastAnchor({
            book: parsed.book,
            chapter: parsed.chapter,
            verse: typeof parsed.verse === "number" ? parsed.verse : null,
          });
        }
      }
      setFocusMode(localStorage.getItem(FOCUS_MODE_KEY) === "true");
      const historyRaw = localStorage.getItem(HISTORY_KEY);
      if (historyRaw) {
        const parsed = JSON.parse(historyRaw) as ReaderAnchor[];
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 8));
      }
      setShowPrefetchHint(localStorage.getItem(PREFETCH_HINT_KEY) !== "true");
      setShowVerseDotHelp(localStorage.getItem(VERSE_DOT_HELP_DISMISSED_KEY) !== "true");
      setAggressivePrefetch(localStorage.getItem(AGGRESSIVE_PREFETCH_KEY) === "true");
      // URL search params override localStorage — this is how search navigates here
      if (typeof searchParams.bookIndex === "number") {
        setBookIndex(searchParams.bookIndex);
      }
      if (typeof searchParams.chapter === "number") {
        setChapter(searchParams.chapter);
      }
      const pickerRaw = localStorage.getItem(PICKER_STATE_KEY);
      if (pickerRaw) {
        const parsed = JSON.parse(pickerRaw) as Partial<PassageSelection>;
        if (typeof parsed.bookIndex === "number" && typeof parsed.chapter === "number") {
          setPickerSelection({
            bookIndex: parsed.bookIndex,
            chapter: parsed.chapter,
            verseStart: typeof parsed.verseStart === "number" ? parsed.verseStart : null,
            verseEnd: typeof parsed.verseEnd === "number" ? parsed.verseEnd : null,
          });
        }
      }
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (storedVersion === "KJV" || storedVersion === "ASV") setVersion(storedVersion);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist focus-mode flag and swap text scale when entering/leaving focus mode.
  // Depends only on `focusMode` to avoid loops; reads current scale via a ref so
  // an external scale change doesn't re-fire this effect. setScale only runs
  // when the target value actually differs from the current scale.
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_MODE_KEY, String(focusMode));
    } catch {
      /* ignore */
    }

    if (focusMode) {
      const current = scaleRef.current;
      if (current !== "xlarge") {
        priorScaleRef.current = current;
        setScale("xlarge");
      }
      return;
    }

    if (priorScaleRef.current && priorScaleRef.current !== scaleRef.current) {
      setScale(priorScaleRef.current);
    }
    priorScaleRef.current = null;
  }, [focusMode, setScale]);

  // Immersive Reading Mode — Escape to exit
  useEffect(() => {
    if (!immersive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImmersive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [immersive]);

  // Anchor shortcut — press "g" to open the jump menu (or "G" / "Shift+G" to open full picker).
  // Skips when typing or when an overlay is already open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "g") return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable)
          return;
      }
      if (
        pickerOpen ||
        menuOpen ||
        trayOpen ||
        librarySheetOpen ||
        goldDotPeekOpen ||
        vaultSheetOpen ||
        dailyWordOpen ||
        serviceDrawerOpen ||
        historyOpen
      )
        return;
      event.preventDefault();
      if (event.shiftKey) {
        setJumpMenuOpen(false);
        setPickerOpen(true);
      } else {
        setJumpMenuOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keyboard chapter navigation (desktop "stroll" — hands stay on the keys).
  // Skips when the user is typing, when overlays are open, or with modifier keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable)
          return;
      }
      if (
        pickerOpen ||
        menuOpen ||
        trayOpen ||
        librarySheetOpen ||
        goldDotPeekOpen ||
        vaultSheetOpen ||
        dailyWordOpen ||
        jumpMenuOpen ||
        serviceDrawerOpen ||
        historyOpen
      )
        return;
      event.preventDefault();
      if (event.key === "ArrowLeft") goPrev();
      else goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // One-time gentle onboarding: a useful tip on first reader visit.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(IMMERSIVE_HINT_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = window.setTimeout(() => {
      toast("Tap a verse to open the menu", {
        description: "Bookmark, highlight, copy the reference, or open Selah for reflection.",
        duration: 7000,
      });
      try {
        localStorage.setItem(IMMERSIVE_HINT_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify({ bookIndex, chapter }));
  }, [bookIndex, chapter]);

  useEffect(() => {
    if (!pickerSelection) return;
    safeLocalStorageSet(PICKER_STATE_KEY, JSON.stringify(pickerSelection));
  }, [pickerSelection]);

  useEffect(() => {
    safeLocalStorageSet(VERSION_KEY, version);
  }, [version]);

  useEffect(() => {
    try {
      localStorage.setItem(AGGRESSIVE_PREFETCH_KEY, String(aggressivePrefetch));
    } catch {
      /* ignore */
    }
  }, [aggressivePrefetch]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
    } catch {
      /* ignore */
    }
  }, [history]);

  useEffect(() => {
    if (!bible) return;
    const book = bible.books[bookIndex]?.name;
    if (!book) return;
    safeLocalStorageSet(
      "sanctumiq:reader:anchor",
      JSON.stringify({ book, chapter, verse: selectedVerse ?? null }),
    );
    setLastAnchor({ book, chapter, verse: selectedVerse ?? null });
    // Local-first save + background server sync (no-op if offline / signed out).
    savePosition(
      { book, bookIndex, chapter, verse: selectedVerse ?? null, version },
      user?.id ?? null,
    );
    // Record history entry (deduped by book+chapter inside the helper).
    recordPositionVisit(
      { book, bookIndex, chapter, verse: selectedVerse ?? null, version },
      user?.id ?? null,
    );
    setHistory((current) => {
      const nextEntry = { book, chapter, verse: selectedVerse ?? null };
      const deduped = current.filter(
        (entry) =>
          !(
            entry.book === nextEntry.book &&
            entry.chapter === nextEntry.chapter &&
            entry.verse === nextEntry.verse
          ),
      );
      return [nextEntry, ...deduped].slice(0, 8);
    });
  }, [bible, bookIndex, chapter, selectedVerse, version, user?.id]);

  // On sign-in, pull server position; if newer than local, jump there.
  // URL ?bookIndex=… overrides (deep links win).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!user?.id || !bible) return;
    if (typeof searchParams.bookIndex === "number") {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    const prevBookIndex = bookIndex;
    const prevChapter = chapter;
    const prevVersion = version;
    void hydrateFromServer(user.id).then((pos) => {
      if (!pos) return;
      if (pos.bookIndex === bookIndex && pos.chapter === chapter) return;
      setBookIndex(pos.bookIndex);
      setChapter(pos.chapter);
      if (pos.version === "KJV" || pos.version === "ASV") setVersion(pos.version);
      if (pos.verse) {
        pendingVerseRef.current = pos.verse;
      }
      // Resume toast — confirms cross-device restore and offers an undo.
      const label = `${pos.book} ${pos.chapter}${pos.verse ? `:${pos.verse}` : ""}`;
      const eventBase = {
        userId: user.id,
        book: pos.book,
        chapter: pos.chapter,
        verse: pos.verse,
        version: pos.version,
      };
      trackResumeEvent({ ...eventBase, type: "shown" });
      let undone = false;
      toast.success("Resumed where you left off", {
        description: label,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            undone = true;
            setBookIndex(prevBookIndex);
            setChapter(prevChapter);
            setVersion(prevVersion);
            trackResumeEvent({ ...eventBase, type: "undo" });
          },
        },
        onAutoClose: () => {
          if (!undone) trackResumeEvent({ ...eventBase, type: "accepted" });
        },
        onDismiss: () => {
          if (!undone) trackResumeEvent({ ...eventBase, type: "accepted" });
        },
      });
    });
  }, [user?.id, bible, searchParams.bookIndex, bookIndex, chapter]);

  useEffect(() => {
    const openPicker = () => setPickerOpen(true);
    window.addEventListener("reader:open-picker", openPicker);
    return () => window.removeEventListener("reader:open-picker", openPicker);
  }, []);

  useEffect(() => {
    return () => {
      if (headerActiveTimerRef.current) window.clearTimeout(headerActiveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("reader-native-scroll-hidden");
    document.body.classList.add("reader-native-scroll-hidden");
    return () => {
      document.documentElement.classList.remove("reader-native-scroll-hidden");
      document.body.classList.remove("reader-native-scroll-hidden");
    };
  }, []);

  // Single source of truth for verse positioning. Honors the fixed master
  // header at the top and the audio pill (when expanded) at the bottom so the
  // active verse is never hidden behind chrome. Uses hysteresis to avoid jitter
  // on auto-advance, and anchors mega-verses to the top instead of trying to
  // center them off-screen.
  const scrollVerseIntoSafeView = useCallback(
    (verse: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      requestAnimationFrame(() => {
        const node = document.querySelector<HTMLElement>(
          `[data-reader-version='${version}'][data-reader-verse='${verse}']`,
        );
        if (!node) return;

        const containerRect = container.getBoundingClientRect();
        const verseRect = node.getBoundingClientRect();

        // Header occupies the top of the container; pillEl (if present) the bottom.
        const headerEl = document.querySelector<HTMLElement>("header.fixed");
        const pillEl = document.querySelector<HTMLElement>('[data-audio-bar="expanded"]');
        const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
        const pillHeight = pillEl ? pillEl.getBoundingClientRect().height : 0;

        const TOP_GUTTER = 16;
        const BOTTOM_GUTTER = 24;
        const HYSTERESIS = 8;

        const safeTop = containerRect.top + headerHeight + TOP_GUTTER;
        const safeBottom = containerRect.bottom - pillHeight - BOTTOM_GUTTER;
        const safeZone = Math.max(0, safeBottom - safeTop);

        const verseTop = verseRect.top;
        const verseBottom = verseRect.bottom;
        const verseHeight = verseRect.height;

        // Already comfortably inside the safe zone (with hysteresis): do nothing.
        if (
          verseHeight <= safeZone &&
          verseTop >= safeTop - HYSTERESIS &&
          verseBottom <= safeBottom + HYSTERESIS
        ) {
          return;
        }

        // Mega verse: anchor top instead of centering.
        const targetTopWithinContainer =
          verseHeight > safeZone
            ? verseTop - safeTop + 12
            : verseTop - safeTop - (safeZone - verseHeight) / 2;

        const nextScrollTop = container.scrollTop + targetTopWithinContainer;
        const delta = Math.abs(nextScrollTop - container.scrollTop);
        const reduce =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        container.scrollTo({
          top: nextScrollTop,
          behavior: reduce || delta < 24 ? "auto" : "smooth",
        });
      });
    },
    [version],
  );

  const handleNarratorVerseChange = useCallback(
    (verse: number) => {
      markReaderActive();
      scrollVerseIntoSafeView(verse);
    },
    [scrollVerseIntoSafeView],
  );

  const bookMeta = bible?.books[bookIndex];
  const bookOrder = useMemo(() => (bible ? bible.books.map((b) => b.name) : null), [bible]);
  const stroll = useBookmarkStroll(bookOrder);
  const verses = bible ? getChapter(bible, version, bookIndex, chapter) : [];
  const kjv = verses;
  const readerVoiceEngine = useReaderVoiceEngine();
  const googleNarrator = useScriptureNarrator(kjv, {
    aggressivePrefetch,
    onVerseChange: handleNarratorVerseChange,
  });
  const systemNarrator = useSystemNarrator(kjv, {
    aggressivePrefetch,
    onVerseChange: handleNarratorVerseChange,
  });
  const activeNarrator = readerVoiceEngine === "system-native" ? systemNarrator : googleNarrator;
  const stopGoogleNarrator = googleNarrator.stop;
  const stopSystemNarrator = systemNarrator.stop;

  useEffect(() => {
    if (readerVoiceEngine === "system-native") {
      stopGoogleNarrator();
      return;
    }

    stopSystemNarrator();
  }, [readerVoiceEngine, stopGoogleNarrator, stopSystemNarrator]);

  // When the audio pill expands or retracts, the safe zone changes — re-scroll
  // so the actively-read verse stays visible above the chrome.
  useEffect(() => {
    const v = activeNarrator.currentVerse;
    if (!v) return;
    // Wait a frame so layout reflects the new pill height.
    const id = window.setTimeout(() => scrollVerseIntoSafeView(v), 60);
    return () => window.clearTimeout(id);
  }, [activeNarrator.currentVerse, playbackUI, scrollVerseIntoSafeView]);

  // Suppress the scroll-stop sync briefly after programmatic re-anchors
  // (version swap, narrator follow, etc.) so our own re-scroll doesn't get
  // mistaken for the user landing on a different "top-most" verse and
  // overwrite the saved position.
  const suppressScrollSyncUntilRef = useRef(0);
  const suppressScrollSyncFor = useCallback((ms: number) => {
    const until = Date.now() + ms;
    if (until > suppressScrollSyncUntilRef.current) {
      suppressScrollSyncUntilRef.current = until;
    }
  }, []);

  // Cross-version logic: when user swaps KJV ↔ ASV, keep position but re-pin
  // the active verse. Verse text reflows asynchronously (font metrics, line
  // wrapping shift between translations), so a single pass often fires before
  // the new translation has fully painted. We re-anchor at 80ms, 220ms, and
  // 480ms to catch late layout settling, and suppress scroll-sync for ~700ms
  // so the re-scroll itself can't trigger a stale top-verse save.
  const prevVersionRef = useRef(version);
  useEffect(() => {
    if (prevVersionRef.current === version) return;
    prevVersionRef.current = version;
    const target = selectedVerse ?? visibleVerse ?? activeNarrator.currentVerse ?? 1;
    suppressScrollSyncFor(700);
    const timers = [80, 220, 480].map((delay) =>
      window.setTimeout(() => scrollVerseIntoSafeView(target), delay),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [
    version,
    selectedVerse,
    visibleVerse,
    activeNarrator.currentVerse,
    scrollVerseIntoSafeView,
    suppressScrollSyncFor,
  ]);

  // Sync on scroll-stop: ~600ms after scrolling settles, push the top-most
  // visible verse to the persistence layer (local instant + 1.5s server
  // debounce inside savePosition). Skipped during the suppression window.
  // Ribbon clock — tick once per minute, snapped to the next minute boundary.
  // Keeps the date/time stamp truthful without ever showing a ticking second hand.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60_000);
    }, msUntilNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const scrollSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedPulse, setSavedPulse] = useState(false);
  const savedPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!bookMeta || !visibleVerse) return;
    if (scrollSyncTimerRef.current) clearTimeout(scrollSyncTimerRef.current);
    scrollSyncTimerRef.current = setTimeout(() => {
      if (Date.now() < suppressScrollSyncUntilRef.current) return;
      savePosition(
        { book: bookMeta.name, bookIndex, chapter, verse: visibleVerse, version },
        user?.id ?? null,
      );
      // Ghost UI: a 1.4s gold whisper next to the date ribbon. No layout shift.
      setSavedPulse(true);
      if (savedPulseTimerRef.current) clearTimeout(savedPulseTimerRef.current);
      savedPulseTimerRef.current = setTimeout(() => setSavedPulse(false), 1400);
    }, 600);
    return () => {
      if (scrollSyncTimerRef.current) clearTimeout(scrollSyncTimerRef.current);
    };
  }, [visibleVerse, bookMeta, bookIndex, chapter, version, user?.id]);
  useEffect(
    () => () => {
      if (savedPulseTimerRef.current) clearTimeout(savedPulseTimerRef.current);
    },
    [],
  );

  // Force-flush any pending server write when leaving the page or hiding the
  // tab. Without this, the 1.5s server debounce could swallow the final write.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushPosition();
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushPosition);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushPosition);
      flushPosition();
    };
  }, []);

  // When arriving from a Vault item ("Open in Reader"), the URL carries
  // ?verse=N — scroll to it and select it once verses are rendered.
  const pendingVerseRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof searchParams.verse === "number") pendingVerseRef.current = searchParams.verse;
  }, [searchParams.verse]);
  useEffect(() => {
    const v = pendingVerseRef.current;
    if (!v || !bible || verses.length === 0) return;
    const safe = Math.min(Math.max(v, 1), verses.length);
    pendingVerseRef.current = null;
    const id = window.setTimeout(() => {
      setSelectedVerse(safe);
      setSelectedRange({ start: safe, end: safe });
      setPickerSelection({ bookIndex, chapter, verseStart: safe, verseEnd: safe });
      scrollVerseIntoSafeView(safe);
      setPulsingVerse(safe);
      window.setTimeout(
        () => setPulsingVerse((current) => (current === safe ? null : current)),
        900,
      );
    }, 120);
    return () => window.clearTimeout(id);
  }, [bible, verses.length, bookIndex, chapter, scrollVerseIntoSafeView]);

  const reference = bookMeta ? `${bookMeta.name} ${chapter}` : "";
  const progressLabel = useMemo(() => {
    if (!bookMeta) return "";
    return `${bookMeta.name} ${chapter}:${visibleVerse ?? selectedVerse ?? 1}`;
  }, [bookMeta, chapter, selectedVerse, visibleVerse]);
  const headerTitle = useMemo(() => {
    if (!isReaderActive) {
      const bookName = bookMeta?.name ?? "";
      return buildReferenceLabels(bookName, String(chapter));
    }
    const bookName = bookMeta?.name ?? "";
    // Multi-verse selection always takes precedence
    if (selectedRange && selectedRange.start !== selectedRange.end) {
      return buildReferenceLabels(
        bookName,
        buildVerseSuffix(chapter, selectedRange.start, selectedRange.end),
      );
    }
    // Audio narrator always shows current verse
    if (activeNarrator.currentVerse) {
      return buildReferenceLabels(bookName, buildVerseSuffix(chapter, activeNarrator.currentVerse));
    }
    // While scrolling — show the verse; after 1.5s idle — return to chapter title
    if (!scrollIdle && visibleVerse) {
      return buildReferenceLabels(bookName, buildVerseSuffix(chapter, visibleVerse));
    }
    return buildReferenceLabels(bookName, String(chapter));
  }, [
    activeNarrator.currentVerse,
    bookMeta?.name,
    chapter,
    isReaderActive,
    scrollIdle,
    selectedRange,
    selectedVerse,
    visibleVerse,
  ]);
  const continueReference = lastAnchor
    ? `${lastAnchor.book} ${lastAnchor.chapter}${lastAnchor.verse ? `:${lastAnchor.verse}` : ""}`
    : `${bookMeta?.name ?? ""} ${chapter}`;
  // Load service note when mode activates
  useEffect(() => {
    if (!serviceModeActive || !user) return;
    let active = true;
    supabase
      .from("notes")
      .select("id, body_text")
      .eq("user_id", user.id)
      .eq("scripture_ref", serviceNoteTitle)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!active) return;
        const existing = data?.[0];
        if (existing) {
          setServiceNoteId(existing.id);
          setServiceEntries(parseEntriesFromText(existing.body_text ?? ""));
        }
      });
    return () => {
      active = false;
    };
  }, [serviceModeActive, user, serviceNoteTitle]);

  const {
    highlightedVerses: rawHighlightedVerses,
    hasExactRange,
    toggleRange,
  } = useVerseHighlights({
    userId: user?.id,
    book: bookMeta?.name,
    chapter,
    version,
  });
  const [highlightsEnabled] = useHighlightsEnabled();
  const highlightedVerses = highlightsEnabled ? rawHighlightedVerses : EMPTY_HIGHLIGHTED_VERSES;

  useEffect(() => {
    if (!showPrefetchHint || activeNarrator.status === "idle") return;

    const timer = window.setTimeout(() => {
      setShowPrefetchHint(false);
      safeLocalStorageSet(PREFETCH_HINT_KEY, "true");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [activeNarrator.status, showPrefetchHint]);

  useEffect(() => {
    if (!user || !bookMeta) return;
    supabase
      .from("bookmarks")
      .select("verse,version")
      .eq("user_id", user.id)
      .eq("book", bookMeta.name)
      .eq("chapter", chapter)
      .then(({ data }) => {
        const next = new Set<string>();
        (data ?? []).forEach((bookmark) => next.add(`${bookmark.version}:${bookmark.verse}`));
        setBookmarkedSet(next);
      });
  }, [user, bookMeta, chapter]);

  // Universal bookmark roster — every mark across every book/chapter.
  const refreshAllBookmarks = useCallback(() => {
    if (!user) {
      setAllBookmarks([]);
      return;
    }
    supabase
      .from("bookmarks")
      .select("book,chapter,verse,version")
      .eq("user_id", user.id)
      .order("book", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse", { ascending: true })
      .then(({ data }) => {
        setAllBookmarks((data ?? []) as typeof allBookmarks);
      });
  }, [user]);

  useEffect(() => {
    refreshAllBookmarks();
  }, [refreshAllBookmarks, bookmarkedSet]);

  // Track which verses in this chapter are already saved to ANY vault
  // collection — used to render the small gold folder pip on the verse number.
  const refreshVaultedVerses = useCallback(() => {
    if (!user || !bookMeta) {
      setVaultedVerses(new Set());
      return;
    }
    supabase
      .from("vault_items")
      .select("verse_start,verse_end")
      .eq("user_id", user.id)
      .eq("book", bookMeta.name)
      .eq("chapter", chapter)
      .then(({ data }) => {
        const next = new Set<number>();
        (data ?? []).forEach((row) => {
          const start = row.verse_start ?? null;
          const end = row.verse_end ?? row.verse_start ?? null;
          if (start == null || end == null) return;
          for (let v = start; v <= end; v += 1) next.add(v);
        });
        setVaultedVerses(next);
      });
  }, [user, bookMeta, chapter]);

  useEffect(() => {
    refreshVaultedVerses();
  }, [refreshVaultedVerses]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !bookMeta) return;

    const updateVisibleVerse = () => {
      const verseNodes = Array.from(container.querySelectorAll<HTMLElement>("[data-reader-verse]"));
      if (!verseNodes.length) {
        setVisibleVerse(null);
        return;
      }

      const targetTop = container.getBoundingClientRect().top + 88;
      let nextVerse = Number(verseNodes[0]?.dataset.readerVerse ?? 1);

      for (const node of verseNodes) {
        const verse = Number(node.dataset.readerVerse ?? nextVerse);
        if (node.getBoundingClientRect().top <= targetTop) nextVerse = verse;
        else break;
      }

      setVisibleVerse(nextVerse);

      // Broadcast a normalized scroll ratio so the SermonRail can mirror our
      // vertical position. Uses a window event to stay loosely coupled.
      const scrollable = container.scrollHeight - container.clientHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, container.scrollTop / scrollable)) : 0;
      window.dispatchEvent(new CustomEvent("reader:scroll-ratio", { detail: { ratio } }));

      const didScroll = Math.abs(container.scrollTop - lastScrollTopRef.current) > 2;
      lastScrollTopRef.current = container.scrollTop;
      if (didScroll) {
        markReaderActive();
        setScrollIdle(false);
        if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = setTimeout(() => setScrollIdle(true), 1500);
      }
    };

    updateVisibleVerse();
    container.addEventListener("scroll", updateVisibleVerse, { passive: true });
    window.addEventListener("resize", updateVisibleVerse);

    return () => {
      container.removeEventListener("scroll", updateVisibleVerse);
      window.removeEventListener("resize", updateVisibleVerse);
    };
  }, [bookMeta, chapter, kjv.length]);

  useEffect(() => {
    setJumpVerseDraft(String(visibleVerse ?? selectedVerse ?? 1));
  }, [selectedVerse, visibleVerse, chapter]);

  const promptForSanctuary = () => {
    toast("Sign in to your sanctuary to anchor this note.", {
      description: "Your reflections stay private once you enter.",
      action: {
        label: "Sign in",
        onClick: () => (window.location.href = "/auth?redirect=/reader"),
      },
    });
  };

  // Live header Deep Dive context — memoized so prompt/links only rebuild when
  // the active verse actually changes, not on every scroll tick.
  const liveCurrentRange =
    selectedRange ?? (selectedVerse ? { start: selectedVerse, end: selectedVerse } : null);
  const headerLiveVerse =
    liveCurrentRange?.start ?? activeNarrator.currentVerse ?? visibleVerse ?? null;
  const headerLiveVerseEnd = liveCurrentRange?.end ?? headerLiveVerse;
  const liveBookName = bookMeta?.name ?? "";
  const headerPassageContext: DeepDiveContext = useMemo(
    () => ({
      book: liveBookName,
      chapter,
      verseStart: headerLiveVerse,
      verseEnd: headerLiveVerseEnd,
    }),
    [liveBookName, chapter, headerLiveVerse, headerLiveVerseEnd],
  );
  // Always-valid reference fallback: book + chapter + (live verse range or v1).
  const headerPassageReference = useMemo(() => {
    if (!liveBookName) return "";
    const primary = formatPassageReference(headerPassageContext);
    if (primary) return primary;
    const fallbackVerse = headerLiveVerse ?? 1;
    const fallbackEnd = headerLiveVerseEnd ?? fallbackVerse;
    const range =
      fallbackEnd !== fallbackVerse ? `${fallbackVerse}-${fallbackEnd}` : `${fallbackVerse}`;
    return `${liveBookName} ${chapter}:${range}`;
  }, [headerPassageContext, headerLiveVerse, headerLiveVerseEnd, liveBookName, chapter]);
  const headerDeepDivePrompt = useMemo(() => {
    const verseText = headerLiveVerse
      ? kjv.slice(headerLiveVerse - 1, headerLiveVerseEnd ?? headerLiveVerse).join(" ")
      : "";
    return buildDeepDivePrompt(headerPassageReference, verseText, headerPassageContext);
  }, [headerLiveVerse, headerLiveVerseEnd, kjv, headerPassageReference, headerPassageContext]);
  const headerDeepDiveLinks = useMemo(
    () => buildDeepDiveLinks(headerDeepDivePrompt),
    [headerDeepDivePrompt],
  );

  // Per-book Deep Dive provider memory: each book remembers its own
  // last-used research provider. Stored as a JSON map in localStorage.
  const PROVIDER_MAP_KEY = "sanctumiq:reader:deepdive-provider-map";
  type ProviderLabel = "ChatGPT" | "Perplexity";
  const [providerByBook, setProviderByBook] = useState<Record<string, ProviderLabel>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(PROVIDER_MAP_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, ProviderLabel>) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const preferredProvider: ProviderLabel = providerByBook[liveBookName] ?? "ChatGPT";
  const rememberProvider = (label: ProviderLabel) => {
    setProviderByBook((prev) => {
      const next = { ...prev, [liveBookName]: label };
      safeLocalStorageSet(PROVIDER_MAP_KEY, JSON.stringify(next));
      return next;
    });
  };
  const orderedDeepDiveLinks = useMemo(() => {
    const preferred = headerDeepDiveLinks.find((l) => l.label === preferredProvider);
    const rest = headerDeepDiveLinks.filter((l) => l.label !== preferredProvider);
    return preferred ? [preferred, ...rest] : headerDeepDiveLinks;
  }, [headerDeepDiveLinks, preferredProvider]);

  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);

  // Study Circuit auto-navigate: when the active circuit's current stop changes
  // (via thumb arrows, pill, or programmatic), jump the Reader to that verse.
  // MUST be declared before any early return to preserve hook order.
  const lastCircuitStopRef = useRef<string | null>(null);
  useEffect(() => {
    if (!bible || !studyCircuit.isActive) {
      lastCircuitStopRef.current = null;
      return;
    }
    const stop = studyCircuit.currentStop;
    if (!stop) return;
    const stopKey = `${studyCircuit.circuit?.collectionId}:${studyCircuit.currentIndex}`;
    if (lastCircuitStopRef.current === stopKey) return;

    const targetIndex = bible.books.findIndex((b) => b.name === stop.book);
    if (targetIndex < 0) {
      toast.error(`${stop.book} not in scripture bundle.`);
      return;
    }
    const isFirstRun = lastCircuitStopRef.current === null;
    lastCircuitStopRef.current = stopKey;

    if (isFirstRun) {
      if (targetIndex !== bookIndex) setBookIndex(targetIndex);
      if (stop.chapter !== chapter) setChapter(stop.chapter);
      window.setTimeout(() => jumpToVerse(stop.verseStart), 80);
      return;
    }
    performJumpWithUndo(
      { bookIndex: targetIndex, chapter: stop.chapter, verse: stop.verseStart },
      stop.reference,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyCircuit.isActive, studyCircuit.currentIndex, studyCircuit.circuit?.collectionId, bible]);

  // Daily welcome toast — fires once per calendar day per user, after the
  // reader hydrates. "Good morning, {name} — Wednesday, April 29".
  useEffect(() => {
    if (!bible || !bookMeta) return;
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const storageKey = `sanctumiq:daily-welcome:${user.id}`;
    try {
      if (localStorage.getItem(storageKey) === today) return;
    } catch {
      return;
    }
    const id = window.setTimeout(() => {
      const hour = new Date().getHours();
      const greeting =
        hour < 5
          ? "Peace to you"
          : hour < 12
            ? "Good morning"
            : hour < 17
              ? "Good afternoon"
              : hour < 21
                ? "Good evening"
                : "Peace tonight";
      const name =
        readerProfile.displayName?.trim() || (user.email ? user.email.split("@")[0] : "friend");
      const dateLabel = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      toast.custom(
        () => (
          <div
            role="status"
            className="pointer-events-auto max-w-sm rounded-2xl border border-gold/30 bg-[rgba(14,14,14,0.78)] px-4 py-3 text-xs leading-relaxed text-gold-soft shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150"
          >
            <p className="font-display text-[10px] uppercase tracking-[0.28em] text-gold/70">
              {dateLabel}
            </p>
            <p className="mt-1.5 font-display text-sm text-foreground/90">
              {greeting}, {name}.
            </p>
          </div>
        ),
        { duration: 5500, position: "top-center" },
      );
      try {
        localStorage.setItem(storageKey, today);
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [bible, bookMeta, user, readerProfile.displayName]);

  if (!bible || !bookMeta) return <ReaderSkeleton />;

  const currentRange = liveCurrentRange;
  const activePassage = currentRange
    ? toPassageSelection(currentRange, bookIndex, chapter)
    : (pickerSelection ?? { bookIndex, chapter, verseStart: null, verseEnd: null });
  const showAudioBar =
    activeNarrator.status !== "idle" || activeNarrator.availability === "unavailable";
  const menuReference = currentRange
    ? `${bookMeta.name} ${chapter}:${currentRange.start}${currentRange.end > currentRange.start ? `-${currentRange.end}` : ""}`
    : `${bookMeta.name} ${chapter}`;
  const selectedText = currentRange
    ? kjv.slice(currentRange.start - 1, currentRange.end).join(" ")
    : "";
  const rangeVerseCount = currentRange ? currentRange.end - currentRange.start + 1 : 0;
  const rangeIsHighlighted = currentRange
    ? hasExactRange(currentRange.start, currentRange.end)
    : false;
  const rangeIsBookmarked = currentRange
    ? Array.from({ length: rangeVerseCount }, (_, index) => currentRange.start + index).every(
        (verse) => bookmarkedSet.has(`${version}:${verse}`),
      )
    : false;
  const passageContext = {
    book: bible.books[activePassage.bookIndex]?.name ?? bookMeta.name,
    chapter: activePassage.chapter,
    verseStart: activePassage.verseStart,
    verseEnd: activePassage.verseEnd,
  };

  const logDeepDive = (label: ProviderLabel, href: string) => {
    void deepDiveHistory.log({
      book: liveBookName,
      chapter,
      verse_start: headerLiveVerse,
      verse_end: headerLiveVerseEnd,
      reference_label: headerPassageReference,
      provider: label,
      prompt: headerDeepDivePrompt,
      url: href,
    });
  };

  const openInPreferredProvider = async () => {
    const link =
      headerDeepDiveLinks.find((l) => l.label === preferredProvider) ?? headerDeepDiveLinks[0];
    if (!link) return;
    rememberProvider(link.label);
    logDeepDive(link.label, link.href);
    // Native app first (mobile) with web fallback; clipboard handoff for
    // providers that ignore URL prefill. All centralized in one helper.
    await openDeepDiveLink(link, { reference: headerPassageReference });

    // Sacred notification: user-initiated, high-signal, completion-oriented.
    // Falls back to a plain toast if the notification system rejects (e.g.
    // signed-out reader or muted sanctuary). Skip the duplicate toast for the
    // clipboard-handoff path since we already surfaced one above.
    void notify({
      category: "sacred",
      title: "Your Deep Dive is ready",
      body: `${headerPassageReference} · opened in ${link.label}`,
      action_url: link.href,
      priority: "normal",
      meta: { kind: "deep_dive", provider: link.label, reference: headerPassageReference },
    }).then((result) => {
      if (!result.ok && !link.requiresClipboardHandoff) {
        toast.success(`Opening ${link.label}`, { description: headerPassageReference });
      }
    });
  };

  const openPrintExport = () => {
    if (typeof window === "undefined") return;
    const range = currentRange ?? { start: 1, end: kjv.length };
    const params = new URLSearchParams({
      book: bookMeta.name,
      chapter: String(chapter),
      start: String(range.start),
      end: String(range.end),
      version,
    });
    window.open(`/reader/print?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const copyHeaderReference = async () => {
    try {
      await navigator.clipboard.writeText(headerPassageReference);
      toast.success("Reference copied", { description: headerPassageReference });
    } catch {
      toast.error("Could not copy reference");
    }
  };

  const copyHeaderPrompt = async () => {
    try {
      await navigator.clipboard.writeText(headerDeepDivePrompt);
      toast.success("Prompt copied", { description: headerPassageReference });
    } catch {
      toast.error("Could not copy prompt");
    }
  };

  const shareHeaderReference = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const friendlyText = `Reading ${headerPassageReference} on SanctumIQ — explore this passage with me: ${shareUrl}`;
    const shareData = {
      title: `SanctumIQ — ${headerPassageReference}`,
      text: friendlyText,
      url: shareUrl,
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof (navigator as Navigator).share === "function"
      ) {
        await (navigator as Navigator).share(shareData);
        toast.success("Shared", { description: headerPassageReference });
        return;
      }
      await navigator.clipboard.writeText(friendlyText);
      toast.success("Share link copied", { description: headerPassageReference });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      toast.error("Could not share reference");
    }
  };

  const resetSelection = () => {
    setSelectedVerse(null);
    setSelectedRange(null);
    setRangeAnchor(null);
    setMenuOpen(false);
  };

  const goPrev = () => {
    if (studyCircuit.isActive) {
      if (studyCircuit.currentIndex <= 0) {
        toast("Start of study", { description: studyCircuit.circuit?.collectionTitle });
        return;
      }
      studyCircuit.prev();
      return;
    }
    if (stroll.active && bookMeta) {
      const target = stroll.prev({
        bookIndex,
        chapter,
        verse: visibleVerse ?? selectedVerse ?? null,
      });
      if (!target) {
        toast("Start of bookmarks", { description: "No earlier mark in your stroll." });
        return;
      }
      const targetIdx = bible.books.findIndex((b) => b.name === target.book);
      if (targetIdx >= 0) {
        performJumpWithUndo(
          { bookIndex: targetIdx, chapter: target.chapter, verse: target.verse },
          `${target.book} ${target.chapter}:${target.verse}`,
        );
      }
      return;
    }
    if (chapter > 1) setChapter(chapter - 1);
    else if (bookIndex > 0) {
      const prev = bible.books[bookIndex - 1];
      setBookIndex(bookIndex - 1);
      setChapter(prev.chapterCount);
    }
    resetSelection();
  };

  const goNext = () => {
    if (studyCircuit.isActive) {
      if (studyCircuit.currentIndex >= studyCircuit.total - 1) {
        toast("End of study", {
          description: studyCircuit.circuit?.collectionTitle,
          action: { label: "Exit", onClick: () => studyCircuit.exit() },
        });
        return;
      }
      studyCircuit.next();
      return;
    }
    if (stroll.active && bookMeta) {
      const target = stroll.next({
        bookIndex,
        chapter,
        verse: visibleVerse ?? selectedVerse ?? null,
      });
      if (!target) {
        toast("End of bookmarks", {
          description: "You've reached the last mark in your stroll.",
          action: { label: "Exit Stroll", onClick: () => stroll.setActive(false) },
        });
        return;
      }
      const targetIdx = bible.books.findIndex((b) => b.name === target.book);
      if (targetIdx >= 0) {
        performJumpWithUndo(
          { bookIndex: targetIdx, chapter: target.chapter, verse: target.verse },
          `${target.book} ${target.chapter}:${target.verse}`,
        );
      }
      return;
    }
    if (chapter < bookMeta.chapterCount) setChapter(chapter + 1);
    else if (bookIndex < bible.books.length - 1) {
      setBookIndex(bookIndex + 1);
      setChapter(1);
    }
    resetSelection();
  };

  const toggleBookmarkRange = async () => {
    if (!user || !currentRange) {
      promptForSanctuary();
      return;
    }
    const verses = Array.from(
      { length: currentRange.end - currentRange.start + 1 },
      (_, index) => currentRange.start + index,
    );
    const allSaved = verses.every((verse) => bookmarkedSet.has(`${version}:${verse}`));
    if (allSaved) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("book", bookMeta.name)
        .eq("chapter", chapter)
        .eq("version", version)
        .gte("verse", currentRange.start)
        .lte("verse", currentRange.end);
      if (error) return toast.error(error.message);
      setBookmarkedSet((current) => {
        const next = new Set(current);
        verses.forEach((verse) => next.delete(`${version}:${verse}`));
        return next;
      });
      toast("Bookmark removed");
      return;
    }
    const { error } = await supabase
      .from("bookmarks")
      .insert(
        verses
          .filter((verse) => !bookmarkedSet.has(`${version}:${verse}`))
          .map((verse) => ({ user_id: user.id, book: bookMeta.name, chapter, verse, version })),
      );
    if (error) return toast.error(error.message);
    setBookmarkedSet((current) => {
      const next = new Set(current);
      verses.forEach((verse) => next.add(`${version}:${verse}`));
      return next;
    });
    toast.success("Bookmarked", { description: menuReference });
  };

  const toggleHighlightRange = async () => {
    if (!currentRange) return;
    const result = await toggleRange({
      verseStart: currentRange.start,
      verseEnd: currentRange.end,
    });
    if (!result.ok) {
      promptForSanctuary();
      return;
    }
    toast(result.active ? "Highlight saved" : "Highlight removed", { description: menuReference });
  };

  const handleActivateVerse = (verse: number) => {
    markReaderActive();
    // If extend mode is active (user tapped "Extend selection" in the menu),
    // the next tap completes the range from the anchor — keep the menu open.
    if (rangeAnchor !== null) {
      const start = Math.min(rangeAnchor, verse);
      const end = Math.max(rangeAnchor, verse);
      setSelectedVerse(rangeAnchor);
      setSelectedRange({ start, end });
      setPickerSelection({ bookIndex, chapter, verseStart: start, verseEnd: end });
      setRangeAnchor(null);
      if (end > start) setLastRange({ bookIndex, chapter, start, end });
      setMenuOpen(true);
      return;
    }
    // Fresh tap → single-verse selection, open menu.
    const nextRange = { start: verse, end: verse };
    setSelectedVerse(verse);
    setSelectedRange(nextRange);
    setPickerSelection({
      bookIndex,
      chapter,
      verseStart: nextRange.start,
      verseEnd: nextRange.end,
    });
    setMenuOpen(true);
  };

  // Called from the Quantum menu's "Extend selection" / "Adjust range" button.
  // Anchors at the current selection's start so the next verse tap completes
  // the range without closing the menu.
  const enterRangeExtendMode = () => {
    const anchor = selectedRange?.start ?? selectedVerse;
    if (anchor == null) return;
    setRangeAnchor(anchor);
  };

  const adjustRangeEnd = (delta: 1 | -1) => {
    if (!selectedRange) return;
    const maxVerse = verses.length;
    const newEnd = Math.max(selectedRange.start, Math.min(maxVerse, selectedRange.end + delta));

    if (newEnd === selectedRange.end) {
      const msg =
        delta === 1
          ? `End of ${bookMeta?.name ?? ""} ${chapter}`
          : "Already at the first selected verse";
      toast(msg, { id: "range-clamp", duration: 1800, position: "top-center" });
      return;
    }

    const newRange = { ...selectedRange, end: newEnd };
    setSelectedRange(newRange);
    setPickerSelection({ bookIndex, chapter, verseStart: newRange.start, verseEnd: newRange.end });
    if (newRange.end > newRange.start)
      setLastRange({ bookIndex, chapter, start: newRange.start, end: newRange.end });
  };

  // (Drag-to-commit-range removed — Two-Tap via the menu's Extend control is the
  // canonical multi-verse path now.)

  // Desktop shift+click: extend from current selection's start to the clicked
  // verse without needing to enter extend mode.
  const handleShiftExtend = (verse: number) => {
    markReaderActive();
    const anchor = selectedRange?.start ?? selectedVerse ?? verse;
    const start = Math.min(anchor, verse);
    const end = Math.max(anchor, verse);
    setSelectedVerse(anchor);
    setSelectedRange({ start, end });
    setPickerSelection({ bookIndex, chapter, verseStart: start, verseEnd: end });
    setRangeAnchor(null);
    if (end > start) setLastRange({ bookIndex, chapter, start, end });
    setMenuOpen(true);
  };

  // Restore the most recently committed range from the Quantum menu so the
  // user can continue extending it instead of starting fresh.
  const resumeLastRange = () => {
    if (!lastRange) return;
    if (lastRange.bookIndex !== bookIndex || lastRange.chapter !== chapter) return;
    const { start, end } = lastRange;
    setSelectedVerse(start);
    setSelectedRange({ start, end });
    setPickerSelection({ bookIndex, chapter, verseStart: start, verseEnd: end });
    setRangeAnchor(end);
    setMenuOpen(true);
  };

  const jumpToVerse = (verse: number) => {
    markReaderActive();
    setSelectedVerse(verse);
    setSelectedRange({ start: verse, end: verse });
    setPickerSelection({ bookIndex, chapter, verseStart: verse, verseEnd: verse });
    scrollVerseIntoSafeView(verse);
  };

  // Undo jumps — only manual jumps (header chips/Go input, picker, history).
  // Captures where you were *before* the jump and surfaces a 5s Undo toast.
  const performJumpWithUndo = (
    target: { bookIndex: number; chapter: number; verse: number | null },
    label: string,
  ) => {
    const fromBookIndex = bookIndex;
    const fromChapter = chapter;
    const fromVerse = visibleVerse ?? selectedVerse ?? null;
    const fromBook = bible.books[fromBookIndex]?.name ?? "";
    const sameSpot =
      fromBookIndex === target.bookIndex &&
      fromChapter === target.chapter &&
      (target.verse == null || fromVerse === target.verse);
    if (sameSpot) return;

    // Anchor the destination verse, not whatever the scroll listener
    // happens to see during the jump animation.
    suppressScrollSyncFor(900);

    if (target.bookIndex !== bookIndex) setBookIndex(target.bookIndex);
    if (target.chapter !== chapter) setChapter(target.chapter);
    if (target.verse) {
      window.setTimeout(() => jumpToVerse(target.verse as number), 80);
    } else {
      resetSelection();
    }

    const fromLabel = fromBook
      ? `${fromBook} ${fromChapter}${fromVerse ? `:${fromVerse}` : ""}`
      : "previous spot";
    toast(`Jumped to ${label}`, {
      description: `From ${fromLabel}`,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          suppressScrollSyncFor(900);
          if (fromBookIndex !== bookIndex) setBookIndex(fromBookIndex);
          if (fromChapter !== chapter) setChapter(fromChapter);
          if (fromVerse) {
            window.setTimeout(() => jumpToVerse(fromVerse), 80);
          } else {
            resetSelection();
          }
        },
      },
    });
  };

  const handleHeaderJump = (verse: number) => {
    const safeVerse = Math.min(Math.max(verse, 1), kjv.length);
    setJumpMenuOpen(false);
    performJumpWithUndo(
      { bookIndex, chapter, verse: safeVerse },
      `${bookMeta.name} ${chapter}:${safeVerse}`,
    );
  };

  const handleOpenVerseMenu = (verse: number) => {
    markReaderActive();
    const nextRange =
      selectedRange && verse >= selectedRange.start && verse <= selectedRange.end
        ? selectedRange
        : selectedVerse && selectedVerse !== verse
          ? { start: Math.min(selectedVerse, verse), end: Math.max(selectedVerse, verse) }
          : { start: verse, end: verse };
    setSelectedVerse(verse);
    setSelectedRange(nextRange);
    setPickerSelection({
      bookIndex,
      chapter,
      verseStart: nextRange.start,
      verseEnd: nextRange.end,
    });
    setMenuOpen(true);
  };

  // Long-press behavior:
  //  • If an Active Collection is set → quick-save straight to it with the
  //    Cinematic Bloom + an "Undo / Change" toast (no picker shown).
  //  • Otherwise → open the Add-to-Vault picker so the user can choose.
  const handleLongPressOpenVault = async (verse: number) => {
    markReaderActive();
    if (!user) {
      promptForSanctuary();
      return;
    }
    const nextRange =
      selectedRange && verse >= selectedRange.start && verse <= selectedRange.end
        ? selectedRange
        : { start: verse, end: verse };
    setSelectedVerse(verse);
    setSelectedRange(nextRange);
    setPickerSelection({
      bookIndex,
      chapter,
      verseStart: nextRange.start,
      verseEnd: nextRange.end,
    });
    setMenuOpen(false);

    const activeId = getActiveCollectionId();
    if (!activeId || !bookMeta) {
      // No Active Study yet → fall back to the picker.
      setVaultSheetOpen(true);
      return;
    }

    // Quick-save path.
    const quote = kjv.slice(nextRange.start - 1, nextRange.end).join(" ");
    const ref =
      nextRange.end === nextRange.start
        ? `${bookMeta.name} ${chapter}:${nextRange.start}`
        : `${bookMeta.name} ${chapter}:${nextRange.start}-${nextRange.end}`;
    try {
      const item = await addVerseToCollection(user.id, activeId, {
        book: bookMeta.name,
        chapter,
        verse_start: nextRange.start,
        verse_end: nextRange.end,
        version,
        quote_text: quote,
      });
      // Cinematic Bloom on the saved verse + refresh in-vault pips.
      const bloomVerse = nextRange.start;
      setVaultPulseVerse(bloomVerse);
      window.setTimeout(
        () => setVaultPulseVerse((current) => (current === bloomVerse ? null : current)),
        900,
      );
      refreshVaultedVerses();
      toast(`Saved ${ref} to Vault`, {
        description: "Tap Change to pick a different Study.",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await deleteItem(item.id);
              setVaultedVerses((prev) => {
                const next = new Set(prev);
                for (let v = nextRange.start; v <= nextRange.end; v += 1) next.delete(v);
                return next;
              });
              refreshVaultedVerses();
              toast("Removed from Vault");
            } catch {
              toast.error("Could not undo.");
            }
          },
        },
        cancel: {
          label: "Change",
          onClick: async () => {
            // Roll back the quick-save and open the picker so the user can
            // pick a different Study (and optionally set a new Active).
            try {
              await deleteItem(item.id);
            } catch {
              /* best-effort */
            }
            // Clear active so the picker doesn't auto-quick-save again.
            setActiveCollectionId(null);
            refreshVaultedVerses();
            setVaultSheetOpen(true);
          },
        },
      });
    } catch {
      toast.error("Could not save to Vault.");
      // Fall back to picker so the user isn't stranded.
      setVaultSheetOpen(true);
    }
  };

  const handleJumpToHistory = (entry: ReaderAnchor) => {
    const targetIndex = bible.books.findIndex((book) => book.name === entry.book);
    if (targetIndex === -1) return;
    performJumpWithUndo(
      { bookIndex: targetIndex, chapter: entry.chapter, verse: entry.verse ?? null },
      `${entry.book} ${entry.chapter}${entry.verse ? `:${entry.verse}` : ""}`,
    );
  };

  return (
    <AppShell
      hideTopNav
      bottomNavClassName={immersive ? "translate-y-full pointer-events-none opacity-0" : undefined}
    >
      {/* "Return to reading" banner — appears after a Deep Dive launch. */}
      <ReturnToReadingBanner />

      {/* Thumb-zone paging arrows — floating, ghosted, always-on. */}
      {!pickerOpen &&
        !menuOpen &&
        !trayOpen &&
        !librarySheetOpen &&
        !goldDotPeekOpen &&
        !vaultSheetOpen &&
        !dailyWordOpen && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label={
                stroll.active
                  ? "Previous bookmark"
                  : studyCircuit.isActive
                    ? "Previous verse in study"
                    : "Previous chapter"
              }
              className={cn(
                "fixed left-2 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:bg-gold/10 hover:text-gold active:scale-95 active:text-gold md:left-4 md:top-1/2 md:-translate-y-1/2",
                studyCircuit.isActive || stroll.active
                  ? "text-gold/70 drop-shadow-[0_0_8px_rgba(201,168,76,0.45)]"
                  : "text-gold-soft/35",
              )}
              style={{
                bottom:
                  "calc(env(safe-area-inset-bottom) + clamp(5.25rem, 11svh, 6.75rem) + 0.75rem)",
              }}
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={
                stroll.active
                  ? "Next bookmark"
                  : studyCircuit.isActive
                    ? "Next verse in study"
                    : "Next chapter"
              }
              className={cn(
                "fixed right-2 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:bg-gold/10 hover:text-gold active:scale-95 active:text-gold md:right-4 md:top-1/2 md:-translate-y-1/2",
                studyCircuit.isActive || stroll.active
                  ? "text-gold/70 drop-shadow-[0_0_8px_rgba(201,168,76,0.45)]"
                  : "text-gold-soft/35",
              )}
              style={{
                bottom:
                  "calc(env(safe-area-inset-bottom) + clamp(5.25rem, 11svh, 6.75rem) + 0.75rem)",
              }}
            >
              <ChevronRight className="h-7 w-7" strokeWidth={1.5} />
            </button>
          </>
        )}

      {/* Immersive escape hatch — ghosted Tray icon stays reachable so the user
          can always exit immersive mode without remembering the double-tap gesture. */}
      {immersive && !librarySheetOpen && (
        <button
          type="button"
          onClick={() => setLibrarySheetOpen(true)}
          aria-label="Open library"
          className="fixed right-2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 inline-flex h-10 w-10 items-center justify-center rounded-full text-gold-soft/30 transition-all duration-200 hover:bg-gold/10 hover:text-gold/80 active:scale-95"
        >
          <LibraryIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}

      <div
        className="fixed inset-y-0 right-0 z-30 w-8 touch-none"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          trayGestureStartRef.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (!trayGestureStartRef.current || librarySheetOpen) return;
          const deltaX = trayGestureStartRef.current.x - event.clientX;
          const deltaY = Math.abs(trayGestureStartRef.current.y - event.clientY);
          if (deltaX > 28 && deltaY < 64) {
            trayGestureStartRef.current = null;
            setLibrarySheetOpen(true);
          }
        }}
        onPointerUp={() => {
          trayGestureStartRef.current = null;
        }}
      />

      <MasterHeader
        className={cn(immersive && "pointer-events-none -translate-y-full opacity-0")}
        left={
          <Fragment>
            <button
              type="button"
              onClick={handleSmartBack}
              aria-label="Go back"
              className="inline-flex h-9 min-[400px]:h-10 sm:h-11 shrink-0 items-center gap-1 px-1 sm:px-1.5 text-gold-soft transition-colors hover:text-gold"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline font-display text-[11px] uppercase tracking-[0.22em] text-gold/75">
                Back
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDailyWordOpen(true)}
              aria-label="Daily Word"
              className="inline-flex h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center text-gold-soft transition-colors hover:text-gold"
            >
              <Sunrise className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => quickSearch.setOpen(true)}
              aria-label="Quick search scripture (Cmd/Ctrl+K)"
              title="Quick search · ⌘K"
              className="inline-flex h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center text-gold-soft transition-colors hover:text-gold"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setGoldDotPeekOpen(true)}
              aria-label="Recent reading locations"
              title="Recent · Quick-Peek"
              className="group relative inline-flex h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full bg-gold shadow-[0_0_10px_rgba(201,168,76,0.65)] transition-transform duration-200 group-hover:scale-125"
              />
            </button>
          </Fragment>
        }
        title={
          stroll.active ? (
            <StrollProgressPill
              current={
                stroll.positionOf({
                  bookIndex,
                  chapter,
                  verse: visibleVerse ?? selectedVerse ?? null,
                }).current
              }
              total={
                stroll.positionOf({
                  bookIndex,
                  chapter,
                  verse: visibleVerse ?? selectedVerse ?? null,
                }).total
              }
              onExit={() => {
                stroll.setActive(false);
                toast("Bookmark Stroll off");
              }}
            />
          ) : (
            <div
              className={cn(
                "group/anchor inline-flex min-w-0 max-w-full items-center gap-x-2.5 rounded-full border px-4 py-1.5 backdrop-blur-md transition-all duration-300 ease-out motion-reduce:transition-none sm:px-5 sm:py-2",
                "hover:border-gold/55 hover:bg-gold/[0.09] hover:shadow-[0_0_26px_rgba(201,168,76,0.32)] active:bg-gold/[0.12] active:shadow-[0_0_34px_rgba(201,168,76,0.42)]",
                studyCircuit.isActive && studyCircuit.circuit
                  ? cn(
                      anchorDiscovered ? "border-gold/55" : "border-gold/15",
                      "bg-gold/[0.07] shadow-[0_0_28px_rgba(201,168,76,0.38)]",
                    )
                  : cn(
                      anchorDiscovered ? "border-gold/30" : "border-gold/12",
                      "bg-gold/[0.05] shadow-[0_0_18px_rgba(201,168,76,0.18)]",
                    ),
              )}
            >
              <Popover open={jumpMenuOpen} onOpenChange={setJumpMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Open passage shortcuts for ${headerTitle.full}. Keyboard: G`}
                    aria-keyshortcuts="g"
                    title="Tap to jump · press G"
                    data-anchor-discovered={anchorDiscovered ? "1" : "0"}
                    className={cn(
                      "group relative inline-flex min-w-0 items-center justify-center rounded-full text-center text-foreground transition-all duration-300 hover:text-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/55",
                      !anchorDiscovered &&
                        "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-gold/50 after:animate-pulse",
                    )}
                  >
                    <span
                      className="block truncate font-display text-gold-soft transition-all duration-300 ease-out motion-reduce:transition-none"
                      style={{
                        // Header title scales with the user's text-size preference
                        // (a/A menu). Base: clamp(1rem, 4.5vw + .25rem, 1.5rem),
                        // multiplied by the active scale ratio (vs 18px standard).
                        // Header title scales gently with text-size, but caps at the
                        // "Large" ratio so Pulpit/Presentation tiers don't overflow
                        // the pill or collide with the icon clusters. Verse body
                        // still scales to full Presentation size.
                        fontSize: `calc(clamp(1rem, 4.5vw + 0.25rem, 1.5rem) * ${Math.min(TEXT_SCALE_STYLES[scale].px, 22) / 18})`,
                        textShadow: "0 0 18px rgba(201,168,76,0.28), 0 0 6px rgba(201,168,76,0.18)",
                      }}
                    >
                      <span className="min-[400px]:hidden">{headerTitle.short}</span>
                      <span className="hidden min-[400px]:inline">{headerTitle.full}</span>
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  sideOffset={10}
                  className="w-64 border-gold/14 bg-obsidian/96 p-3 backdrop-blur-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/70">
                          Book · Chapter · Verse
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Jump to a verse or open the full passage picker.
                        </p>
                      </div>
                      <kbd className="shrink-0 rounded border border-gold/25 bg-background/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold-soft/80">
                        G
                      </kbd>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setJumpMenuOpen(false);
                        setPickerOpen(true);
                      }}
                      className="inline-flex h-9 w-full items-center justify-center rounded-md border border-gold/18 bg-background/24 px-3 text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/10"
                    >
                      Select passage
                    </button>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Jump to verse in ${bookMeta.name} ${chapter}`}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={jumpVerseDraft}
                        onChange={(event) =>
                          setJumpVerseDraft(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            handleHeaderJump(Number(jumpVerseDraft || "1"));
                        }}
                        className="h-9 w-full rounded-md border border-gold/14 bg-background/30 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/35"
                        placeholder={`Verse 1-${kjv.length}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleHeaderJump(Number(jumpVerseDraft || "1"))}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-gold/18 bg-gold/10 px-3 text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/16"
                      >
                        Go
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Start", verse: 1 },
                        { label: "Here", verse: visibleVerse ?? selectedVerse ?? 1 },
                        { label: "End", verse: kjv.length },
                      ].map(({ label, verse }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleHeaderJump(verse)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-gold/14 bg-background/24 px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-gold/24 hover:text-gold-soft"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Recent jump history — last 5 distinct book/chapter visits.
                    Skip the entry that matches the current location. */}
                    {(() => {
                      const recents = anchorHistory.entries.filter(
                        (entry) => !(entry.bookIndex === bookIndex && entry.chapter === chapter),
                      );
                      if (anchorHistory.loading && recents.length === 0) return null;
                      if (recents.length === 0) return null;
                      return (
                        <div className="border-t border-gold/10 pt-3">
                          <p className="mb-1.5 text-[10px] uppercase tracking-[0.24em] text-gold/65">
                            Recent jumps
                          </p>
                          <ul className="space-y-1">
                            {recents.slice(0, 5).map((entry) => (
                              <li key={`${entry.book}-${entry.chapter}-${entry.visitedAt}`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setJumpMenuOpen(false);
                                    resetSelection();
                                    performJumpWithUndo(
                                      {
                                        bookIndex: entry.bookIndex,
                                        chapter: entry.chapter,
                                        verse: entry.verse,
                                      },
                                      `${entry.book} ${entry.chapter}`,
                                    );
                                  }}
                                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-gold/8 hover:text-gold-soft"
                                >
                                  <span className="truncate">
                                    {entry.book} {entry.chapter}
                                    {entry.verse ? `:${entry.verse}` : ""}
                                  </span>
                                  <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                                    {entry.version}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
              {studyCircuit.isActive && studyCircuit.circuit && (
                <>
                  <span aria-hidden="true" className="h-4 w-px shrink-0 bg-gold/40" />
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/vault" })}
                    aria-label={`Study circuit: ${studyCircuit.circuit.collectionTitle}. Open in Vault.`}
                    className="shrink-0 font-display text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:text-gold sm:text-xs"
                  >
                    {studyCircuit.currentIndex + 1} of {studyCircuit.total}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      studyCircuit.exit();
                      toast("Study circuit ended");
                    }}
                    aria-label="Exit study circuit"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gold-soft/70 transition-colors hover:bg-gold/12 hover:text-gold"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )
        }
        right={
          <Fragment>
            <div className="flex items-center gap-0 min-[400px]:gap-0.5">
              <button
                type="button"
                onClick={() => setLibrarySheetOpen((v) => !v)}
                aria-label={
                  librarySheetOpen
                    ? `Close library for ${bookMeta.name} ${chapter}`
                    : `Open library for ${bookMeta.name} ${chapter}`
                }
                aria-expanded={librarySheetOpen}
                aria-controls="reader-library-sheet"
                aria-haspopup="dialog"
                className={cn(
                  "relative inline-flex h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
                  librarySheetOpen ? "text-gold" : "text-gold-soft hover:text-gold",
                )}
              >
                <LibraryIcon className="h-5 w-5 animate-scale-in" aria-hidden="true" />
                {librarySheetOpen && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_8px_rgba(201,168,76,0.7)] animate-pulse"
                  />
                )}
              </button>
            </div>

            <ThemeToggleButton />

            <button
              type="button"
              onClick={() => activeNarrator.play(currentRange?.start)}
              aria-label={`Listen to ${menuReference}`}
              className="inline-flex h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center text-gold-soft transition-colors hover:text-gold xl:hidden"
            >
              <Headphones className="h-5 w-5" />
            </button>

            {/* Desktop only: consolidated Tools dropdown — Listen, Companion, Workspace, Rail toggle. */}
            <div className="relative hidden xl:inline-flex">
              <Popover open={toolsMenuOpen} onOpenChange={setToolsMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Reader tools"
                    aria-haspopup="menu"
                    aria-expanded={toolsMenuOpen}
                    title="Tools"
                    className={cn(
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gold-soft transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
                      (toolsMenuOpen || companionOpen || !railCollapsed) && "text-gold",
                    )}
                  >
                    <Settings2 className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={10}
                  className="w-64 rounded-2xl border border-white/5 bg-[rgba(12,12,12,0.94)] p-2 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                  <div className="mb-1 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-gold/65">
                    Tools
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      activeNarrator.play(currentRange?.start);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-gold/10 hover:text-gold-soft"
                  >
                    <Headphones className="h-4 w-4 text-gold-soft" />
                    Listen to passage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      toggleCompanion();
                    }}
                    aria-pressed={companionOpen}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-gold/10 hover:text-gold-soft",
                      companionOpen && "text-gold",
                    )}
                  >
                    <NotebookPen className="h-4 w-4 text-gold-soft" />
                    {companionOpen ? "Close companion notes" : "Open companion notes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      window.dispatchEvent(new Event("sermon-rail:toggle"));
                    }}
                    aria-pressed={!railCollapsed}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-gold/10 hover:text-gold-soft",
                      !railCollapsed && "text-gold",
                    )}
                  >
                    <PanelRightOpen className="h-4 w-4 text-gold-soft" />
                    {railCollapsed ? "Expand workspace rail" : "Collapse workspace rail"}
                    <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold/55">
                      Alt R
                    </span>
                  </button>
                  <Link
                    to={user ? "/workspace" : "/auth"}
                    search={user ? undefined : { redirect: "/workspace" }}
                    onClick={() => {
                      setToolsMenuOpen(false);
                      if (!workspaceHintSeen) {
                        setWorkspaceHintSeen(true);
                        try {
                          localStorage.setItem("sanctumiq:workspace-shortcut:seen", "1");
                        } catch {
                          /* ignore */
                        }
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-gold/10 hover:text-gold-soft"
                  >
                    <BookOpenCheck className="h-4 w-4 text-gold-soft" />
                    Open Workspace
                    <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold/55">
                      W
                    </span>
                  </Link>
                </PopoverContent>
              </Popover>
              {!workspaceHintSeen && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap rounded-full border border-white/10 bg-[rgba(14,14,14,0.9)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold-soft shadow-[0_8px_22px_rgba(0,0,0,0.4)] backdrop-blur-md animate-fade-in"
                >
                  Press W
                </span>
              )}
            </div>
            <div className="hidden xl:inline-flex ml-1">
              <AvatarMenu />
            </div>
          </Fragment>
        }
      />

      <div
        ref={scrollContainerRef}
        className={cn(
          "scrollbar-none h-dvh overflow-y-auto overscroll-contain",
          showAudioBar && playbackUI === "expanded"
            ? "pb-[calc(env(safe-area-inset-bottom)+clamp(10.5rem,24svh,14rem))] md:pb-36 lg:pb-32"
            : "pb-[calc(env(safe-area-inset-bottom)+clamp(5.25rem,11svh,6.75rem))] md:pb-14 lg:pb-12",
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-3xl px-5 pb-[clamp(3rem,7svh,4.5rem)] pt-[calc(env(safe-area-inset-top)+3.75rem)] transition-[margin,padding,max-width] duration-200 ease-out motion-reduce:transition-none md:px-8 md:pt-[calc(env(safe-area-inset-top)+5.5rem)] lg:px-6 lg:pt-[calc(env(safe-area-inset-top)+5rem)]",
            libraryDockedAndOpen && "lg:pr-[396px] lg:max-w-[calc(100%-380px)]",
            companionOpen && "xl:pr-[396px] xl:max-w-[calc(100%-380px)]",
            // Cinematic restoration: text stays dead-center on the viewport.
            // The SermonRail floats over the right edge as an overlay (no margin reserved).
            showAudioBar ? "md:pb-28 lg:pb-24" : "md:pb-10 lg:pb-8",
            focusMode && "max-w-2xl",
          )}
        >
          {/* Meta bar — flat (scrolls with page), tucked top-right. Etched look at low opacity. */}
          <div
            className={cn(
              "mb-3 flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/45 transition-opacity duration-300",
              focusMode && "opacity-0",
            )}
          >
            <span>{VERSION_LABELS[version]}</span>
            <span className="text-gold/20">•</span>
            <TextSizeMenu />
            <span className="text-gold/20">•</span>
            <button
              type="button"
              onClick={openPrintExport}
              aria-label="Print this chapter"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/45 hover:text-gold-soft transition-colors"
            >
              Print
            </button>
          </div>
          {!focusMode && (
            <div className="mb-2 flex justify-center">
              <ActiveCollectionChip />
            </div>
          )}
          {currentRange && !focusMode && (
            <div className="mb-4 text-center text-[10px] uppercase tracking-[0.24em] text-gold/80">
              Selection · {menuReference}
            </div>
          )}
          {searchParams.highlight && !focusMode && (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/reader",
                    search: { bookIndex, chapter, verse: searchParams.verse },
                    replace: true,
                  })
                }
                className="hairline inline-flex items-center gap-2 rounded-full bg-obsidian-elevated/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-soft backdrop-blur-xl transition-colors hover:bg-gold/10"
                aria-label="Clear search highlight"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(201,168,76,0.7)]" />
                Highlighting &ldquo;{searchParams.highlight}&rdquo;
                <X className="h-3 w-3 opacity-70" />
              </button>
            </div>
          )}
          {showPrefetchHint && activeNarrator.status !== "idle" && !focusMode && (
            <div className="mb-4 flex justify-center">
              <div className="hairline rounded-full bg-obsidian-elevated/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-xl">
                Verse dots pulse while warming, then glow when ready
              </div>
            </div>
          )}
          <div className="mb-2 flex justify-center">
            <div className="relative inline-flex items-center">
              <p
                className="font-display text-[10px] uppercase tracking-[0.4em] text-muted-foreground/70"
                aria-label={`Today is ${now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
              >
                {now.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                <span className="mx-2 text-gold/40" aria-hidden>
                  ·
                </span>
                {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.32em] text-gold/70 transition-opacity duration-700 ease-out motion-reduce:transition-none",
                  savedPulse ? "opacity-100" : "opacity-0",
                )}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={2.25} />
                <span className="hidden sm:inline">Saved</span>
              </span>
              <span className="sr-only" aria-live="polite">
                {savedPulse ? "Position saved" : ""}
              </span>
            </div>
          </div>
          <div className="relative">
            <QuantumVerseColumn
              version={version}
              verses={kjv}
              bookmarkedSet={bookmarkedSet}
              highlightedVerses={highlightedVerses}
              selectedVerse={selectedVerse}
              selectedRange={selectedRange}
              rangeAnchor={rangeAnchor}
              currentlyReading={activeNarrator.currentVerse}
              onActivateVerse={handleActivateVerse}
              onOpenVerseMenu={handleOpenVerseMenu}
              onLongPressOpenVault={handleLongPressOpenVault}
              pulsingVerse={pulsingVerse}
              vaultPulseVerse={vaultPulseVerse}
              vaultedVerses={vaultedVerses}
              prefetchedVerses={activeNarrator.prefetchedVerses}
              bufferingVerses={activeNarrator.bufferingVerses}
              highlightTerm={searchParams.highlight ?? null}
              onHoverBookmark={handleLongPressOpenVault}
              onHoverDeepDive={handleOpenVerseMenu}
              onShiftExtend={handleShiftExtend}
            />
          </div>
        </div>
      </div>

      <ReaderCompanionPane
        open={companionOpen}
        onClose={toggleCompanion}
        userId={user?.id ?? null}
        book={bookMeta.name}
        chapter={chapter}
        reference={`${bookMeta.name} ${chapter}`}
        initialTab={companionInitialTab}
      />

      <BlueprintSheet
        open={blueprintSheetOpen}
        onClose={() => setBlueprintSheetOpen(false)}
        userId={user?.id ?? null}
        book={bookMeta.name}
        chapter={chapter}
        reference={`${bookMeta.name} ${chapter}`}
      />

      <ReaderThreadScroll
        book={bookMeta.name}
        chapter={chapter}
        verseCount={kjv.length}
        scrollContainerRef={scrollContainerRef}
        onJumpToVerse={jumpToVerse}
      />

      {showAudioBar && (
        <AudioBar
          status={activeNarrator.status}
          currentVerse={activeNarrator.currentVerse}
          totalVerses={kjv.length}
          reference={reference}
          voiceLabel={activeNarrator.voiceLabel}
          availability={activeNarrator.availability}
          errorMessage={activeNarrator.errorMessage}
          mode={playbackUI}
          onPlay={() => activeNarrator.play(currentRange?.start)}
          onPause={activeNarrator.pause}
          onResume={activeNarrator.resume}
          onStop={() => {
            activeNarrator.stop();
            setPlaybackUI("expanded");
          }}
          onRetract={() => setPlaybackUI("retracted")}
          onExpand={() => setPlaybackUI("expanded")}
          onSkipNext={activeNarrator.skipNext}
          onSkipPrev={activeNarrator.skipPrev}
        />
      )}

      <ReaderLibrarySheet
        open={librarySheetOpen}
        onOpenChange={setLibrarySheetOpen}
        docked={libraryDocked}
        onToggleDocked={toggleLibraryDocked}
        bookmarks={Array.from(
          new Set(
            allBookmarks
              .filter((b) => b.book === bookMeta.name && b.chapter === chapter)
              .map((b) => b.verse),
          ),
        ).sort((a, b) => a - b)}
        allBookmarks={allBookmarks}
        onDeleteBookmark={async (entry) => {
          if (!user) return;
          let q = supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("book", entry.book)
            .eq("chapter", entry.chapter)
            .eq("verse", entry.verse);
          if (entry.version) q = q.eq("version", entry.version);
          const { error } = await q;
          if (error) {
            toast.error(error.message);
            return;
          }
          // Optimistic local update
          setAllBookmarks((current) =>
            current.filter(
              (b) =>
                !(
                  b.book === entry.book &&
                  b.chapter === entry.chapter &&
                  b.verse === entry.verse &&
                  (entry.version ? b.version === entry.version : true)
                ),
            ),
          );
          if (entry.book === bookMeta.name && entry.chapter === chapter) {
            setBookmarkedSet((current) => {
              const next = new Set(current);
              if (entry.version) {
                next.delete(`${entry.version}:${entry.verse}`);
              } else {
                Array.from(next).forEach((k) => {
                  if (k.endsWith(`:${entry.verse}`)) next.delete(k);
                });
              }
              return next;
            });
          }
          toast("Bookmark removed");
        }}
        history={history}
        verses={kjv}
        book={bookMeta.name}
        chapter={chapter}
        currentVerse={
          studyCircuit.isActive && studyCircuit.currentStop
            ? studyCircuit.currentStop.verseStart
            : (visibleVerse ?? selectedVerse ?? null)
        }
        immersive={immersive}
        focusMode={focusMode}
        serviceModeActive={serviceModeActive}
        strollActive={stroll.active}
        showVerseDotHelp={showVerseDotHelp}
        deepDiveProvider={preferredProvider}
        deepDivePassageContext={headerPassageContext}
        deepDivePassageReference={headerPassageReference}
        onJumpToVerse={jumpToVerse}
        onJumpToHistory={handleJumpToHistory}
        onJumpToCurrent={() => {
          const target =
            studyCircuit.isActive && studyCircuit.currentStop
              ? studyCircuit.currentStop.verseStart
              : (visibleVerse ?? selectedVerse ?? 1);
          jumpToVerse(target);
        }}
        onOpenNotes={() => navigate({ to: "/notes" })}
        onDeepDiveHandshake={openInPreferredProvider}
        onPrint={openPrintExport}
        onOpenVault={() => navigate({ to: "/vault" })}
        onOpenBlueprint={handleOpenBlueprint}
        onToggleServiceMode={toggleServiceMode}
        onToggleImmersive={() => setImmersive((current) => !current)}
        onToggleFocusMode={() => setFocusMode((current) => !current)}
        onToggleStroll={() => {
          const next = !stroll.active;
          stroll.setActive(next);
          if (next) {
            void stroll.refresh();
            toast("Bookmark Stroll on", {
              description: "Arrows now jump between bookmarks (Genesis → Revelation).",
            });
          } else {
            toast("Bookmark Stroll off");
          }
        }}
        onResetVerseDotHint={() => {
          setShowPrefetchHint(true);
          setShowVerseDotHelp(true);
          safeLocalStorageRemove(PREFETCH_HINT_KEY);
          safeLocalStorageRemove(VERSE_DOT_HELP_DISMISSED_KEY);
          toast("Verse-dot guidance reset", {
            description: "The hint will appear again the next time playback starts.",
          });
        }}
      />

      <GoldDotPeek
        open={goldDotPeekOpen}
        onClose={() => setGoldDotPeekOpen(false)}
        resumeLabel={continueReference}
        onResume={() => {
          if (lastAnchor) {
            const targetIdx = bible.books.findIndex((b) => b.name === lastAnchor.book);
            if (targetIdx >= 0) {
              performJumpWithUndo(
                { bookIndex: targetIdx, chapter: lastAnchor.chapter, verse: lastAnchor.verse },
                continueReference,
              );
            }
          }
        }}
        onJump={(entry) => {
          if (
            entry.version &&
            entry.version !== version &&
            (entry.version === "KJV" || entry.version === "ASV")
          ) {
            setVersion(entry.version);
          }
          performJumpWithUndo(
            { bookIndex: entry.bookIndex, chapter: entry.chapter, verse: entry.verse },
            `${entry.book} ${entry.chapter}${entry.verse ? `:${entry.verse}` : ""}`,
          );
        }}
        onSaveResumeLater={() => {
          const currentBookName = bible.books[bookIndex]?.name;
          if (!currentBookName) return;
          const currentVerse = visibleVerse ?? selectedVerse ?? null;
          const label = `${currentBookName} ${chapter}${currentVerse ? `:${currentVerse}` : ""}`;
          saveResumeLater({
            label,
            book: currentBookName,
            bookIndex,
            chapter,
            verse: currentVerse,
            version,
          });
          toast.success("Saved for later", {
            description: `${label} · ${version}`,
            duration: 3000,
          });
        }}
      />

      {/* Daily Word Sheet */}
      {dailyWordOpen && (
        <DailyWordSheet
          onClose={() => setDailyWordOpen(false)}
          onNavigateToVerse={(bookIndex, chapter, verse) => {
            setBookIndex(bookIndex);
            setChapter(chapter);
            if (verse) {
              setSelectedVerse(verse);
              setPulsingVerse(verse);
              setTimeout(() => scrollVerseIntoSafeView(verse), 120);
            } else {
              setSelectedVerse(null);
            }
          }}
        />
      )}

      {/* Service Drawer */}
      {serviceModeActive && user && (
        <ServiceDrawer
          userId={user.id}
          open={serviceDrawerOpen}
          onOpenChange={(v) => setServiceDrawerOpen(v)}
          noteId={serviceNoteId}
          noteTitle={serviceNoteTitle}
          entries={serviceEntries}
          onEntryAdded={(e) => setServiceEntries((prev) => [...prev, e])}
          onNoteReady={(id) => setServiceNoteId(id)}
        />
      )}

      {/* Altar — floating action, one tap to lay it down */}
      {user && (
        <button
          onClick={() => setAltarOpen(true)}
          aria-label="Open the Altar"
          className="fixed bottom-36 right-4 z-40 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-gold/25 bg-[rgba(12,12,12,0.88)] shadow-[0_0_20px_rgba(201,168,76,0.2)] backdrop-blur-xl transition-all hover:border-gold/45 hover:shadow-[0_0_28px_rgba(201,168,76,0.35)] active:scale-95 md:bottom-20"
        >
          <LockIcon className="h-4 w-4 text-gold" strokeWidth={1.5} />
        </button>
      )}
      <AltarModal open={altarOpen} onOpenChange={setAltarOpen} />

      <Suspense fallback={null}>
        {menuOpen && currentRange && (
          <QuantumMenu
            reference={menuReference}
            verseText={selectedText}
            passageContext={passageContext}
            verseCount={rangeVerseCount}
            isHighlighted={rangeIsHighlighted}
            isBookmarked={rangeIsBookmarked}
            focusMode={focusMode}
            onHighlight={toggleHighlightRange}
            onBookmark={toggleBookmarkRange}
            onClose={() => {
              setRangeAnchor(null);
              setMenuOpen(false);
            }}
            extendActive={rangeAnchor !== null}
            onExtendRange={enterRangeExtendMode}
            onRangeAdjust={adjustRangeEnd}
            resumeLastRangeLabel={
              lastRange &&
              lastRange.bookIndex === bookIndex &&
              lastRange.chapter === chapter &&
              !(
                currentRange &&
                currentRange.start === lastRange.start &&
                currentRange.end === lastRange.end
              )
                ? `${bookMeta.name} ${chapter}:${lastRange.start}–${lastRange.end}`
                : null
            }
            onResumeLastRange={resumeLastRange}
            serviceModeActive={serviceModeActive}
            onAddToServiceNote={handleAddToServiceNote}
            onAddToVault={
              user
                ? () => {
                    setMenuOpen(false);
                    setVaultSheetOpen(true);
                  }
                : undefined
            }
            onDraftSermon={
              hasAnyRole(["minister", "church_partner", "admin"])
                ? () => {
                    setMenuOpen(false);
                    void navigate({
                      to: "/workspace/sermons/choice",
                      search: {
                        scripture: menuReference,
                        scriptureText: selectedText,
                        path: undefined,
                      },
                    });
                  }
                : undefined
            }
            onCreatePoem={
              user
                ? () => {
                    setMenuOpen(false);
                    setRangeAnchor(null);
                    const range =
                      currentRange ??
                      (selectedVerse ? { start: selectedVerse, end: selectedVerse } : null);
                    void navigate({
                      to: "/notes",
                      search: {
                        poem: 1,
                        scripture: menuReference,
                        scriptureText: selectedText,
                        book: bookMeta?.name,
                        chapter,
                        verseStart: range?.start,
                        verseEnd: range?.end,
                      },
                    });
                  }
                : undefined
            }
            onToggleImmersive={() => {
              setImmersive((current) => !current);
              setMenuOpen(false);
            }}
            immersiveActive={immersive}
            onCopyLink={() => {
              const range =
                currentRange ??
                (selectedVerse ? { start: selectedVerse, end: selectedVerse } : null);
              const params = new URLSearchParams();
              params.set("bookIndex", String(bookIndex));
              params.set("chapter", String(chapter));
              if (range) params.set("verse", String(range.start));
              const url = `${window.location.origin}/reader?${params.toString()}`;
              const fallback = () => {
                const ta = document.createElement("textarea");
                ta.value = url;
                ta.setAttribute("readonly", "");
                ta.style.position = "absolute";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                try {
                  document.execCommand("copy");
                } catch {
                  /* ignore */
                }
                document.body.removeChild(ta);
              };
              const done = () => toast.success(`Link copied · ${menuReference}`);
              if (navigator.clipboard?.writeText) {
                navigator.clipboard
                  .writeText(url)
                  .then(done)
                  .catch(() => {
                    fallback();
                    done();
                  });
              } else {
                fallback();
                done();
              }
            }}
          />
        )}

        {pickerOpen && (
          <BookPicker
            books={bible.books}
            currentBook={bookIndex}
            currentChapter={chapter}
            continueReference={continueReference}
            version={version}
            onVersionChange={(next) => setVersion(next)}
            getVerseCount={(b, c) => getChapter(bible, version, b, c).length}
            onPick={(b, c, v) => {
              const targetName = bible.books[b]?.name ?? "passage";
              setPickerOpen(false);
              resetSelection();
              performJumpWithUndo(
                { bookIndex: b, chapter: c, verse: v ?? null },
                v ? `${targetName} ${c}:${v}` : `${targetName} ${c}`,
              );
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </Suspense>

      <AddToVaultSheet
        open={vaultSheetOpen}
        onOpenChange={setVaultSheetOpen}
        verse={
          currentRange && bookMeta
            ? {
                book: bookMeta.name,
                chapter,
                verse_start: currentRange.start,
                verse_end: currentRange.end,
                version,
                quote_text: selectedText,
                reference: menuReference,
              }
            : null
        }
        onAdded={() => {
          // Cinematic Bloom on the saved verse + refresh in-vault pips.
          if (currentRange) {
            const bloomVerse = currentRange.start;
            setVaultPulseVerse(bloomVerse);
            window.setTimeout(
              () => setVaultPulseVerse((current) => (current === bloomVerse ? null : current)),
              900,
            );
          }
          refreshVaultedVerses();
        }}
      />

      <VaultItemSheet
        item={openedVaultItem}
        open={openedVaultItem !== null}
        onOpenChange={(o) => {
          if (!o) {
            setOpenedVaultItem(null);
            // Strip ?vault from the URL so refreshes don't re-pop the sheet.
            void navigate({
              to: "/reader",
              search: (prev: Record<string, unknown>) => ({ ...prev, vault: undefined }),
              replace: true,
            });
          }
        }}
        onRemoved={() => {
          setOpenedVaultItem(null);
          refreshVaultedVerses();
        }}
        onUpdated={() => refreshVaultedVerses()}
      />

      {/* Edge-hover hot zone — invisible strip pinned to the right edge that
          surfaces a small tooltip showing the rail's expand/collapse state.
          xl+ only, since the rail itself is xl+. Sits just inboard of the rail. */}
      {!immersive && (
        <>
          <div
            aria-hidden="true"
            onMouseEnter={(e) => setEdgeHoverState({ y: e.clientY })}
            onMouseMove={(e) => setEdgeHoverState({ y: e.clientY })}
            onMouseLeave={() => setEdgeHoverState(null)}
            className="pointer-events-auto fixed top-16 bottom-0 z-30 hidden w-3 xl:block"
            style={{ right: railCollapsed ? "3rem" : "340px" }}
          />
          {edgeHoverState && (
            <div
              role="tooltip"
              className="pointer-events-none fixed z-40 hidden -translate-x-full -translate-y-1/2 whitespace-nowrap rounded-md border border-gold/25 bg-[rgba(12,12,12,0.94)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-soft shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md xl:block animate-fade-in"
              style={{
                top: edgeHoverState.y,
                right: `calc(${railCollapsed ? "3rem" : "340px"} + 0.75rem)`,
              }}
            >
              <span className="text-gold/70">Sermon Rail</span>
              <span className="mx-1.5 text-gold/30">·</span>
              <span>{railCollapsed ? "Collapsed" : "Expanded"}</span>
            </div>
          )}
        </>
      )}

      {/* Polite SR announcement for rail state changes (Alt+R, edge taps, etc.).
          Visually hidden but exposed to assistive tech via aria-live="polite". */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {railAnnouncement}
      </div>

      {/* Floating "?" trigger — opens the keyboard shortcuts hint panel.
          Hidden on mobile (no keyboard); shown on md+ where shortcuts apply. */}
      <button
        type="button"
        onClick={() => setShortcutsOpen((prev) => !prev)}
        aria-label={shortcutsOpen ? "Close keyboard shortcuts" : "Open keyboard shortcuts"}
        aria-expanded={shortcutsOpen}
        aria-controls="reader-shortcuts-panel"
        aria-keyshortcuts="?"
        title="Keyboard shortcuts · ?"
        className="fixed bottom-4 left-4 z-40 hidden h-9 w-9 items-center justify-center rounded-full border border-gold/25 bg-[rgba(12,12,12,0.85)] font-display text-base text-gold-soft shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-gold/45 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian md:inline-flex"
      >
        ?
      </button>

      {/* Shortcuts hint panel — luxury obsidian + gold hairline.
          Lists the keyboard affordances used on the reader. */}
      {shortcutsOpen && (
        <div
          id="reader-shortcuts-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Keyboard shortcuts"
          className="fixed bottom-16 left-4 z-40 w-72 overflow-hidden rounded-xl border border-gold/25 bg-[rgba(12,12,12,0.96)] shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-gold/12 px-4 py-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-gold/65">Reader</p>
              <p className="mt-0.5 font-display text-sm text-gold-soft">Keyboard shortcuts</p>
            </div>
            <button
              type="button"
              onClick={() => setShortcutsOpen(false)}
              aria-label="Close keyboard shortcuts"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
            </button>
          </div>
          <ul className="divide-y divide-gold/8">
            {[
              { keys: ["W"], label: "Go to Workspace" },
              {
                keys: ["Alt", "R"],
                label: railCollapsed ? "Expand workspace rail" : "Collapse workspace rail",
              },
              { keys: ["Esc"], label: "Collapse rail · close overlays" },
              { keys: ["?"], label: "Show / hide this panel" },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-xs text-foreground/85">{row.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {row.keys.map((k, i) => (
                    <Fragment key={k}>
                      {i > 0 && <span className="text-[10px] text-gold/40">+</span>}
                      <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-gold/25 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-soft">
                        {k}
                      </kbd>
                    </Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-gold/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Tip · shortcuts pause while typing
          </p>
        </div>
      )}
    </AppShell>
  );
}

function ReaderSkeleton() {
  return (
    <div className="grid min-h-screen grid-rows-3 bg-background px-6 text-center">
      {/* Upper third: in-line brand signature (seal | wordmark) */}
      <div className="flex items-end justify-center pb-4">
        <div className="flex items-center gap-4">
          <img
            src="/sanctum-seal.svg"
            alt=""
            aria-hidden="true"
            className="h-12 w-12 sm:h-14 sm:w-14"
            style={{ filter: "drop-shadow(0 0 14px rgba(201,168,76,0.45))" }}
          />
          <span className="font-display text-3xl tracking-wide text-gold-soft sm:text-4xl">
            Sanctum<span className="text-gold">IQ</span>
          </span>
        </div>
      </div>
      {/* Middle + lower thirds: spinner with cinematic status line below */}
      <div className="row-span-2 flex flex-col items-center justify-center gap-12 pb-10">
        <LoadingSpinner context="page" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Opening the Sanctuary…</p>
      </div>
    </div>
  );
}
