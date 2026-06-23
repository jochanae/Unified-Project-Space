/**
 * DeepDiveJournals — "Recent Insights" panel inside the Library sheet.
 *
 * Groups Deep Dive history by passage reference (e.g. "John 3:16") and
 * shows each entry with the canonical prompt SanctumIQ helped craft.
 *
 * Design rules (per user direction):
 *  - Provider labels are stripped to just "ChatGPT" / "Perplexity".
 *  - Custom "Seek Wisdom" inquiries get a small gold sparkle icon — no
 *    "(custom)" / "Native" / "Web" technical chatter.
 *  - One-tap "Purge" clears the entire archive; per-row delete is also
 *    available via the trash icon.
 *
 * Paid-tier only (Minister, Church Partner, Admin). Hidden for free users.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeepDiveHistory, type DeepDiveHistoryEntry } from "@/hooks/useDeepDiveHistory";
import { cn } from "@/lib/utils";

type ProviderLabel = "ChatGPT" | "Perplexity";

/**
 * Strip technical metadata like "(custom)" / "(web)" / "(native)" from the
 * stored provider string. Returns the clean provider name plus an
 * `isCustom` flag the UI uses to render the gold sparkle.
 */
function normalizeProvider(raw: string): { label: ProviderLabel; isCustom: boolean } {
  const lower = raw.toLowerCase();
  const isCustom = lower.includes("custom");
  const label: ProviderLabel = lower.startsWith("perplexity") ? "Perplexity" : "ChatGPT";
  return { label, isCustom };
}

type Group = {
  reference: string;
  entries: DeepDiveHistoryEntry[];
  latest: string; // ISO date of newest entry, used for sort
};

export function DeepDiveJournals() {
  const { entries, loading, hasPaidAccess, remove, reopen, clearAll } = useDeepDiveHistory();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const entry of entries) {
      const key = entry.reference_label || `${entry.book} ${entry.chapter}`;
      const existing = map.get(key);
      if (existing) {
        existing.entries.push(entry);
        if (entry.created_at > existing.latest) existing.latest = entry.created_at;
      } else {
        map.set(key, { reference: key, entries: [entry], latest: entry.created_at });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.latest < b.latest ? 1 : -1));
  }, [entries]);

  if (!hasPaidAccess) return null;

  const toggle = (reference: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(reference)) next.delete(reference);
      else next.add(reference);
      return next;
    });
  };

  const handlePurge = async () => {
    if (!confirmingPurge) {
      setConfirmingPurge(true);
      window.setTimeout(() => setConfirmingPurge(false), 4000);
      return;
    }
    setConfirmingPurge(false);
    const result = await clearAll();
    if (result.ok) {
      toast.success("Deep Dive archive purged", {
        description: `${result.cleared} entries cleared.`,
      });
    } else {
      toast.error("Couldn't purge the archive", {
        description: "Please try again in a moment.",
      });
    }
  };

  return (
    <section
      aria-label="Deep Dive Journals"
      className="mb-3 rounded-md border border-gold/14 bg-background/20 p-3"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-gold/70">
            Deep Dive Journals
          </h3>
        </div>
        {entries.length > 0 ? (
          <button
            type="button"
            onClick={handlePurge}
            className={cn(
              "text-[10px] uppercase tracking-[0.18em] transition-colors",
              confirmingPurge
                ? "text-destructive hover:text-destructive/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {confirmingPurge ? "Tap to confirm" : "Purge"}
          </button>
        ) : null}
      </header>

      {loading ? (
        <p className="mt-2 text-xs italic text-muted-foreground/70">Loading archive…</p>
      ) : groups.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Your Deep Dive inquiries are archived here once you ask one — like a quiet study journal.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {groups.map((group) => {
            const isOpen = expanded.has(group.reference);
            return (
              <li
                key={group.reference}
                className="overflow-hidden rounded-md border border-gold/10 bg-background/30"
              >
                <button
                  type="button"
                  onClick={() => toggle(group.reference)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-gold/5"
                >
                  <span className="flex items-center gap-1.5 truncate font-display text-sm text-gold-soft">
                    {isOpen ? (
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0 text-gold/50"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-gold/50"
                        strokeWidth={1.75}
                      />
                    )}
                    <span className="truncate">{group.reference}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group.entries.length}
                  </span>
                </button>
                {isOpen ? (
                  <ul className="space-y-1.5 border-t border-gold/10 px-2.5 py-2">
                    {group.entries.map((entry) => {
                      const { label, isCustom } = normalizeProvider(entry.provider);
                      return (
                        <li
                          key={entry.id}
                          className="rounded-md border border-gold/8 bg-background/40 p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px]",
                                isCustom ? "italic text-gold-soft" : "text-foreground/85",
                              )}
                            >
                              {isCustom ? (
                                <Sparkles
                                  className="h-3 w-3 text-gold"
                                  strokeWidth={1.75}
                                  aria-label="Custom Seek Wisdom inquiry"
                                />
                              ) : null}
                              {label}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => reopen(entry)}
                                aria-label="Reopen this Deep Dive"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold-soft"
                              >
                                <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove(entry.id)}
                                aria-label="Delete this entry"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                            {entry.prompt}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
