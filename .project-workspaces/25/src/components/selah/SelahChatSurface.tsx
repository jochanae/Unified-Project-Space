/**
 * SelahChatSurface — One surface, two modes.
 *
 *   Companion mode  → warm conversation. Persists across sessions in
 *                     `selah_chat_messages`. Header has download + clear.
 *                     Bubble actions: User { Copy, Delete } · AI { Read aloud, Copy, Delete }.
 *
 *   Altar mode      → zero-trace private session. The lock toggles in.
 *                     Nothing persists. On exit, messages dissolve into
 *                     gold particles. Optional "Keep this truth" saves a
 *                     single offering to notes.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Lock,
  Unlock,
  Sparkles,
  Send,
  Loader2,
  Feather,
  BookmarkPlus,
  ShieldCheck,
  Download,
  Trash2,
  Copy as CopyIcon,
  Volume2,
  Square as StopIcon,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { toast } from "sonner";
import { exportChatAsMarkdown, exportChatAsPDF } from "@/lib/selah-chat-export";
import { pulse, chime } from "@/lib/feedback";

type Mode = "companion" | "altar";

interface ChatMessage {
  id: string; // local UUID for React keys
  dbId?: string; // Supabase row id (only in Companion mode, after persist)
  role: "user" | "assistant";
  content: string;
}

const FREE_DAILY_LIMIT = 3;
const STORAGE_KEY = "sanctumiq:selah:usage";

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}
function getUsageToday(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const r = JSON.parse(raw) as { date: string; count: number };
    return r.date === todayKey() ? r.count : 0;
  } catch {
    return 0;
  }
}
function bumpUsage(): number {
  const today = todayKey();
  const next = getUsageToday() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: next }));
  } catch {
    /* ignore */
  }
  return next;
}

const COMPANION_OPENING = "A verse, a word, a feeling — Selah is here.";
const ALTAR_OPENING_HEAD = "Selah ✦ · Zero-trace";
const ALTAR_OPENING_BODY =
  "This session is private. Nothing here is recorded. Speak freely — when you close this, it's gone.";

const ALTAR_PROMPTS = [
  "I'm afraid I'm not enough.",
  "I can't stop replaying what they said.",
  "I'm carrying something I haven't told anyone.",
];

function extractAltarOffering(content: string): { truth: string; movement: string } | null {
  const truthMatch = content.match(/Truth to hold\s*:\s*([^\n]+)/i);
  const movementMatch = content.match(/Small movement\s*:\s*([^\n]+)/i);
  if (truthMatch && movementMatch) {
    return { truth: truthMatch[1].trim(), movement: movementMatch[1].trim() };
  }
  return null;
}

