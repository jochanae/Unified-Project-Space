/**
 * ServiceDrawer — live note-taking during service
 *
 * Collapsed: single bar showing note title + entry count
 * Expanded:  scrollable running log + thumb-level input
 *
 * Minister / Church Partner only.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Send, X, Mic2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ServiceEntry = {
  time: string; // e.g. "11:15 AM"
  reference?: string; // e.g. "John 3:16"
  text: string; // verse text or typed thought
  isVerse: boolean;
};

type Props = {
  userId: string;
  open: boolean; // drawer expanded
  onOpenChange: (open: boolean) => void;
  noteId: string | null; // active service note id
  noteTitle: string; // e.g. "Sunday Service — April 21, 2026"
  entries: ServiceEntry[];
  onEntryAdded: (entry: ServiceEntry) => void;
  onNoteReady: (id: string) => void; // called when note is created
};

export function ServiceDrawer({
  userId,
  open,
  onOpenChange,
  noteId,
  noteTitle,
  entries,
  onEntryAdded,
  onNoteReady,
}: Props) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new entries arrive
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, open]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const persistEntries = async (updatedEntries: ServiceEntry[], currentNoteId: string | null) => {
    const body = formatEntriesAsText(updatedEntries);
    if (currentNoteId) {
      await supabase
        .from("notes")
        .update({ body_text: body, updated_at: new Date().toISOString() })
        .eq("id", currentNoteId)
        .eq("user_id", userId);
    } else {
      // Create the note
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          body_text: body,
          scripture_ref: noteTitle,
        })
        .select("id")
        .single();
      if (!error && data) onNoteReady(data.id);
    }
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || saving) return;
    setSaving(true);

    const entry: ServiceEntry = {
      time: formatTime(new Date()),
      text: trimmed,
      isVerse: false,
    };

    onEntryAdded(entry);
    setInput("");
    await persistEntries([...entries, entry], noteId);
    setSaving(false);
  };

  const verseCount = entries.filter((e) => e.isVerse).length;
  const thoughtCount = entries.filter((e) => !e.isVerse).length;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 transition-all duration-300 ease-out",
        "md:hidden", // mobile only
      )}
      style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Collapsed bar */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-obsidian-elevated/92 backdrop-blur-xl border-t border-gold/15"
          style={{ marginBottom: 80 }} // above bottom nav
        >
          <div className="flex items-center gap-2 min-w-0">
            <Mic2 className="h-3.5 w-3.5 text-gold shrink-0 animate-pulse" strokeWidth={1.5} />
            <span className="font-display text-sm text-gold-soft truncate">{noteTitle}</span>
            {entries.length > 0 && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 shrink-0">
                {verseCount > 0 ? `${verseCount}v` : ""}
                {verseCount > 0 && thoughtCount > 0 ? " · " : ""}
                {thoughtCount > 0 ? `${thoughtCount}t` : ""}
              </span>
            )}
          </div>
          <ChevronUp className="h-4 w-4 text-gold/60 shrink-0" />
        </button>
      )}

      {/* Expanded half-sheet */}
      {open && (
        <div
          className="flex flex-col bg-obsidian-elevated/95 backdrop-blur-2xl backdrop-saturate-150 border-t border-gold/18 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"
          style={{
            height: "52vh",
            marginBottom: 80,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gold/10 shrink-0">
            <div className="flex items-center gap-2">
              <Mic2 className="h-3.5 w-3.5 text-gold animate-pulse" strokeWidth={1.5} />
              <span className="font-display text-sm text-gold-soft">{noteTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable entries */}
          <div
            ref={scrollRef}
            className={cn(
              "flex-1 overflow-y-auto px-4 py-3 space-y-3 transition-all duration-200",
              focused && "opacity-60 pointer-events-none",
            )}
          >
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic text-center py-6">
                Verses and thoughts you capture will appear here.
              </p>
            ) : (
              entries.map((entry, i) => <EntryRow key={i} entry={entry} />)
            )}
          </div>

          {/* Input area — always at bottom, closest to thumbs */}
          <div
            className={cn(
              "shrink-0 border-t border-gold/12 px-3 py-2.5 flex items-end gap-2",
              focused && "border-gold/30",
            )}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Type a thought…"
              rows={2}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!input.trim() || saving}
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/90 text-obsidian disabled:opacity-30 transition-all hover:bg-gold active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: ServiceEntry }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-gold/50 shrink-0">
          {entry.time}
        </span>
        {entry.reference && (
          <span className="text-[11px] font-display text-gold-soft">{entry.reference}</span>
        )}
      </div>
      <p
        className={cn(
          "text-sm leading-relaxed",
          entry.isVerse ? "italic text-foreground/80" : "text-foreground/90",
        )}
      >
        {entry.isVerse ? `"${entry.text}"` : entry.text}
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatEntriesAsText(entries: ServiceEntry[]): string {
  return entries
    .map((e) => {
      const header = e.reference ? `[${e.time}] ${e.reference}` : `[${e.time}]`;
      const body = e.isVerse ? `"${e.text}"` : e.text;
      return `${header}\n${body}`;
    })
    .join("\n\n");
}

export function parseEntriesFromText(text: string): ServiceEntry[] {
  const blocks = text.split(/\n\n+/);
  const entries: ServiceEntry[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (!lines.length) continue;
    const headerMatch = lines[0]?.match(/^\[(\d+:\d+\s*[AP]M)\]\s*(.*)?$/i);
    if (!headerMatch) continue;
    const time = headerMatch[1] ?? "";
    const reference = headerMatch[2]?.trim() || undefined;
    const bodyLine = lines.slice(1).join("\n").trim();
    if (!bodyLine) continue;
    const isVerse = bodyLine.startsWith('"') && bodyLine.endsWith('"');
    const text = isVerse ? bodyLine.slice(1, -1) : bodyLine;
    entries.push({ time, reference, text, isVerse });
  }
  return entries;
}

export function buildServiceNoteTitle(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const date = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${day} Service \u2014 ${date}`;
}
