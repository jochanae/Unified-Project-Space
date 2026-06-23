/**
 * PoemDeepDivePanel — In-editor Deep Dive analysis for a saved poem.
 *
 * Calls the `poem-deep-dive` edge function, renders the structured analysis
 * (scripture connections, theme unpacking, alternate versions), and caches
 * the result on the poem row's `deep_dive` JSONB so re-opens are instant.
 *
 * Below the analysis sit two "Take this further" external links — kept as
 * a secondary surface, never as the primary path. Internal insight first.
 */

import { useEffect, useState } from "react";
import {
  Sparkles,
  Copy,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updatePoem, type PoemRecord, poemFullText } from "@/lib/poems";
import { exportPoemToPdf } from "@/lib/poemPdf";
import { cn } from "@/lib/utils";

/** Compact relative time, e.g. "2m ago", "3h ago", "yesterday". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface ScriptureConnection {
  reference: string;
  why: string;
}

interface AlternateVersion {
  tone: string;
  text: string;
}

export interface PoemDeepDiveAnalysis {
  scripture_connections: ScriptureConnection[];
  theme_unpacking: string[];
  alternate_versions: AlternateVersion[];
  generated_at?: string;
}

interface Props {
  poem: PoemRecord;
  /** Bubble the updated record back so the parent's local state stays in sync. */
  onUpdated?: (record: PoemRecord) => void;
}

function isAnalysis(value: unknown): value is PoemDeepDiveAnalysis {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.scripture_connections) &&
    Array.isArray(v.theme_unpacking) &&
    Array.isArray(v.alternate_versions)
  );
}

export function PoemDeepDivePanel({ poem, onUpdated }: Props) {
  const cached = isAnalysis(poem.deep_dive) ? poem.deep_dive : null;
  const [analysis, setAnalysis] = useState<PoemDeepDiveAnalysis | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the parent swaps to a different poem.
  useEffect(() => {
    setAnalysis(isAnalysis(poem.deep_dive) ? poem.deep_dive : null);
    setError(null);
  }, [poem.id, poem.deep_dive]);

  const run = async (force = false) => {
    if (loading) return;
    if (!force && analysis) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("poem-deep-dive", {
        body: {
          template: poem.template,
          title: poem.title ?? undefined,
          body: poem.body,
          praise: poem.praise,
          anchor: poem.anchor,
          line: poem.line,
          inspiration: poem.inspiration ?? undefined,
        },
      });

      if (fnError) {
        // Edge function returns structured error JSON for 402/429/etc.
        const msg = (fnError as { message?: string })?.message ?? "Deep Dive failed.";
        throw new Error(msg);
      }
      const result = (data as { analysis?: unknown; error?: string })?.analysis;
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) throw new Error(errMsg);
      if (!isAnalysis(result)) throw new Error("Deep Dive returned an unexpected shape.");

      const stamped: PoemDeepDiveAnalysis = { ...result, generated_at: new Date().toISOString() };
      setAnalysis(stamped);

      // Cache on the poem row so re-opens skip the AI call.
      try {
        const updated = await updatePoem({ id: poem.id, deepDive: stamped });
        onUpdated?.(updated);
      } catch {
        // Cache failure is non-fatal — analysis is already on screen.
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deep Dive failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── External hand-off (secondary; internal insight always wins) ──
  const externalPrompt = (() => {
    const poemText = poemFullText(poem);
    return [
      "Help me sit with this poem I wrote.",
      "Identify the imagery and themes actually present, suggest 3 scripture passages that resonate, and offer one alternate-tone rewrite.",
      "Stay grounded in the words I wrote.",
      "",
      "Poem:",
      poemText,
    ].join("\n");
  })();

  const chatGptUrl = `https://chat.openai.com/?q=${encodeURIComponent(externalPrompt)}`;
  const perplexityUrl = `https://www.perplexity.ai/search/?q=${encodeURIComponent(externalPrompt)}`;

  return (
    <section className="hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-5 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Deep Dive</p>
          <h3 className="font-display text-lg text-foreground mt-1">
            Sit with what you've written
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Internal insight first — scripture, theme, and alternate tones grounded in your own
            words.
          </p>
          {analysis?.generated_at && (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mt-2">
              Updated {relativeTime(analysis.generated_at)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={() => {
              try {
                exportPoemToPdf(poem);
                toast.success("Poem exported");
              } catch {
                toast.error("Couldn't export PDF");
              }
            }}
            title="Export as PDF"
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-gold-soft transition-colors px-2 py-1"
          >
            <Download className="h-3 w-3" />
            PDF
          </button>
          {analysis && !loading && (
            <button
              onClick={() => run(true)}
              title="Regenerate"
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-gold-soft transition-colors px-2 py-1"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
          )}
        </div>
      </header>

      {!analysis && !loading && !error && (
        <button
          onClick={() => run(false)}
          className="w-full hairline rounded-md bg-gold/10 hover:bg-gold/20 text-gold-soft py-3 text-sm uppercase tracking-widest transition-colors inline-flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Run Deep Dive
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          Sitting with your words…
        </div>
      )}

      {error && !loading && (
        <div className="hairline rounded-md bg-crimson/10 border-crimson/30 p-3 flex items-start gap-2 text-xs text-foreground/90">
          <AlertTriangle className="h-3.5 w-3.5 text-crimson shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p>{error}</p>
            <button
              onClick={() => run(true)}
              className="mt-1.5 text-gold-soft hover:text-gold underline-offset-2 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {analysis.scripture_connections.length > 0 && (
            <Section title="Scripture connections">
              <ul className="space-y-2">
                {analysis.scripture_connections.map((c, i) => (
                  <li key={i} className="hairline rounded-md bg-obsidian/40 px-3 py-2">
                    <p className="text-xs uppercase tracking-widest text-gold/80">{c.reference}</p>
                    <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{c.why}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {analysis.theme_unpacking.length > 0 && (
            <Section title="Theme & symbolism">
              <div className="space-y-3">
                {analysis.theme_unpacking.map((p, i) => (
                  <p
                    key={i}
                    className="text-sm text-foreground/90 leading-relaxed font-display italic"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {analysis.alternate_versions.length > 0 && (
            <Section title="Alternate versions">
              <div className="space-y-3">
                {analysis.alternate_versions.map((v, i) => (
                  <AlternateCard key={i} version={v} />
                ))}
              </div>
            </Section>
          )}

          {/* Secondary: external hand-off — beneath internal insight, never above. */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2">
              Take this further
            </p>
            <div className="flex flex-wrap gap-2">
              <ExternalLinkBtn href={chatGptUrl} label="ChatGPT" />
              <ExternalLinkBtn href={perplexityUrl} label="Perplexity" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-[0.28em] text-gold/80 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function AlternateCard({ version }: { version: AlternateVersion }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(version.text);
      setCopied(true);
      toast.success(`Copied ${version.tone} version`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };
  return (
    <div className="hairline rounded-md bg-obsidian/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-gold/80">{version.tone}</span>
        <button
          onClick={copy}
          className={cn(
            "inline-flex items-center gap-1 text-[10px] uppercase tracking-widest transition-colors",
            copied ? "text-gold" : "text-muted-foreground hover:text-gold-soft",
          )}
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-display italic">
        {version.text}
      </p>
    </div>
  );
}

function ExternalLinkBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs hairline rounded-md bg-obsidian/40 hover:bg-obsidian/60 px-3 py-1.5 text-muted-foreground hover:text-gold-soft transition-colors"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}
