import { useEffect, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadBible } from "@/lib/scripture";
import { findScriptureRefs, type ScriptureMatch } from "@/lib/scripture-refs";

interface VerseCardProps {
  match: ScriptureMatch;
  children: React.ReactNode;
}

function VerseCard({ match, children }: VerseCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses] = useState<Array<{ n: number; text: string }> | null>(null);
  const [bookIndex, setBookIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || verses || loading) return;
    let alive = true;
    setLoading(true);
    setError(null);
    loadBible()
      .then((bible) => {
        if (!alive) return;
        const idx = bible.books.findIndex((b) => b.name === match.book);
        if (idx < 0) {
          setError("Book not found");
          return;
        }
        setBookIndex(idx);
        const chapterArr = bible.KJV[idx]?.chapters[match.chapter - 1] ?? [];
        if (!chapterArr.length) {
          setError("Chapter not found");
          return;
        }
        const start = match.verseStart ?? 1;
        const end = match.verseEnd ?? match.verseStart ?? chapterArr.length;
        const slice = chapterArr.slice(start - 1, end).map((text, i) => ({ n: start + i, text }));
        setVerses(slice.slice(0, 8));
      })
      .catch(() => alive && setError("Could not load verse"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, match, verses, loading]);

  const refLabel = match.verseStart
    ? `${match.book} ${match.chapter}:${match.verseStart}${match.verseEnd ? `–${match.verseEnd}` : ""}`
    : `${match.book} ${match.chapter}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold transition-colors"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] border-gold/20 bg-obsidian-elevated p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold">{refLabel}</p>
          <Link
            to="/reader"
            search={{ bookIndex: bookIndex ?? undefined, chapter: match.chapter }}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-gold"
          >
            Open <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {verses && (
          <div className="space-y-1.5 text-sm text-foreground/90 leading-relaxed max-h-64 overflow-y-auto">
            {verses.map((v) => (
              <p key={v.n}>
                <sup className="text-gold/60 mr-1">{v.n}</sup>
                {v.text}
              </p>
            ))}
            {verses.length === 8 && (
              <p className="text-[10px] text-muted-foreground/70 pt-1">
                Showing first 8 verses. Tap "Open" for the full passage.
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface ScriptureLinkifiedProps {
  text: string;
  className?: string;
}

export function ScriptureLinkified({ text, className }: ScriptureLinkifiedProps) {
  if (!text) return null;
  const matches = findScriptureRefs(text);
  if (matches.length === 0) {
    return <div className={className}>{text}</div>;
  }
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) parts.push(text.slice(cursor, m.start));
    parts.push(
      <VerseCard key={`${i}-${m.start}`} match={m}>
        {m.raw}
      </VerseCard>,
    );
    cursor = m.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <div className={className} style={{ whiteSpace: "pre-wrap" }}>
      {parts}
    </div>
  );
}
