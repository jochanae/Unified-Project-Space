/**
 * SmartEmptyState — empty results state with contextual query suggestions.
 *
 * Suggestions are computed from the user's active filters (book, status,
 * available books) so the prompts feel relevant: e.g. if a book filter is
 * active we suggest a phrase scoped to it; if status:draft is active we
 * suggest swapping to anchored; etc.
 */

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type Suggestion = {
  query: string;
  label?: string; // optional override label
  hint?: string; // small explanatory caption
};

type Props = {
  message?: string;
  query: string;
  suggestions: Suggestion[];
  onApply: (query: string) => void;
  onClearFilters?: () => void;
  className?: string;
};

export function SmartEmptyState({
  message,
  query,
  suggestions,
  onApply,
  onClearFilters,
  className,
}: Props) {
  const hasQuery = query.trim().length > 0;
  return (
    <div
      className={cn(
        "hairline rounded-xl border-dashed bg-obsidian/30 px-6 py-8 text-center space-y-4",
        className,
      )}
    >
      <div className="space-y-1.5">
        <Sparkles className="h-5 w-5 text-gold/30 mx-auto" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground/80">
          {message ??
            (hasQuery ? `No matches for “${query}”.` : "No matches for the current filters.")}
        </p>
        <p className="text-[11px] text-muted-foreground/50">Try one of these searches:</p>
      </div>

      <ul className="flex flex-wrap justify-center gap-1.5">
        {suggestions.map((s) => (
          <li key={s.query}>
            <button
              type="button"
              onClick={() => onApply(s.query)}
              title={s.hint}
              className="font-mono text-[11px] px-2 py-1 rounded-md bg-obsidian-elevated/60 hairline text-gold-soft hover:text-gold hover:border-gold/40 transition-colors"
            >
              {s.label ?? s.query}
            </button>
          </li>
        ))}
      </ul>

      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 hover:text-gold-soft transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Suggestion builders
   ───────────────────────────────────────────────────────────── */

/**
 * Build /notes suggestions from active filters and available books.
 * Mixes filter-aware swaps with broader fallbacks so users always see 3-4 chips.
 */
export function buildNotesSuggestions(opts: {
  bookFilter: string | null;
  statusFilter: "all" | "draft" | "sketch" | "anchored" | "mixed";
  availableBooks: string[];
}): Suggestion[] {
  const { bookFilter, statusFilter, availableBooks } = opts;
  const out: Suggestion[] = [];

  if (bookFilter) {
    out.push({ query: `book:${bookFilter}`, hint: `All notes anchored in ${bookFilter}` });
  } else if (availableBooks[0]) {
    out.push({
      query: `book:${availableBooks[0]}`,
      hint: `Try notes anchored in ${availableBooks[0]}`,
    });
  }

  if (statusFilter !== "all") {
    const swap = statusFilter === "draft" ? "anchored" : "draft";
    out.push({ query: `status:${swap}`, hint: `Swap to ${swap} notes` });
  } else {
    out.push({ query: "status:anchored", hint: "Notes tied to scripture" });
  }

  if (bookFilter) {
    out.push({ query: `book:${bookFilter} status:draft`, hint: "Drafts in this book" });
  } else {
    out.push({ query: '"in the beginning"', hint: "Exact phrase example" });
  }

  if (availableBooks[1]) {
    out.push({ query: `book:${availableBooks[1]}`, hint: `Pivot to ${availableBooks[1]}` });
  }

  return dedupe(out).slice(0, 4);
}

/**
 * Build /saved suggestions from active filters and available books.
 */
export function buildSavedSuggestions(opts: {
  bookFilter: string | null;
  availableBooks: string[];
  tab: "bookmarks" | "highlights" | "notes";
}): Suggestion[] {
  const { bookFilter, availableBooks, tab } = opts;
  const out: Suggestion[] = [];

  if (bookFilter) {
    out.push({ query: `book:${bookFilter}`, hint: `All ${tab} in ${bookFilter}` });
  } else if (availableBooks[0]) {
    out.push({ query: `book:${availableBooks[0]}`, hint: `Try ${availableBooks[0]}` });
  }

  out.push({ query: "testament:new", hint: "Limit to New Testament" });
  out.push({ query: "testament:old", hint: "Limit to Old Testament" });

  if (availableBooks[1]) {
    out.push({ query: `book:${availableBooks[1]}`, hint: `Pivot to ${availableBooks[1]}` });
  } else {
    out.push({ query: '"grace"', hint: "Exact phrase example" });
  }

  return dedupe(out).slice(0, 4);
}

/**
 * Build /vault suggestions from available colors and active filter.
 */
export function buildVaultSuggestions(opts: {
  colorFilter: string | null;
  availableColors: string[];
}): Suggestion[] {
  const { colorFilter, availableColors } = opts;
  const out: Suggestion[] = [];

  if (colorFilter) {
    out.push({ query: `color:${colorFilter}`, hint: `All ${colorFilter} collections` });
  } else if (availableColors[0]) {
    out.push({
      query: `color:${availableColors[0]}`,
      hint: `Try ${availableColors[0]} collections`,
    });
  }

  out.push({ query: "has:thought", hint: "Collections with a master thought" });
  out.push({ query: "archived:true", hint: "Show archived collections" });

  if (availableColors[1]) {
    out.push({ query: `color:${availableColors[1]}`, hint: `Pivot to ${availableColors[1]}` });
  } else {
    out.push({ query: '"provision"', hint: "Exact phrase example" });
  }

  return dedupe(out).slice(0, 4);
}

function dedupe(arr: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return arr.filter((s) => {
    if (seen.has(s.query)) return false;
    seen.add(s.query);
    return true;
  });
}
