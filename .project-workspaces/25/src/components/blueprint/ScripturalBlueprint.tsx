/**
 * ScripturalBlueprint — luxury, theme-aware research card.
 *
 * Theme-adaptive via semantic tokens:
 *  - Sanctum (obsidian): card surface = obsidian-elevated, gold grid @ 5%.
 *  - Patriarch (parchment): card surface = warm vellum, sepia grid @ 3%
 *    (driven by `.parchment .blueprint-grid` override in src/styles.css).
 *
 * Static shell — data shape mirrors what we'll later persist as
 * `vault_items.item_type = 'blueprint'` (note_text holds JSON of this struct).
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Share2,
  Clock,
  Languages,
  GitBranch,
  Sparkles,
  Bookmark,
  Download,
  FileText,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  copyBlueprintText,
  downloadBlueprintPDF,
  downloadBlueprintText,
} from "@/lib/blueprint-export";
import { toast } from "sonner";

export type BlueprintData = {
  reference: string; // "John 3:16"
  version: string; // "KJV"
  passageText: string;
  historicalContext: { heading: string; body: string }[];
  linguisticRoots: {
    term: string;
    language: "Greek" | "Hebrew" | "Aramaic";
    gloss: string;
    note: string;
  }[];
  crossReferences: { ref: string; note: string }[];
  actionSteps: string[];
};

type Props = {
  data: BlueprintData;
  onDeepDive?: (seed?: string) => void;
  onCopy?: () => void;
  onShare?: () => void;
  onSaveToVault?: () => void;
  /** Increment to replay the gold vault pulse (e.g. after a successful update). */
  pulseKey?: number;
  className?: string;
};

