import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Crown,
  ShieldAlert,
  NotebookPen,
  Search,
  Trash2,
  Plus,
  Save,
  Check,
  ChevronsUpDown,
  RefreshCw,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { Button } from "@/components/ui/button";
import { CollapsibleAdminCard } from "@/components/admin/CollapsibleAdminCard";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useAdminErrorLogger } from "@/hooks/useAdminErrorLogger";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  listAdminHubUsers,
  updateUserPremiumStatus,
  updateUserBannedStatus,
  type AdminHubUser,
} from "@/lib/admin.functions";
import {
  getScriptureBooks,
  getVerseCount,
  resolveLandingPreviewVerse,
  type LandingPreviewVerse,
  type LandingPreviewSetting,
  type ScriptureBookOption,
} from "@/lib/landingPreview";
import {
  DEFAULT_READER_VOICE_ENGINE,
  READER_VOICE_ENGINE_SETTING_KEY,
  normalizeReaderVoiceEngine,
  type ReaderVoiceEngine,
} from "@/lib/readerVoiceEngine";
import { PushEventsPanel } from "@/components/admin/PushEventsPanel";
import { ResumeAnalyticsPanel } from "@/components/admin/ResumeAnalyticsPanel";

type ErrorLogRow = {
  id: string;
  message: string;
  source: string;
  route: string | null;
  stack_trace: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type AdminNote = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
};

type LandingPreviewForm = {
  book: string;
  chapter: string;
  verse: string;
};

const supabaseClient = supabase as unknown as {
  from: typeof supabase.from;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Hub — SanctumIQ" },
      { name: "description", content: "Private control center for SanctumIQ admins." },
      { property: "og:title", content: "Admin Hub — SanctumIQ" },
      { property: "og:description", content: "Private control center for SanctumIQ admins." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHubPage,
});