export function SelahChatSurface({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { hasAnyRole } = useRoles(user?.id);
  const canSaveDrafts = hasAnyRole(["minister", "church_partner", "admin"]);
  const isPaid = canSaveDrafts;
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("companion");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedMessageId, setSavedMessageId] = useState<string | null>(null);
  const [showAltarToast, setShowAltarToast] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [sendPulseKey, setSendPulseKey] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAltar = mode === "altar";

  // Load persisted Companion history once for signed-in users
  useEffect(() => {
    if (!user || isAltar) return;
    let cancelled = false;
    (async () => {
      const { data, error: loadErr } = await supabase
        .from("selah_chat_messages")
        .select("id, role, content")
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled || loadErr || !data) return;
      setMessages(
        data.map((m) => ({
          id: `db-${m.id}`,
          dbId: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAltar]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 140);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!showAltarToast) return;
    const t = setTimeout(() => setShowAltarToast(false), 2600);
    return () => clearTimeout(t);
  }, [showAltarToast]);

  // Stop any TTS on unmount
  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const enterAltar = useCallback(() => {
    setError(null);
    setLimitReached(false);
    setMessages([]); // never carry companion history into Altar
    setSavingId(null);
    setSavedMessageId(null);
    setMode("altar");
    setShowAltarToast(true);
    setDownloadOpen(false);
    setConfirmingClear(false);
  }, []);

  const leaveAltar = useCallback(() => {
    setDissolving(true);
    setTimeout(() => {
      setMessages([]);
      setSavingId(null);
      setSavedMessageId(null);
      setMode("companion");
      setDissolving(false);
    }, 1200);
  }, []);

  const persistMessage = async (msg: ChatMessage): Promise<string | undefined> => {
    if (!user || isAltar) return undefined;
    const { data, error: insErr } = await supabase
      .from("selah_chat_messages")
      .insert({ user_id: user.id, role: msg.role, content: msg.content })
      .select("id")
      .single();
    if (insErr) {
      console.error("Selah persist error:", insErr);
      return undefined;
    }
    return data.id;
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!isPaid && getUsageToday() >= FREE_DAILY_LIMIT) {
      setLimitReached(true);
      return;
    }

    setError(null);
    // Felt response — soft tone + short haptic + visual ring on every confirmed send.
    pulse("send", "send");
    setSendPulseKey((k) => k + 1);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setSending(true);

    // Persist user msg in companion mode (fire-and-forget; UI doesn't block)
    if (!isAltar && user) {
      void persistMessage(userMsg).then((dbId) => {
        if (!dbId) return;
        setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, dbId } : m)));
      });
    }

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("selah", {
        body: {
          mode: isAltar ? "altar" : "chat",
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (fnErr || !data?.reflection) {
        console.error("Selah chat error:", fnErr);
        setError(
          isAltar ? "Selah is here. Try once more." : "Selah is quiet right now. Try again.",
        );
        setSending(false);
        return;
      }

      if (!isPaid) bumpUsage();

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reflection,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      // Soft answering chime when Selah's reply lands.
      chime("receive");

      if (!isAltar && user) {
        void persistMessage(assistantMsg).then((dbId) => {
          if (!dbId) return;
          setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, dbId } : m)));
        });
      }
    } catch (err) {
      console.error("Selah chat invoke error:", err);
      setError("Selah is quiet right now. Try again.");
    } finally {
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, sending, messages, isPaid, isAltar, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // ── Bubble actions ──────────────────────────────────────────────

  const copyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const deleteMessage = async (msg: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    if (msg.dbId && !isAltar) {
      const { error: delErr } = await supabase
        .from("selah_chat_messages")
        .delete()
        .eq("id", msg.dbId);
      if (delErr) console.error("Selah delete error:", delErr);
    }
  };

  const toggleReadAloud = (msg: ChatMessage) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Read aloud isn't available on this device");
      return;
    }
    const synth = window.speechSynthesis;
    if (speakingId === msg.id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(msg.content);
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => setSpeakingId((curr) => (curr === msg.id ? null : curr));
    u.onerror = () => setSpeakingId((curr) => (curr === msg.id ? null : curr));
    setSpeakingId(msg.id);
    synth.speak(u);
  };

  // ── Header actions ──────────────────────────────────────────────

  const handleDownload = (format: "md" | "pdf") => {
    setDownloadOpen(false);
    if (messages.length === 0) {
      toast.info("Nothing to download yet");
      return;
    }
    const exportable = messages.map((m) => ({ role: m.role, content: m.content }));
    if (format === "md") exportChatAsMarkdown(exportable);
    else exportChatAsPDF(exportable);
  };

  const clearConversation = async () => {
    setConfirmingClear(false);
    setMessages([]);
    if (user && !isAltar) {
      const { error: delErr } = await supabase
        .from("selah_chat_messages")
        .delete()
        .eq("user_id", user.id);
      if (delErr) {
        console.error("Selah clear error:", delErr);
        toast.error("Couldn't clear conversation");
        return;
      }
    }
    toast.success("Conversation cleared");
  };

  // ── Save flows ──────────────────────────────────────────────────

  const saveToWorkspace = async (msg: ChatMessage) => {
    if (!user || savingId) return;
    setSavingId(msg.id);
    try {
      const idx = messages.findIndex((m) => m.id === msg.id);
      const promptMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
      const promptText = promptMsg?.content ?? "Selah Draft";
      const title = promptText.length > 80 ? `${promptText.slice(0, 77)}…` : promptText;
      const { data, error: insErr } = await supabase
        .from("sermons")
        .insert({
          user_id: user.id,
          title,
          theme: promptText,
          manuscript: msg.content,
          status: "draft",
          current_version: 1,
          length_target: "standard",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select("id")
        .single();
      if (insErr || !data) {
        console.error("Save Selah message failed:", insErr);
        setSavingId(null);
        return;
      }
      setSavedMessageId(msg.id);
    } catch (err) {
      console.error("Save Selah message error:", err);
    } finally {
      setSavingId(null);
    }
  };

  const keepTruth = async (msg: ChatMessage) => {
    if (!user || savingId) return;
    const offering = extractAltarOffering(msg.content);
    if (!offering) return;
    setSavingId(msg.id);
    try {
      const body = `Truth to hold:\n${offering.truth}\n\nSmall movement:\n${offering.movement}`;
      const { error: insErr } = await supabase.from("notes").insert({
        user_id: user.id,
        body_text: body,
        note_type: "altar",
      });
      if (insErr) {
        console.error("Keep truth failed:", insErr);
        setSavingId(null);
        return;
      }
      setSavedMessageId(msg.id);
    } catch (err) {
      console.error("Keep truth error:", err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative flex w-full max-w-2xl flex-col rounded-t-2xl border bg-[rgba(13,13,13,0.97)] shadow-[0_-8px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-500 ${
          isAltar
            ? "border-gold/40 shadow-[0_-8px_60px_rgba(0,0,0,0.6),0_0_44px_rgba(201,168,76,0.18)_inset]"
            : "border-gold/20"
        }`}
        style={{
          height: "min(86vh, 760px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isAltar && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-2xl"
          >
            <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-gold/10 blur-[100px]" />
            <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-gold/6 blur-[110px]" />
          </div>
        )}

        <div className="relative z-10 mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-gold/25" />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-gold/15">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Altar/privacy lock — anchored far-left as a "status anchor". */}
            <button
              type="button"
              onClick={isAltar ? leaveAltar : enterAltar}
              aria-label={isAltar ? "Leave The Altar" : "Enter The Altar"}
              aria-pressed={isAltar}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                isAltar
                  ? "border-gold/70 bg-gold/15 text-gold shadow-[0_0_18px_rgba(201,168,76,0.55)]"
                  : "border-gold/30 bg-obsidian/60 text-gold hover:border-gold/55 hover:bg-gold/10 hover:shadow-[0_0_14px_rgba(201,168,76,0.35)]"
              }`}
            >
              {isAltar ? (
                <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-obsidian shadow-[0_0_14px_rgba(201,168,76,0.25)]">
              <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            </span>
            <div className="leading-tight min-w-0">
              <div className="font-display text-[15px] text-foreground">Selah ✦</div>
              <div
                className={`text-[10px] uppercase tracking-[0.28em] truncate transition-colors ${
                  isAltar ? "text-gold/85" : "text-gold/60"
                }`}
              >
                {isAltar ? "Private session · nothing saved" : "Companion"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Companion-only: download + clear */}
            {!isAltar && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDownloadOpen((v) => !v)}
                    aria-label="Download conversation"
                    disabled={messages.length === 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/20 text-gold/70 hover:border-gold/45 hover:text-gold hover:bg-gold/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  {downloadOpen && (
                    <div
                      className="absolute right-0 top-10 z-40 w-44 rounded-lg border border-gold/25 bg-obsidian-elevated/95 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.55)] overflow-hidden"
                      onMouseLeave={() => setDownloadOpen(false)}
                    >
                      <button
                        onClick={() => handleDownload("md")}
                        className="w-full text-left px-3 py-2 text-[12px] text-foreground/85 hover:bg-gold/8 hover:text-gold flex items-center gap-2"
                      >
                        <BookOpen className="h-3 w-3" /> Markdown (.md)
                      </button>
                      <button
                        onClick={() => handleDownload("pdf")}
                        className="w-full text-left px-3 py-2 text-[12px] text-foreground/85 hover:bg-gold/8 hover:text-gold flex items-center gap-2 border-t border-gold/10"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  aria-label="Clear conversation"
                  disabled={messages.length === 0}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/20 text-gold/60 hover:border-rose-400/50 hover:text-rose-300 hover:bg-rose-500/8 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </header>

        {/* Confirm clear */}
        {confirmingClear && (
          <div className="relative z-30 mx-3 mt-3 rounded-lg border border-rose-400/30 bg-rose-500/8 px-3 py-2.5 flex items-center justify-between gap-3 animate-selah-bubble-in">
            <p className="text-[12px] text-foreground/85">
              Clear this conversation? This can't be undone.
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setConfirmingClear(false)}
                className="px-2.5 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => void clearConversation()}
                className="px-2.5 py-1 rounded-md text-[11px] bg-rose-500/85 hover:bg-rose-500 text-white"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Toast: Private session engaged */}
        {showAltarToast && (
          <div
            className="absolute left-1/2 top-[68px] z-30 -translate-x-1/2 animate-selah-bubble-in"
            role="status"
            aria-live="polite"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gradient-to-r from-obsidian via-[#1a1408] to-obsidian px-4 py-1.5 shadow-[0_4px_24px_rgba(201,168,76,0.35)] backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
              <span className="text-[11px] uppercase tracking-[0.22em] text-gold-soft">
                Private session engaged · zero-trace
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollerRef}
          className={`relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-5 transition-all duration-700 ${
            dissolving ? "opacity-0 blur-md scale-95" : "opacity-100"
          }`}
        >
          {messages.length === 0 && !dissolving && (
            <>
              {!isAltar ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center px-6">
                  <div className="font-display italic text-[16px] leading-[1.7] text-foreground/75 max-w-md">
                    {COMPANION_OPENING}
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.28em] text-gold/55">
                    Begin when ready
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5 animate-selah-bubble-in">
                    <div className="flex items-center gap-1.5 pl-1">
                      <Sparkles className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
                      <span className="text-[10px] uppercase tracking-[0.28em] text-gold/65">
                        {ALTAR_OPENING_HEAD}
                      </span>
                    </div>
                    <div className="rounded-[20px] rounded-bl-[6px] border border-gold/25 bg-obsidian/60 px-4 py-3.5 shadow-[0_2px_18px_rgba(201,168,76,0.08)] backdrop-blur-xl">
                      <p className="font-display text-[15.5px] leading-[1.75] text-foreground/88">
                        {ALTAR_OPENING_BODY}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 px-1 pt-1">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-gold/45 mb-1">
                      Or begin with…
                    </p>
                    {ALTAR_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setInput(p);
                          inputRef.current?.focus();
                        }}
                        className="group text-left px-3.5 py-2.5 rounded-full border border-gold/15 bg-transparent text-[13.5px] font-display italic text-foreground/70 hover:border-gold/40 hover:text-foreground hover:bg-gold/4 transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isAltar={isAltar}
              canSaveDraft={canSaveDrafts && !isAltar}
              saving={savingId === m.id}
              saved={savedMessageId === m.id}
              speaking={speakingId === m.id}
              onCopy={() => copyMessage(m)}
              onDelete={() => void deleteMessage(m)}
              onReadAloud={() => toggleReadAloud(m)}
              onSaveDraft={() => saveToWorkspace(m)}
              onKeepTruth={() => keepTruth(m)}
              onOpenWorkspace={() => {
                onClose();
                void navigate({ to: "/workspace/sermons" });
              }}
            />
          ))}

          {sending && <TypingBubble />}

          {error && (
            <div className="text-center text-sm italic text-muted-foreground/70">{error}</div>
          )}

          {limitReached && !isAltar && (
            <div className="rounded-lg border border-gold/20 bg-obsidian/50 p-4 text-sm text-foreground/80 leading-relaxed">
              You&apos;ve had {FREE_DAILY_LIMIT} Selah reflections today. Come back tomorrow, or
              continue without limits as an{" "}
              <a href="/pricing" className="text-gold underline underline-offset-2">
                Architect or Church Partner
              </a>
              .
            </div>
          )}
        </div>

        {/* Gold particle dissolve */}
        {dissolving && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-t-2xl"
          >
            {Array.from({ length: 36 }).map((_, i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 0.3;
              const size = 2 + Math.random() * 3;
              const drift = (Math.random() - 0.5) * 80;
              return (
                <span
                  key={i}
                  style={{
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    animationDelay: `${delay}s`,
                    ["--drift" as string]: `${drift}px`,
                  }}
                  className="absolute bottom-24 rounded-full bg-gold-soft shadow-[0_0_8px_rgba(240,215,140,0.85)] animate-[altar-rise_1.6s_ease-out_forwards]"
                />
              );
            })}
          </div>
        )}

        {/* Composer */}
        <div className="relative z-10 border-t border-gold/15 px-3 py-3">
          <div
            className={`flex items-end gap-2 transition-all ${
              isAltar
                ? "border-b border-gold/30 px-2 pb-2 focus-within:border-gold/55"
                : "rounded-xl border border-gold/20 bg-obsidian/60 px-3 py-2 focus-within:border-gold/40"
            }`}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAltar ? "Speak freely. Nothing will be saved." : "Speak with Selah…"}
              rows={1}
              disabled={sending || (limitReached && !isAltar)}
              className="flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/45 outline-none max-h-32 leading-[1.5] py-1 disabled:opacity-50"
              style={{ minHeight: "24px" }}
            />
            <div className="relative shrink-0">
              {sendPulseKey > 0 && (
                <span
                  key={sendPulseKey}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-gold/70 animate-selah-send-ring"
                />
              )}
              <button
                onClick={() => void send()}
                disabled={!input.trim() || sending || (limitReached && !isAltar)}
                aria-label="Send"
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
                  isAltar
                    ? "bg-transparent text-gold hover:bg-gold/10"
                    : "bg-gold/90 hover:bg-gold text-obsidian"
                }`}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isAltar ? (
                  <Feather className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.32em] text-muted-foreground/45">
            {isAltar ? "Private · Nothing Saved" : "Selah · Enter to send · ⇧↵ for newline"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Bubbles ─────────── */

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-3 px-1 text-[10.5px] uppercase tracking-[0.18em] text-gold/55">
      {children}
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
  danger = false,
  active = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active ? "text-gold" : danger ? "hover:text-rose-300" : "hover:text-gold"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MessageBubble({
  message,
  isAltar,
  canSaveDraft,
  saving,
  saved,
  speaking,
  onCopy,
  onDelete,
  onReadAloud,
  onSaveDraft,
  onKeepTruth,
  onOpenWorkspace,
}: {
  message: ChatMessage;
  isAltar: boolean;
  canSaveDraft: boolean;
  saving: boolean;
  saved: boolean;
  speaking: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onReadAloud: () => void;
  onSaveDraft: () => void;
  onKeepTruth: () => void;
  onOpenWorkspace: () => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 animate-selah-bubble-in">
        <div className="max-w-[82%] rounded-[20px] rounded-br-[6px] border border-gold/25 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-4 py-3 text-[15px] leading-[1.6] text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          {message.content}
        </div>
        <div className="max-w-[82%] w-full flex justify-end">
          <ActionRow>
            <ActionBtn icon={<CopyIcon className="h-3 w-3" />} label="Copy" onClick={onCopy} />
            <ActionBtn
              icon={<Trash2 className="h-3 w-3" />}
              label="Delete"
              onClick={onDelete}
              danger
            />
          </ActionRow>
        </div>
      </div>
    );
  }

  const offering = isAltar ? extractAltarOffering(message.content) : null;

  return (
    <div className="flex flex-col gap-1.5 animate-selah-bubble-in">
      <div className="flex items-center gap-1.5 pl-1">
        <Sparkles className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-[0.28em] text-gold/60">Selah ✦</span>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-[20px] rounded-bl-[6px] border border-gold/15 bg-obsidian-elevated/60 backdrop-blur-xl px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
          <p
            className="font-display text-[15.5px] text-foreground/92 whitespace-pre-wrap"
            style={{ lineHeight: "1.7" }}
          >
            {message.content}
          </p>

          {canSaveDraft && (
            <div className="mt-3 pt-2.5 border-t border-gold/10 flex items-center justify-end gap-3 text-[11px]">
              {saved ? (
                <button
                  onClick={onOpenWorkspace}
                  className="text-gold hover:text-gold-soft transition-colors"
                >
                  Open draft →
                </button>
              ) : (
                <button
                  onClick={onSaveDraft}
                  disabled={saving}
                  className="text-muted-foreground hover:text-gold transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save to Workspace"}
                </button>
              )}
            </div>
          )}

          {isAltar && offering && (
            <div className="mt-3 pt-2.5 border-t border-gold/15 flex items-center justify-end text-[11px]">
              {saved ? (
                <span className="text-gold/80 inline-flex items-center gap-1.5">
                  <BookmarkPlus className="h-3 w-3" /> Kept in Sanctuary
                </span>
              ) : (
                <button
                  onClick={onKeepTruth}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 text-gold-soft hover:text-gold transition-colors disabled:opacity-50"
                >
                  <BookmarkPlus className="h-3 w-3" />
                  {saving ? "Keeping…" : "Keep this truth"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* AI bubble actions: Read aloud · Copy · Delete */}
      <div className="pl-1">
        <ActionRow>
          <ActionBtn
            icon={speaking ? <StopIcon className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            label={speaking ? "Stop" : "Read aloud"}
            onClick={onReadAloud}
            active={speaking}
          />
          <ActionBtn icon={<CopyIcon className="h-3 w-3" />} label="Copy" onClick={onCopy} />
          <ActionBtn
            icon={<Trash2 className="h-3 w-3" />}
            label="Delete"
            onClick={onDelete}
            danger
          />
        </ActionRow>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex flex-col gap-1.5 animate-selah-bubble-in">
      <div className="flex items-center gap-1.5 pl-1">
        <Sparkles className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-[0.28em] text-gold/60">Selah ✦</span>
      </div>
      <div className="flex justify-start">
        <div className="rounded-[20px] rounded-bl-[6px] border border-gold/15 bg-obsidian-elevated/60 backdrop-blur-xl px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1.5 w-1.5 rounded-full bg-gold/60 animate-selah-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