export function ScripturalBlueprint({
  data,
  onDeepDive,
  onCopy,
  onShare,
  onSaveToVault,
  pulseKey = 0,
  className,
}: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  // Force the drafting animation to replay on every mount/passage change.
  const [draftKey, setDraftKey] = useState(0);
  useEffect(() => {
    setDraftKey((k) => k + 1);
    setChecked(new Set());
  }, [data.reference]);

  // Replay the vault handshake pulse whenever pulseKey changes (e.g. after update).
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (!pulseKey) return;
    setPulsing(true);
    const t = window.setTimeout(() => setPulsing(false), 1200);
    return () => window.clearTimeout(t);
  }, [pulseKey]);

  const toggleStep = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <article
      key={draftKey}
      className={cn(
        "blueprint-card relative overflow-hidden rounded-2xl",
        // Semantic surface — auto-swaps obsidian↔alabaster via tokens
        "bg-card/80 backdrop-blur-md",
        "border border-transparent",
        "shadow-[0_8px_32px_-12px_color-mix(in_oklab,var(--foreground)_24%,transparent)]",
        "animate-blueprint-draft",
        pulsing && "animate-blueprint-vault-pulse",
        className,
      )}
      style={{
        backgroundImage: `
          linear-gradient(color-mix(in oklab, var(--card) 85%, transparent), color-mix(in oklab, var(--card) 85%, transparent)),
          linear-gradient(135deg, var(--gold) 0%, transparent 40%, transparent 60%, var(--gold) 100%)
        `,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <BlueprintGrid />

      <div className="relative z-10 p-5 sm:p-7 space-y-6">
        {/* ── ANCHOR ─────────────────────────────────────────────── */}
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70 font-sans">
                Scriptural Blueprint
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-foreground leading-tight">
                {data.reference}
              </h2>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {data.version}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCopy}
                className="h-8 w-8 text-muted-foreground hover:text-gold"
                aria-label="Copy passage"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="h-8 w-8 text-muted-foreground hover:text-gold"
                aria-label="Share blueprint"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-gold"
                    aria-label="Export blueprint"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={async () => {
                      const ok = await copyBlueprintText(data);
                      if (ok) toast.success("Blueprint copied as clean text");
                      else toast.error("Couldn't copy — try the download instead.");
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Copy clean text
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      try {
                        downloadBlueprintText(data);
                      } catch {
                        toast.error("Download failed.");
                      }
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Download .txt
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      try {
                        downloadBlueprintPDF(data);
                      } catch (err) {
                        console.error("blueprint pdf", err);
                        toast.error("Couldn't generate PDF.");
                      }
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Download branded PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {onSaveToVault && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSaveToVault}
                  className="h-8 w-8 text-muted-foreground hover:text-gold"
                  aria-label="Save blueprint to vault"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <blockquote className="font-display text-base sm:text-lg text-foreground/90 leading-relaxed pl-3 border-l border-gold/40">
            {data.passageText}
          </blockquote>
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        {/* ── SCAFFOLDING (collapsed by default) ─────────────────── */}
        <Accordion type="multiple" className="space-y-2">
          <Folder
            value="historical"
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Historical Context"
            count={data.historicalContext.length}
          >
            <ol className="relative space-y-4 pl-5 border-l border-gold/20">
              {data.historicalContext.map((item, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-gold/60 ring-2 ring-card" />
                  <h4 className="font-display text-sm text-gold-soft mb-1">{item.heading}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ol>
          </Folder>

          <Folder
            value="linguistic"
            icon={<Languages className="h-3.5 w-3.5" />}
            label="Linguistic Roots"
            count={data.linguisticRoots.length}
          >
            <ul className="space-y-3">
              {data.linguisticRoots.map((root, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gold/15 bg-background/40 p-3 space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-lg text-gold">{root.term}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {root.language}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onDeepDive?.(`${root.term} (${root.language}) — ${data.reference}`)
                      }
                      className="text-[11px] text-gold/80 hover:text-gold inline-flex items-center gap-1 transition-colors"
                      aria-label={`Deep Dive on ${root.term}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      Deep Dive
                    </button>
                  </div>
                  <p className="text-sm text-foreground/90 italic">{root.gloss}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{root.note}</p>
                </li>
              ))}
            </ul>
          </Folder>

          <Folder
            value="cross-refs"
            icon={<GitBranch className="h-3.5 w-3.5" />}
            label="Cross-References"
            count={data.crossReferences.length}
          >
            <ul className="space-y-2.5">
              {data.crossReferences.map((ref, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-gold/5 transition-colors"
                >
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gold/50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-gold-soft">{ref.ref}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ref.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Folder>
        </Accordion>

        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        {/* ── APPLICATION ────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3
              className="font-display text-sm uppercase text-gold"
              style={{ letterSpacing: "0.18em" }}
            >
              Practical Blueprint
            </h3>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground shrink-0">
              {checked.size} / {data.actionSteps.length} marked
            </span>
          </div>
          <ul className="space-y-2">
            {data.actionSteps.map((step, i) => {
              const isDone = checked.has(i);
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-3 py-3.5 border transition-all",
                    isDone
                      ? "border-gold/40 bg-gold/5"
                      : "border-gold/15 bg-background/30 hover:border-gold/25",
                  )}
                >
                  <Checkbox
                    id={`step-${i}`}
                    checked={isDone}
                    onCheckedChange={() => toggleStep(i)}
                    className="mt-0.5 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-background"
                  />
                  <label
                    htmlFor={`step-${i}`}
                    className={cn(
                      "text-sm leading-relaxed cursor-pointer flex-1 self-center",
                      isDone ? "text-muted-foreground line-through" : "text-foreground/90",
                    )}
                  >
                    {step}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Watermark + primary Deep Dive — blur to lift off the grid */}
        <div className="flex items-end justify-between pt-2">
          <span className="font-display text-[10px] uppercase tracking-[0.3em] text-gold/40 select-none">
            SanctumIQ
          </span>
          <Button
            onClick={() => onDeepDive?.()}
            size="sm"
            className={cn(
              "bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 hover:text-gold-soft",
              "shadow-[0_2px_8px_-2px_color-mix(in_oklab,var(--gold)_40%,transparent)]",
              "backdrop-blur-md",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Deep Dive on Passage
          </Button>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function BlueprintGrid() {
  return (
    <div
      aria-hidden
      className="blueprint-grid absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, var(--gold) 0 1px, transparent 1px 32px),
          repeating-linear-gradient(90deg, var(--gold) 0 1px, transparent 1px 32px)
        `,
      }}
    />
  );
}

function Folder({
  value,
  icon,
  label,
  count,
  children,
}: {
  value: string;
  icon: ReactNode;
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="border border-gold/15 rounded-lg bg-background/30 px-4 data-[state=open]:bg-background/50 data-[state=open]:border-gold/30 transition-colors"
    >
      <AccordionTrigger className="py-3 hover:no-underline group">
        <div className="flex items-center gap-3 flex-1">
          <span className="grid place-items-center h-7 w-7 rounded-md border border-gold/30 bg-gold/5 text-gold group-data-[state=open]:bg-gold/15 transition-colors">
            {icon}
          </span>
          <span className="font-display text-base text-foreground">{label}</span>
          <span className="ml-auto mr-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            {count}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

/* ─────────────────────────── skeleton ─────────────────────────── */

/**
 * BlueprintSkeleton — cinematic loading state used while the AI is fetching.
 * Keeps the technical grid visible and shimmers gold pulses where the
 * content blocks will land. Matches the live card's silhouette so the
 * transition to real data feels like a "developing photograph."
 */
export function BlueprintSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Blueprint loading"
      className={cn(
        "blueprint-card relative overflow-hidden rounded-2xl",
        "bg-card/80 backdrop-blur-md border border-gold/15",
        "shadow-[0_8px_32px_-12px_color-mix(in_oklab,var(--foreground)_24%,transparent)]",
        className,
      )}
    >
      <BlueprintGrid />
      <div className="relative z-10 p-5 sm:p-7 space-y-6">
        {/* Anchor */}
        <div className="space-y-3">
          <div className="h-2.5 w-32 rounded-sm blueprint-shimmer" />
          <div className="h-7 w-48 rounded-sm blueprint-shimmer" />
          <div className="h-2.5 w-12 rounded-sm blueprint-shimmer" />
          <div className="pl-3 border-l border-gold/40 space-y-2 pt-2">
            <div className="h-3 w-full rounded-sm blueprint-shimmer" />
            <div className="h-3 w-[92%] rounded-sm blueprint-shimmer" />
            <div className="h-3 w-[78%] rounded-sm blueprint-shimmer" />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        {/* Folders */}
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-gold/15 bg-background/30 px-4 py-3 flex items-center gap-3"
            >
              <span className="h-7 w-7 rounded-md border border-gold/20 blueprint-shimmer" />
              <span className="h-3 w-32 rounded-sm blueprint-shimmer" />
              <span className="ml-auto h-2.5 w-6 rounded-sm blueprint-shimmer" />
            </div>
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        {/* Application */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-40 rounded-sm blueprint-shimmer" />
            <div className="h-2.5 w-16 rounded-sm blueprint-shimmer" />
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-md border border-gold/15 bg-background/30 blueprint-shimmer"
            />
          ))}
        </div>
        <div className="flex items-end justify-between pt-2">
          <span className="font-display text-[10px] uppercase tracking-[0.3em] text-gold/40 select-none">
            SanctumIQ
          </span>
          <div className="h-8 w-44 rounded-md blueprint-shimmer" />
        </div>
      </div>
    </article>
  );
}
export const SAMPLE_BLUEPRINT: BlueprintData = {
  reference: "John 3:16",
  version: "KJV",
  passageText:
    "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  historicalContext: [
    {
      heading: "Nicodemus by Night",
      body: "Spoken in a private nighttime exchange with a Pharisee — a moment chosen for discretion, not proclamation. The intimacy reframes the verse as personal counsel before public creed.",
    },
    {
      heading: "Second-Temple Judaism",
      body: "First-century Jewish hearers carried covenantal expectations of national deliverance; Jesus widens 'the world' beyond Israel — a deliberate, scandalous expansion of scope.",
    },
    {
      heading: "Roman-Occupied Judea",
      body: "Under imperial weight, 'everlasting life' lands as both spiritual promise and quiet political defiance — a kingdom not granted by Rome.",
    },
  ],
  linguisticRoots: [
    {
      term: "Agápē",
      language: "Greek",
      gloss: "Self-giving, covenantal love — chosen, not felt.",
      note: "Distinct from philia (affection) and eros (desire). Agápē in John denotes the love that initiates, sacrifices, and persists regardless of response.",
    },
    {
      term: "Monogenēs",
      language: "Greek",
      gloss: "One-of-a-kind, unique son — not merely 'only begotten.'",
      note: "Closer to 'one and only' than the older 'only begotten.' Stresses irreplaceable singularity, not biological generation.",
    },
    {
      term: "Pisteúō",
      language: "Greek",
      gloss: "To believe, trust, entrust oneself to.",
      note: "Active and continuous in tense — ongoing trust, not a single mental assent.",
    },
  ],
  crossReferences: [
    {
      ref: "Romans 5:8",
      note: "God's love demonstrated through Christ's death while we were yet sinners.",
    },
    {
      ref: "1 John 4:9–10",
      note: "Echoes John 3:16 almost verbatim — love defined by sending, not sentiment.",
    },
    {
      ref: "Genesis 22:2",
      note: "Abraham and Isaac — typological foreshadowing of a father offering an only son.",
    },
    {
      ref: "John 1:14",
      note: "The Word made flesh — same monogenēs language as 3:16.",
    },
  ],
  actionSteps: [
    "Sit with the word agápē for one minute before preaching.",
    "Name one person you struggle to love covenantally; pray for them by name.",
    "Replace one sentimental use of 'love' in your manuscript with a costly verb.",
    "Close the sermon with 'whosoever' — let the scope land before the benediction.",
  ],
};