function AdminHubPage() {
  const { session, user, loading } = useAuth();
  const { hasRole, loading: rolesLoading } = useRoles(user?.id);
  const isAdmin = hasRole("admin");
  const accessToken = session?.access_token ?? "";

  useAdminErrorLogger({ enabled: isAdmin, route: "/admin", source: "admin-hub" });

  const [users, setUsers] = useState<AdminHubUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewForm, setPreviewForm] = useState<LandingPreviewForm>({
    book: "Psalms",
    chapter: "46",
    verse: "10",
  });
  const [previewResolved, setPreviewResolved] = useState<LandingPreviewVerse | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(true);
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflectionForm, setReflectionForm] = useState<LandingPreviewForm>({
    book: "Psalms",
    chapter: "46",
    verse: "10",
  });
  const [reflectionResolved, setReflectionResolved] = useState<LandingPreviewVerse | null>(null);
  const [bookOptions, setBookOptions] = useState<ScriptureBookOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reflectionPickerOpen, setReflectionPickerOpen] = useState(false);
  const [chapterCount, setChapterCount] = useState(150);
  const [verseCount, setVerseCount] = useState(1);
  const [reflectionChapterCount, setReflectionChapterCount] = useState(150);
  const [reflectionVerseCount, setReflectionVerseCount] = useState(1);
  const [ttsStatusFilter, setTtsStatusFilter] = useState("");
  const [ttsDateFrom, setTtsDateFrom] = useState("");
  const [ttsDateTo, setTtsDateTo] = useState("");
  const [readerVoiceEngine, setReaderVoiceEngine] = useState<ReaderVoiceEngine>(
    DEFAULT_READER_VOICE_ENGINE,
  );
  const [readerVoiceLoading, setReaderVoiceLoading] = useState(true);
  const [readerVoiceSaving, setReaderVoiceSaving] = useState(false);
  const [readerVoiceJustSaved, setReaderVoiceJustSaved] = useState(false);
  const [ttsHealth, setTtsHealth] = useState<{
    status: "online" | "unconfigured" | "degraded" | "offline" | "checking" | "unknown";
    message: string;
    latencyMs: number | null;
    checkedAt: string | null;
  }>({ status: "unknown", message: "", latencyMs: null, checkedAt: null });

  useEffect(() => {
    if (!user || !isAdmin || !accessToken) return undefined;

    const swallow = () => undefined;
    loadUsers().catch(swallow);
    loadErrorLogs().catch(swallow);
    loadNotes().catch(swallow);
    loadPinnedPreview().catch(swallow);
    loadPinnedReflection().catch(swallow);
    loadReaderVoiceEngine().catch(swallow);
    checkTtsHealth().catch(swallow);
    loadScriptureBooks().catch(swallow);
    return undefined;
  }, [user?.id, isAdmin, accessToken]);

  useEffect(() => {
    void syncVerseBounds(
      previewForm.book,
      Number(previewForm.chapter) || 1,
      Number(previewForm.verse) || 1,
    );
  }, [previewForm.book, previewForm.chapter, previewForm.verse]);

  useEffect(() => {
    void syncReflectionVerseBounds(
      reflectionForm.book,
      Number(reflectionForm.chapter) || 1,
      Number(reflectionForm.verse) || 1,
    );
  }, [reflectionForm.book, reflectionForm.chapter, reflectionForm.verse]);

  async function loadUsers() {
    if (!accessToken) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    try {
      const result = await listAdminHubUsers({ data: { accessToken } });
      if (result.ok) {
        setUsers(result.data.users);
      } else {
        setUsers([]);
        toast.error(result.error || `Could not load users (${result.status})`);
      }
    } catch (error) {
      if (error instanceof Response) {
        toast.error(
          error.status === 401 ? "Admin access required." : `Request failed (${error.status}).`,
        );
        setUsers([]);
        return;
      }
      const message = error instanceof Error ? error.message : "Could not load users";
      toast.error(message);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadErrorLogs() {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from("app_error_logs")
      .select("id, message, source, route, stack_trace, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) toast.error("Could not load system health");
    else setErrorLogs((data ?? []) as unknown as ErrorLogRow[]);
    setLogsLoading(false);
  }

  async function deleteErrorLog(id: string) {
    const previous = errorLogs;
    setErrorLogs((rows) => rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("app_error_logs").delete().eq("id", id);
    if (error) {
      setErrorLogs(previous);
      toast.error("Could not delete that error");
    } else {
      toast.success("Error removed");
    }
  }

  async function clearAllErrorLogs() {
    if (errorLogs.length === 0) return;
    if (
      !window.confirm(
        `Clear all ${errorLogs.length} error log${errorLogs.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    const previous = errorLogs;
    setErrorLogs([]);
    // Delete only the rows currently in view (the most recent 20).
    const ids = previous.map((r) => r.id);
    const { error } = await supabase.from("app_error_logs").delete().in("id", ids);
    if (error) {
      setErrorLogs(previous);
      toast.error("Could not clear error logs");
    } else {
      toast.success("Error logs cleared");
      // Refresh in case there were more than 20 rows.
      void loadErrorLogs();
    }
  }

  async function loadNotes() {
    setNotesLoading(true);
    const { data, error } = await supabase
      .from("admin_notes")
      .select("id, title, body, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Could not load admin notes");
    } else {
      const nextNotes = data ?? [];
      setNotes(nextNotes);
      const first = nextNotes[0] ?? null;
      setActiveNoteId((current) => current ?? first?.id ?? null);
      setDraftTitle((current) => current || first?.title || "");
      setDraftBody((current) => current || first?.body || "");
    }
    setNotesLoading(false);
  }

  async function loadPinnedPreview() {
    setPreviewLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "landing_bible_preview")
      .maybeSingle();

    if (error) {
      toast.error("Could not load pinned preview verse");
      setPreviewLoading(false);
      return;
    }

    const setting = (data?.setting_value ?? {
      book: "Psalms",
      chapter: 46,
      verse: 10,
    }) as Partial<LandingPreviewSetting>;
    setPreviewForm({
      book: setting.book ?? "Psalms",
      chapter: String(setting.chapter ?? 46),
      verse: String(setting.verse ?? 10),
    });
    setPreviewResolved(await resolveLandingPreviewVerse(setting));
    setPreviewLoading(false);
  }

  async function loadPinnedReflection() {
    setReflectionLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "landing_weekly_reflection")
      .maybeSingle();

    if (error) {
      toast.error("Could not load pinned weekly reflection");
      setReflectionLoading(false);
      return;
    }

    const setting = (data?.setting_value ?? {
      book: "Psalms",
      chapter: 46,
      verse: 10,
    }) as Partial<LandingPreviewSetting>;
    setReflectionForm({
      book: setting.book ?? "Psalms",
      chapter: String(setting.chapter ?? 46),
      verse: String(setting.verse ?? 10),
    });
    setReflectionResolved(await resolveLandingPreviewVerse(setting));
    setReflectionLoading(false);
  }

  async function loadScriptureBooks() {
    const books = await getScriptureBooks();
    setBookOptions(books);
    const current = books.find((book) => book.name === previewForm.book) ?? books[18];
    setChapterCount(current?.chapterCount ?? 150);
  }

  async function loadReaderVoiceEngine() {
    setReaderVoiceLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", READER_VOICE_ENGINE_SETTING_KEY)
      .maybeSingle();

    if (error) {
      toast.error("Could not load reader voice engine");
      setReaderVoiceLoading(false);
      return;
    }

    const setting = data?.setting_value as { engine?: unknown } | null;
    setReaderVoiceEngine(normalizeReaderVoiceEngine(setting?.engine));
    setReaderVoiceLoading(false);
  }

  async function saveReaderVoiceEngine() {
    setReaderVoiceSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      {
        setting_key: READER_VOICE_ENGINE_SETTING_KEY,
        setting_value: { engine: readerVoiceEngine },
      },
      { onConflict: "setting_key" },
    );

    setReaderVoiceSaving(false);

    if (error) {
      toast.error("Could not update reader voice engine");
      return;
    }

    toast.success(
      `Voice Engine Updated — ${readerVoiceEngine === "google" ? "Google" : "System Native"}`,
      { description: "Persisted to the database." },
    );
    setReaderVoiceJustSaved(true);
    window.setTimeout(() => setReaderVoiceJustSaved(false), 2400);
  }

  async function checkTtsHealth() {
    setTtsHealth((current) => ({ ...current, status: "checking" }));
    try {
      const response = await fetch("/api/public/google-tts-health", { method: "GET" });
      if (!response.ok) {
        setTtsHealth({
          status: "offline",
          message: `Health endpoint failed (${response.status})`,
          latencyMs: null,
          checkedAt: new Date().toISOString(),
        });
        return;
      }
      const payload = (await response.json()) as {
        status: "online" | "unconfigured" | "degraded" | "offline";
        message: string;
        latencyMs: number | null;
        checkedAt: string;
      };
      setTtsHealth(payload);
    } catch (error) {
      setTtsHealth({
        status: "offline",
        message: error instanceof Error ? error.message : "Health check failed",
        latencyMs: null,
        checkedAt: new Date().toISOString(),
      });
    }
  }

  async function syncVerseBounds(book: string, chapter: number, verse: number) {
    const books = bookOptions.length ? bookOptions : await getScriptureBooks();
    if (!bookOptions.length) setBookOptions(books);
    const current = books.find((entry) => entry.name === book) ?? books[0];
    const safeChapterCount = current?.chapterCount ?? 1;
    setChapterCount(safeChapterCount);

    const safeChapter = Math.min(Math.max(1, chapter), safeChapterCount);
    const nextVerseCount = await getVerseCount(current?.name ?? "Psalms", safeChapter);
    setVerseCount(nextVerseCount);

    const safeVerse = Math.min(Math.max(1, verse), nextVerseCount);
    setPreviewForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        book: current?.name ?? currentForm.book,
        chapter: String(safeChapter),
        verse: String(safeVerse),
      };
      if (
        nextForm.book === currentForm.book &&
        nextForm.chapter === currentForm.chapter &&
        nextForm.verse === currentForm.verse
      ) {
        return currentForm;
      }
      return nextForm;
    });
  }

  async function syncReflectionVerseBounds(book: string, chapter: number, verse: number) {
    const books = bookOptions.length ? bookOptions : await getScriptureBooks();
    if (!bookOptions.length) setBookOptions(books);
    const current = books.find((entry) => entry.name === book) ?? books[0];
    const safeChapterCount = current?.chapterCount ?? 1;
    setReflectionChapterCount(safeChapterCount);

    const safeChapter = Math.min(Math.max(1, chapter), safeChapterCount);
    const nextVerseCount = await getVerseCount(current?.name ?? "Psalms", safeChapter);
    setReflectionVerseCount(nextVerseCount);

    const safeVerse = Math.min(Math.max(1, verse), nextVerseCount);
    setReflectionForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        book: current?.name ?? currentForm.book,
        chapter: String(safeChapter),
        verse: String(safeVerse),
      };
      if (
        nextForm.book === currentForm.book &&
        nextForm.chapter === currentForm.chapter &&
        nextForm.verse === currentForm.verse
      ) {
        return currentForm;
      }
      return nextForm;
    });
  }

  const chapterOptions = useMemo(
    () => Array.from({ length: chapterCount }, (_, index) => String(index + 1)),
    [chapterCount],
  );

  const verseOptions = useMemo(
    () => Array.from({ length: verseCount }, (_, index) => String(index + 1)),
    [verseCount],
  );

  const reflectionChapterOptions = useMemo(
    () => Array.from({ length: reflectionChapterCount }, (_, index) => String(index + 1)),
    [reflectionChapterCount],
  );

  const reflectionVerseOptions = useMemo(
    () => Array.from({ length: reflectionVerseCount }, (_, index) => String(index + 1)),
    [reflectionVerseCount],
  );

  const filteredUsers = (users ?? []).filter((entry) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return entry.email.toLowerCase().includes(q) || entry.displayName.toLowerCase().includes(q);
  });

  const ttsDiagnostics = useMemo(() => {
    const statusQuery = ttsStatusFilter.trim();

    return errorLogs
      .filter((log) => log.source === "google-tts")
      .filter((log) => {
        const metadata = log.metadata ?? {};
        const createdDate = log.created_at.slice(0, 10);
        const matchesStatus = !statusQuery || String(metadata.status ?? "").includes(statusQuery);
        const matchesFrom = !ttsDateFrom || createdDate >= ttsDateFrom;
        const matchesTo = !ttsDateTo || createdDate <= ttsDateTo;
        return matchesStatus && matchesFrom && matchesTo;
      });
  }, [errorLogs, ttsDateFrom, ttsDateTo, ttsStatusFilter]);

  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null;

  const selectNote = (note: AdminNote) => {
    setActiveNoteId(note.id);
    setDraftTitle(note.title);
    setDraftBody(note.body);
  };

  const createNewNote = () => {
    setActiveNoteId(null);
    setDraftTitle("");
    setDraftBody("");
  };

  async function handlePremiumToggle(target: AdminHubUser, premium: boolean) {
    if (!accessToken) {
      toast.error("Sign in again to manage access.");
      return;
    }

    setSavingUserId(target.id);
    try {
      const result = await updateUserPremiumStatus({
        data: { accessToken, userId: target.id, premium },
      });
      if (!result.ok) {
        toast.error(result.error || `Could not update access (${result.status})`);
        return;
      }
      setUsers((current) =>
        current.map((entry) =>
          entry.id === target.id
            ? {
                ...entry,
                isPremium: premium,
                roles: premium
                  ? [...entry.roles.filter((role) => role !== "free"), "minister"]
                  : entry.roles
                      .filter((role) => role !== "minister" && role !== "church_partner")
                      .concat("free"),
              }
            : entry,
        ),
      );
      toast.success(`Access updated for ${target.displayName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update access");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleBanToggle(target: AdminHubUser, banned: boolean) {
    if (!accessToken) {
      toast.error("Sign in again to manage access.");
      return;
    }
    if (
      banned &&
      !window.confirm(
        `Ban ${target.displayName}? They will be blocked from all AI features immediately.`,
      )
    ) {
      return;
    }

    setSavingUserId(target.id);
    try {
      const result = await updateUserBannedStatus({
        data: { accessToken, userId: target.id, banned },
      });
      if (!result.ok) {
        toast.error(result.error || `Could not update ban (${result.status})`);
        return;
      }
      setUsers((current) =>
        current.map((entry) => (entry.id === target.id ? { ...entry, isBanned: banned } : entry)),
      );
      toast.success(banned ? `${target.displayName} banned` : `${target.displayName} unbanned`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update ban");
    } finally {
      setSavingUserId(null);
    }
  }

  async function saveNote() {
    if (!user) return;
    setNoteSaving(true);

    const payload = {
      title: draftTitle.trim() || "Untitled note",
      body: draftBody,
      user_id: user.id,
    };

    let response;
    if (activeNoteId) {
      response = await supabase
        .from("admin_notes")
        .update(payload)
        .eq("id", activeNoteId)
        .eq("user_id", user.id)
        .select("id, title, body, updated_at")
        .single();
    } else {
      response = await supabase
        .from("admin_notes")
        .insert(payload)
        .select("id, title, body, updated_at")
        .single();
    }

    setNoteSaving(false);

    if (response.error || !response.data) {
      toast.error("Could not save note");
      return;
    }

    const saved = response.data as AdminNote;
    setNotes((current) => {
      const next = [saved, ...current.filter((note) => note.id !== saved.id)];
      return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
    setActiveNoteId(saved.id);
    setDraftTitle(saved.title);
    toast.success("Note saved");
  }

  async function deleteNote() {
    if (!user || !activeNoteId) return;
    const { error } = await supabase
      .from("admin_notes")
      .delete()
      .eq("id", activeNoteId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not delete note");
      return;
    }

    const remaining = notes.filter((note) => note.id !== activeNoteId);
    setNotes(remaining);
    const next = remaining[0] ?? null;
    if (next) selectNote(next);
    else createNewNote();
    toast.success("Note deleted");
  }

  async function savePinnedPreview() {
    setPreviewSaving(true);
    const setting = {
      book: previewForm.book.trim() || "Psalms",
      chapter: Number(previewForm.chapter) || 46,
      verse: Number(previewForm.verse) || 10,
    };

    const resolved = await resolveLandingPreviewVerse(setting);
    const { error } = await supabase
      .from("app_settings")
      .update({
        setting_value: {
          book: resolved.book,
          chapter: resolved.chapter,
          verse: resolved.verse,
          reference: resolved.reference,
        },
      })
      .eq("setting_key", "landing_bible_preview");

    setPreviewSaving(false);

    if (error) {
      toast.error("Could not pin landing preview verse");
      return;
    }

    setPreviewForm({
      book: resolved.book,
      chapter: String(resolved.chapter),
      verse: String(resolved.verse),
    });
    setPreviewResolved(resolved);
    toast.success("Landing Bible preview updated");
  }

  async function savePinnedReflection() {
    setReflectionSaving(true);
    const setting = {
      book: reflectionForm.book.trim() || "Psalms",
      chapter: Number(reflectionForm.chapter) || 46,
      verse: Number(reflectionForm.verse) || 10,
    };

    const resolved = await resolveLandingPreviewVerse(setting);
    const { error } = await supabase.from("app_settings").upsert(
      {
        setting_key: "landing_weekly_reflection",
        setting_value: {
          book: resolved.book,
          chapter: resolved.chapter,
          verse: resolved.verse,
          reference: resolved.reference,
        },
      },
      { onConflict: "setting_key" },
    );

    setReflectionSaving(false);

    if (error) {
      toast.error("Could not pin weekly reflection verse");
      return;
    }

    setReflectionForm({
      book: resolved.book,
      chapter: String(resolved.chapter),
      verse: String(resolved.verse),
    });
    setReflectionResolved(resolved);
    toast.success("Weekly reflection updated");
  }

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground">
        <AdminHeader />
        <div className="flex min-h-[60svh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        icon={Crown}
        eyebrow="Admin Hub"
        title="Private operations, reserved for the stewards behind SanctumIQ"
        description="Sign in with your administrator account to manage members, monitor system health, and keep internal planning notes."
        redirectTo="/admin"
        features={["User access control", "System health log", "Private admin notepad"]}
        simpleHeader
      />
    );
  }

  if (!isAdmin) {
    return (
      <SanctuaryGate
        icon={ShieldAlert}
        eyebrow="Admin Hub"
        title="Reserved for administrators"
        description="This control room is only available to admin accounts."
        redirectTo="/reader"
        features={["User access control", "System health log", "Private admin notepad"]}
        showReaderLink
        simpleHeader
      />
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <AdminHeader />
      <div className="mx-auto w-full max-w-7xl overflow-x-clip px-3 py-8 sm:px-6 md:py-14">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="mb-3 text-xs uppercase tracking-[0.32em] text-gold">Admin Hub</p>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl md:text-5xl">
              Obsidian command center
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Manage access, watch the platform’s health, and keep private planning notes in one
              quiet place.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="min-w-0 space-y-6">
            <CollapsibleAdminCard
              id="user-management"
              title="User Management"
              description="Toggle premium access for seekers and stewards."
              headerActions={
                <div className="relative w-full md:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="pl-9"
                  />
                </div>
              }
              contentClassName="px-4 pb-4 sm:px-6 sm:pb-6"
            >
              {usersLoading ? (
                <div className="flex min-h-48 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {filteredUsers.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "rounded-lg border border-border/70 bg-background/40 p-3",
                          entry.isBanned && "border-destructive/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="break-words text-sm font-medium text-foreground">
                              {entry.displayName}
                            </p>
                            <p className="break-all text-xs text-muted-foreground">{entry.email}</p>
                          </div>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-gold/80">
                            {entry.isBanned
                              ? "Banned"
                              : entry.isAdmin
                                ? "Admin"
                                : entry.isPremium
                                  ? "Premium"
                                  : "Free"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={entry.isPremium}
                              disabled={
                                entry.isAdmin || entry.isBanned || savingUserId === entry.id
                              }
                              onCheckedChange={(checked) =>
                                void handlePremiumToggle(entry, checked)
                              }
                            />
                            Premium
                          </label>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={entry.isBanned}
                              disabled={entry.isAdmin || savingUserId === entry.id}
                              onCheckedChange={(checked) => void handleBanToggle(entry, checked)}
                            />
                            Ban
                          </label>
                          {savingUserId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gold" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Premium</TableHead>
                          <TableHead>Ban</TableHead>
                          <TableHead className="text-right">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((entry) => (
                          <TableRow
                            key={entry.id}
                            className={entry.isBanned ? "bg-destructive/5" : undefined}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{entry.displayName}</p>
                                <p className="text-xs text-muted-foreground">{entry.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs uppercase tracking-[0.24em] text-gold/80">
                                {entry.isBanned
                                  ? "Banned"
                                  : entry.isAdmin
                                    ? "Admin"
                                    : entry.isPremium
                                      ? "Premium"
                                      : "Free"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={entry.isPremium}
                                  disabled={
                                    entry.isAdmin || entry.isBanned || savingUserId === entry.id
                                  }
                                  onCheckedChange={(checked) =>
                                    void handlePremiumToggle(entry, checked)
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={entry.isBanned}
                                  disabled={entry.isAdmin || savingUserId === entry.id}
                                  onCheckedChange={(checked) =>
                                    void handleBanToggle(entry, checked)
                                  }
                                />
                                {savingUserId === entry.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CollapsibleAdminCard>

            <CollapsibleAdminCard
              id="system-health"
              title="System Health"
              description="Recent application errors captured with timestamps."
              headerActions={
                errorLogs.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllErrorLogs}
                    className="h-8 border-border/70 bg-background/40 px-3 text-[10px] uppercase tracking-[0.18em]"
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" />
                    Clear all
                  </Button>
                ) : null
              }
            >
              {logsLoading ? (
                <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : errorLogs.length === 0 ? (
                <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-8 text-sm text-muted-foreground">
                  No application errors logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {errorLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border/70 bg-background/40 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-foreground">
                            {log.message}
                          </p>
                          <p className="mt-1 break-words text-xs uppercase tracking-[0.24em] text-gold/70">
                            {log.source}
                            {log.route ? ` · ${log.route}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void deleteErrorLog(log.id)}
                            aria-label="Delete error log"
                            className="h-7 px-2 text-muted-foreground hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {log.stack_trace && (
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-background/70 p-3 text-xs text-muted-foreground">
                          {log.stack_trace}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleAdminCard>

            <PushEventsPanel />

            <ResumeAnalyticsPanel />

            <CollapsibleAdminCard
              id="voice-diagnostics"
              title="Voice Diagnostics"
              description="Recent Google narration failures without leaving the admin hub."
              contentClassName="space-y-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {["400", "401", "403", "429", "500"].map((status) => {
                    const active = ttsStatusFilter === status;
                    return (
                      <Button
                        key={status}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setTtsStatusFilter((current) => (current === status ? "" : status))
                        }
                        className={cn(
                          "h-8 border-border/70 bg-background/30 px-3 text-[10px] uppercase tracking-[0.18em]",
                          active && "border-gold/35 bg-gold/10 text-gold-soft",
                        )}
                      >
                        {status}
                      </Button>
                    );
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      HTTP status
                    </span>
                    <Input
                      inputMode="numeric"
                      placeholder="500"
                      value={ttsStatusFilter}
                      onChange={(event) =>
                        setTtsStatusFilter(event.target.value.replace(/[^0-9]/g, ""))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      From
                    </span>
                    <Input
                      type="date"
                      value={ttsDateFrom}
                      onChange={(event) => setTtsDateFrom(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      To
                    </span>
                    <Input
                      type="date"
                      value={ttsDateTo}
                      onChange={(event) => setTtsDateTo(event.target.value)}
                    />
                  </label>
                </div>
              </div>
              {logsLoading ? (
                <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : ttsDiagnostics.length === 0 ? (
                <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-8 text-sm text-muted-foreground">
                  No Google voice failures logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {ttsDiagnostics.slice(0, 6).map((log) => {
                    const metadata = log.metadata ?? {};
                    return (
                      <div
                        key={log.id}
                        className="rounded-lg border border-border/70 bg-background/40 p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{log.message}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-gold/70">
                              {String(metadata.voiceName ?? "Unknown voice")}
                              {typeof metadata.status === "number"
                                ? ` · HTTP ${metadata.status}`
                                : ""}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          <p>Text length: {String(metadata.textLength ?? 0)}</p>
                          <p>SSML length: {String(metadata.ssmlLength ?? 0)}</p>
                          <p>Timepoints: {String(metadata.includeTimepoints ?? false)}</p>
                          <p>Status text: {String(metadata.statusText ?? "—")}</p>
                        </div>
                        {typeof metadata.providerError === "string" && metadata.providerError ? (
                          <pre className="mt-3 overflow-x-auto rounded-md bg-background/70 p-3 text-xs text-muted-foreground">
                            {metadata.providerError}
                          </pre>
                        ) : null}
                        {log.stack_trace ? (
                          <pre className="mt-3 overflow-x-auto rounded-md bg-background/70 p-3 text-xs text-muted-foreground">
                            {log.stack_trace}
                          </pre>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleAdminCard>
          </div>

          <div className="space-y-6">
            <CollapsibleAdminCard
              id="reader-voice-engine"
              title="Reader Voice Engine"
              description="Set the global default for Reader narration."
              contentClassName="space-y-4"
            >
              {readerVoiceLoading ? (
                <div className="flex min-h-24 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Default engine
                    </p>
                    <Select
                      value={readerVoiceEngine}
                      onValueChange={(value) =>
                        setReaderVoiceEngine(normalizeReaderVoiceEngine(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/80 bg-card/95 backdrop-blur-md">
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="system-native">System Native</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    System Native uses the browser Web Speech engine at a fixed rate of 0.85 for a
                    calmer pace.
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      {(() => {
                        const tone =
                          ttsHealth.status === "online"
                            ? "text-emerald-300"
                            : ttsHealth.status === "checking"
                              ? "text-muted-foreground"
                              : ttsHealth.status === "degraded"
                                ? "text-amber-300"
                                : ttsHealth.status === "unconfigured"
                                  ? "text-muted-foreground"
                                  : ttsHealth.status === "unknown"
                                    ? "text-muted-foreground"
                                    : "text-rose-300";
                        const label =
                          ttsHealth.status === "online"
                            ? "Google Cloud: Online"
                            : ttsHealth.status === "checking"
                              ? "Checking…"
                              : ttsHealth.status === "degraded"
                                ? "Google Cloud: Degraded"
                                : ttsHealth.status === "unconfigured"
                                  ? "Google Cloud: Not configured"
                                  : ttsHealth.status === "unknown"
                                    ? "Google Cloud: Unknown"
                                    : "Google Cloud: Offline";
                        return (
                          <>
                            {ttsHealth.status === "checking" ? (
                              <Loader2 className={cn("h-3 w-3 animate-spin", tone)} />
                            ) : (
                              <CircleDot className={cn("h-3 w-3", tone)} />
                            )}
                            <span className={cn("font-medium tracking-wide", tone)}>{label}</span>
                            {ttsHealth.latencyMs !== null ? (
                              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                · {ttsHealth.latencyMs}ms
                              </span>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={checkTtsHealth}
                      disabled={ttsHealth.status === "checking"}
                      className="h-7 px-2 text-[11px]"
                    >
                      <RefreshCw
                        className={cn("h-3 w-3", ttsHealth.status === "checking" && "animate-spin")}
                      />
                      Recheck
                    </Button>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    {readerVoiceJustSaved ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                        Saved
                      </span>
                    ) : null}
                    <Button size="sm" onClick={saveReaderVoiceEngine} disabled={readerVoiceSaving}>
                      {readerVoiceSaving ? <Loader2 className="animate-spin" /> : <Save />}
                      Save voice default
                    </Button>
                  </div>
                </>
              )}
            </CollapsibleAdminCard>

            <CollapsibleAdminCard
              id="landing-bible-preview"
              title="Landing Bible Preview"
              description="Pin the verse shown in the landing page Bible Reader preview."
              contentClassName="space-y-4"
            >
              {previewLoading ? (
                <div className="flex min-h-28 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={pickerOpen}
                          className="w-full justify-between"
                        >
                          <span className="truncate">{previewForm.book}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(20rem,calc(100vw-2rem))] border-border/80 bg-card/95 p-0 backdrop-blur-md"
                        align="start"
                      >
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Search scripture books..." />
                          <CommandList>
                            <CommandEmpty>No books found.</CommandEmpty>
                            {bookOptions.map((book) => (
                              <CommandItem
                                key={book.name}
                                value={book.name}
                                onSelect={() => {
                                  setPreviewForm((current) => ({
                                    ...current,
                                    book: book.name,
                                    chapter: "1",
                                    verse: "1",
                                  }));
                                  setPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    previewForm.book === book.name ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <span>{book.name}</span>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={previewForm.chapter}
                        onValueChange={(value) =>
                          setPreviewForm((current) => ({
                            ...current,
                            chapter: value,
                            verse: "1",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chapter" />
                        </SelectTrigger>
                        <SelectContent className="border-border/80 bg-card/95 backdrop-blur-md">
                          {chapterOptions.map((chapter) => (
                            <SelectItem key={chapter} value={chapter}>
                              {chapter}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={previewForm.verse}
                        onValueChange={(value) =>
                          setPreviewForm((current) => ({ ...current, verse: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Verse" />
                        </SelectTrigger>
                        <SelectContent className="border-border/80 bg-card/95 backdrop-blur-md">
                          {verseOptions.map((verse) => (
                            <SelectItem key={verse} value={verse}>
                              {verse}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {previewResolved && (
                    <div className="rounded-lg border border-border/70 bg-background/40 p-4">
                      <div className="mb-3 flex items-center gap-1 rounded-full border border-gold/15 bg-background/40 p-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground w-max">
                        <span className="rounded-full bg-accent px-3 py-1 text-gold-soft">KJV</span>
                        <span className="rounded-full px-3 py-1">Modern</span>
                      </div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gold">
                        {previewResolved.reference}
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <p className="font-display text-xl leading-tight text-foreground">
                          {previewResolved.kjv}
                        </p>
                        <p className="font-display text-xl leading-tight text-foreground/85">
                          {previewResolved.modern}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={savePinnedPreview} disabled={previewSaving}>
                      {previewSaving ? <Loader2 className="animate-spin" /> : <Save />}
                      Pin verse
                    </Button>
                  </div>
                </>
              )}
            </CollapsibleAdminCard>

            {/* Weekly Reflection card removed — landing page now mirrors the daily reflection. */}

            <CollapsibleAdminCard
              id="admin-notepad"
              title="Admin Notepad"
              description="Your private planning space for SanctumIQ."
              headerActions={
                <Button variant="outline" size="sm" onClick={createNewNote}>
                  <Plus />
                </Button>
              }
              contentClassName="space-y-4"
            >
              <div className="grid gap-4 lg:grid-cols-[12rem_1fr]">
                <div className="space-y-2">
                  {notesLoading ? (
                    <div className="flex min-h-32 items-center justify-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="rounded-lg border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                      No notes yet.
                    </div>
                  ) : (
                    notes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => selectNote(note)}
                        className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${note.id === activeNoteId ? "border-primary bg-accent text-accent-foreground" : "border-border/70 bg-background/40 text-foreground hover:bg-accent/60"}`}
                      >
                        <p className="truncate text-sm font-medium">
                          {note.title || "Untitled note"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Note title"
                  />
                  <Textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder="Write your private planning notes here..."
                    className="min-h-[22rem]"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gold/70">
                      <NotebookPen className="h-4 w-4" />
                      {activeNote
                        ? `Last saved ${new Date(activeNote.updated_at).toLocaleString()}`
                        : "New draft"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteNote}
                        disabled={!activeNoteId}
                      >
                        <Trash2 />
                      </Button>
                      <Button size="sm" onClick={saveNote} disabled={noteSaving}>
                        {noteSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleAdminCard>
          </div>
        </div>
      </div>
    </div>
  );
}
