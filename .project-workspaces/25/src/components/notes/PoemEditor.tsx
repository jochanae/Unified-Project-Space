/**
 * PoemEditor — three sacred expression templates
 *
 * Heart Cry   — free-form, no structure required
 * Psalm       — two movements: praise/lament + anchor verse
 * Proverb     — a single distilled line of wisdom
 *
 * Features:
 *  • Free-text inspiration field (optional, multi-verse / cross-book)
 *  • Seek Wisdom — Deep Dive adapted for poem context (ChatGPT / Perplexity)
 *  • Verse Art — canvas card with 3 mood backgrounds (social sharing)
 *  • Poem Scroll — jsPDF formatted document (save / print / email)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Download,
  Eye,
  Feather,
  FileText,
  Heart,
  Link2,
  Printer,
  Search,
  Share2,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildDeepDiveLink, buildDeepDiveCustomPrompt } from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import { useDeepDiveHistory } from "@/hooks/useDeepDiveHistory";
import {
  downloadPoemPDF,
  buildPoemPDFBlob,
  buildPoemPDFBlobWithMeta,
  type PdfQuality,
  type VerseLinkRecord,
} from "@/lib/poem-export";
import { toast } from "sonner";

// ─── types ───────────────────────────────────────────────────────────────────

export type PoemTemplate = "heart_cry" | "psalm" | "proverb";

export type PoemData =
  | { template: "heart_cry"; body: string }
  | { template: "psalm"; praise: string; anchor: string }
  | { template: "proverb"; line: string };

export const POEM_PREFIX = "__POEM__:";

export function serialisePoem(data: PoemData, inspiration?: string): string {
  return POEM_PREFIX + JSON.stringify({ ...data, _inspiration: inspiration ?? "" });
}

export function deserialisePoem(raw: string): { data: PoemData; inspiration: string } | null {
  if (!raw.startsWith(POEM_PREFIX)) return null;
  try {
    const parsed = JSON.parse(raw.slice(POEM_PREFIX.length));
    if (!parsed?.template) return null;
    const inspiration = typeof parsed._inspiration === "string" ? parsed._inspiration : "";

    const { _inspiration, ...data } = parsed;
    return { data: data as PoemData, inspiration };
  } catch {
    return null;
  }
}

export function poemPreviewText(data: PoemData): string {
  switch (data.template) {
    case "heart_cry":
      return data.body.trim().slice(0, 120) || "(empty)";
    case "psalm":
      return (data.praise || data.anchor || "").trim().slice(0, 120) || "(empty)";
    case "proverb":
      return data.line.trim().slice(0, 120) || "(empty)";
  }
}

// ─── mood options ─────────────────────────────────────────────────────────────

type ArtMood = "sanctuary" | "desert" | "water";

const MOODS: { id: ArtMood; label: string; description: string }[] = [
  { id: "sanctuary", label: "Sanctuary", description: "Deep obsidian — still and set apart" },
  { id: "desert", label: "Desert", description: "Warm earth tones — wilderness and waiting" },
  { id: "water", label: "Living Water", description: "Deep blue — stillness and movement" },
];

// ─── main component ───────────────────────────────────────────────────────────

interface PoemEditorProps {
  initialData?: PoemData | null;
  initialInspiration?: string;
  scriptureRef?: string | null;
  onChange: (data: PoemData, inspiration: string) => void;
}

const TEMPLATES: {
  id: PoemTemplate;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}[] = [
  {
    id: "heart_cry",
    label: "Heart Cry",
    icon: Heart,
    description: "Free form — write whatever surfaces",
  },
  {
    id: "psalm",
    label: "Psalm",
    icon: Sparkles,
    description: "Praise or lament, then an anchor verse",
  },
  { id: "proverb", label: "Proverb", icon: Feather, description: "One distilled line of wisdom" },
];

function emptyData(template: PoemTemplate): PoemData {
  if (template === "heart_cry") return { template, body: "" };
  if (template === "psalm") return { template, praise: "", anchor: "" };
  return { template, line: "" };
}

export function PoemEditor({
  initialData,
  initialInspiration = "",
  scriptureRef,
  onChange,
}: PoemEditorProps) {
  const [data, setData] = useState<PoemData>(initialData ?? { template: "heart_cry", body: "" });
  const [inspiration, setInspiration] = useState(initialInspiration);
  const [artOpen, setArtOpen] = useState(false);
  const [artMood, setArtMood] = useState<ArtMood>("sanctuary");
  const [seekOpen, setSeekOpen] = useState(false);

  const update = useCallback(
    (next: PoemData, insp = inspiration) => {
      setData(next);
      onChange(next, insp);
    },
    [onChange, inspiration],
  );

  const updateInspiration = (val: string) => {
    setInspiration(val);
    onChange(data, val);
  };

  const switchTemplate = (t: PoemTemplate) => update(emptyData(t));

  const isEmpty =
    data.template === "heart_cry"
      ? !data.body.trim()
      : data.template === "psalm"
        ? !data.praise.trim() && !data.anchor.trim()
        : !data.line.trim();

  // Effective reference to show on card / in PDF
  const effectiveRef = inspiration.trim() || scriptureRef || undefined;

  return (
    <div className="space-y-4">
      {/* ── Inspiration field ─────────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-gold/60 mb-1.5">
          <BookOpen className="h-3 w-3" />
          Inspiration
          <span className="normal-case text-muted-foreground/50 ml-1">— optional</span>
        </label>
        <input
          type="text"
          value={inspiration}
          onChange={(e) => updateInspiration(e.target.value)}
          placeholder="e.g. Psalm 22, John 19:28–30, Romans 8"
          className="w-full hairline rounded-md bg-obsidian-elevated/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 caret-gold"
          aria-label="e.g. Psalm 22, John 19:28–30, Romans 8"
        />
        {scriptureRef && !inspiration && (
          <button
            type="button"
            onClick={() => updateInspiration(scriptureRef)}
            className="mt-1 text-[10px] text-gold/50 hover:text-gold-soft transition-colors"
          >
            Use current verse ({scriptureRef})
          </button>
        )}
      </div>

      {/* ── Template selector ─────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const active = data.template === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTemplate(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs hairline transition-colors",
                active
                  ? "bg-gold/15 text-gold-soft border-gold/40"
                  : "text-muted-foreground hover:text-foreground bg-obsidian-elevated/40",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70 italic">
        {TEMPLATES.find((t) => t.id === data.template)?.description}
      </p>

      {/* ── Writing area ──────────────────────────────────────────────── */}
      {data.template === "heart_cry" && (
        <HeartCryFields
          value={data.body}
          onChange={(body) => update({ template: "heart_cry", body })}
        />
      )}
      {data.template === "psalm" && (
        <PsalmFields
          praise={data.praise}
          anchor={data.anchor}
          onChangePraise={(praise) => update({ template: "psalm", praise, anchor: data.anchor })}
          onChangeAnchor={(anchor) => update({ template: "psalm", praise: data.praise, anchor })}
          scriptureRef={scriptureRef}
        />
      )}
      {data.template === "proverb" && (
        <ProverbFields
          value={data.line}
          onChange={(line) => update({ template: "proverb", line })}
        />
      )}

      {/* ── Bottom tools — only when content exists ───────────────────── */}
      {!isEmpty && (
        <div className="space-y-0 border-t border-gold/12 pt-3">
          {/* Seek Wisdom row */}
          <div>
            <button
              type="button"
              onClick={() => setSeekOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors py-1"
            >
              <Search className="h-3.5 w-3.5" />
              {seekOpen ? "Hide Seek Wisdom" : "Seek Wisdom"}
            </button>
            {seekOpen && <PoemSeekWisdom data={data} inspiration={effectiveRef} />}
          </div>

          {/* Verse Art row */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setArtOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors py-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {artOpen ? "Hide verse art" : "Verse art"}
            </button>
            {artOpen && (
              <div className="mt-2 space-y-2">
                {/* Mood selector */}
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.description}
                      onClick={() => setArtMood(m.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] hairline transition-colors",
                        artMood === m.id
                          ? "bg-gold/15 text-gold-soft border-gold/40"
                          : "text-muted-foreground hover:text-foreground bg-obsidian-elevated/40",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <VerseArt data={data} reference={effectiveRef} mood={artMood} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── template fields ──────────────────────────────────────────────────────────

function HeartCryFields({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Let it pour out. No shape required."
      rows={10}
      className="w-full hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-5 text-foreground font-display italic text-base placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 caret-gold resize-y leading-relaxed"
      style={{ lineHeight: "1.75" }}
    />
  );
}

function PsalmFields({
  praise,
  anchor,
  onChangePraise,
  onChangeAnchor,
  scriptureRef,
}: {
  praise: string;
  anchor: string;
  onChangePraise: (v: string) => void;
  onChangeAnchor: (v: string) => void;
  scriptureRef?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.24em] text-gold/60 mb-1.5">
          Praise or Lament
        </label>
        <textarea
          value={praise}
          onChange={(e) => onChangePraise(e.target.value)}
          placeholder="What rises in you before the Lord?"
          rows={6}
          className="w-full hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-4 text-foreground font-display italic text-base placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 caret-gold resize-y leading-relaxed"
          style={{ lineHeight: "1.75" }}
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.24em] text-gold/60 mb-1.5">
          Anchor Verse
          {scriptureRef && (
            <button
              type="button"
              onClick={() => onChangeAnchor(scriptureRef)}
              className="ml-2 normal-case text-gold/50 hover:text-gold-soft transition-colors"
            >
              (use {scriptureRef})
            </button>
          )}
        </label>
        <textarea
          value={anchor}
          onChange={(e) => onChangeAnchor(e.target.value)}
          placeholder="A verse that holds you"
          rows={3}
          className="w-full hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-4 text-foreground font-display text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 caret-gold resize-y leading-relaxed"
          style={{ lineHeight: "1.65" }}
        />
      </div>
    </div>
  );
}

function ProverbFields({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="One line. The truest thing you know right now."
        rows={3}
        className="w-full hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-5 text-foreground font-display italic text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 caret-gold resize-none leading-relaxed text-center"
        style={{ lineHeight: "1.75" }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      />
      <p className="mt-1 text-center text-[10px] text-muted-foreground/50 italic">
        A proverb lives in a single breath
      </p>
    </div>
  );
}

// ─── Seek Wisdom (Deep Dive adapted for poem context) ────────────────────────

function PoemSeekWisdom({ data, inspiration }: { data: PoemData; inspiration?: string }) {
  const [question, setQuestion] = useState("");
  const deepDiveHistory = useDeepDiveHistory();

  // Build a poem-aware prompt: leads with the poem, then the user's question
  const buildPrompt = (q: string): string => {
    const parts: string[] = [];

    const templateLabel =
      data.template === "heart_cry"
        ? "reflection"
        : data.template === "psalm"
          ? "psalm"
          : "proverb";

    parts.push(`I wrote this ${templateLabel}:`);

    if (data.template === "heart_cry" && data.body.trim()) {
      parts.push(`"${data.body.trim()}"`);
    } else if (data.template === "psalm") {
      if (data.praise.trim()) parts.push(`"${data.praise.trim()}"`);
      if (data.anchor.trim()) parts.push(`Anchor verse: "${data.anchor.trim()}"`);
    } else if (data.template === "proverb" && data.line.trim()) {
      parts.push(`"${data.line.trim()}"`);
    }

    if (inspiration) parts.push(`Inspired by: ${inspiration}.`);
    parts.push(`My question: ${q}`);
    return parts.join(" ");
  };

  const open = (provider: "ChatGPT" | "Perplexity") => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const prompt = buildPrompt(trimmed);
    const link = buildDeepDiveLink(provider, prompt);

    void deepDiveHistory.log({
      book: "",
      chapter: 0,
      verse_start: null,
      verse_end: null,
      reference_label: inspiration ?? "poem",
      provider: `${provider} (poem)`,
      prompt,
      url: link.href,
    });

    void openDeepDiveLink(link, { reference: inspiration ?? "poem" });
  };

  return (
    <div className="mt-2 rounded-md border border-gold/14 bg-background/20 p-3 space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Ask a question — your poem will be sent as context.
      </p>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. What scripture themes does this echo? How could I go deeper on this?"
        rows={2}
        maxLength={500}
        className="w-full resize-none rounded-md border border-gold/18 bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
      />
      <div className="flex justify-center gap-2">
        {(["ChatGPT", "Perplexity"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => open(p)}
            disabled={!question.trim()}
            className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-md border border-gold/18 bg-background/24 px-4 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {p === "ChatGPT" ? "Ask ChatGPT" : "Ask Perplexity"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Verse Art (canvas, 3 moods) ─────────────────────────────────────────────

type MoodConfig = {
  bg: string;
  noise: [number, number, number]; // rgb for noise dots
  textColor: string;
  secondaryColor: string;
  borderColor: string;
  barColor: string;
  refColor: string;
  markColor: string;
};

const MOOD_CONFIGS: Record<ArtMood, MoodConfig> = {
  sanctuary: {
    bg: "#0a0a0a",
    noise: [201, 168, 76],
    textColor: "#f0e9d8",
    secondaryColor: "rgba(201,168,76,0.65)",
    borderColor: "rgba(201,168,76,0.25)",
    barColor: "rgba(201,168,76,",
    refColor: "rgba(201,168,76,0.45)",
    markColor: "rgba(201,168,76,0.25)",
  },
  desert: {
    bg: "#1a1208",
    noise: [210, 160, 80],
    textColor: "#f5e6c8",
    secondaryColor: "rgba(190,140,60,0.70)",
    borderColor: "rgba(190,140,60,0.30)",
    barColor: "rgba(190,140,60,",
    refColor: "rgba(190,140,60,0.50)",
    markColor: "rgba(190,140,60,0.28)",
  },
  water: {
    bg: "#060d14",
    noise: [80, 140, 200],
    textColor: "#daeaf5",
    secondaryColor: "rgba(100,170,220,0.65)",
    borderColor: "rgba(100,170,220,0.22)",
    barColor: "rgba(100,170,220,",
    refColor: "rgba(100,170,220,0.45)",
    markColor: "rgba(100,170,220,0.22)",
  },
};

function VerseArt({
  data,
  reference,
  mood,
}: {
  data: PoemData;
  reference?: string;
  mood: ArtMood;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [sharing, setSharing] = useState(false);
  const prevMoodRef = useRef<ArtMood | null>(null);

  const renderArt = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 900;
    const H = 900; // square — better for social
    canvas.width = W;
    canvas.height = H;
    const cfg = MOOD_CONFIGS[mood];

    // Background
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, W, H);

    // Noise texture
    ctx.save();
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const a = Math.random() * 0.035;
      const [r, g, b] = cfg.noise;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();

    // Radial vignette — corners darker
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Outer border
    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.strokeStyle = cfg.borderColor
      .replace("0.25", "0.10")
      .replace("0.22", "0.08")
      .replace("0.30", "0.12");
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // Left bar gradient
    const barGrad = ctx.createLinearGradient(28, H / 2 - 80, 28, H / 2 + 80);
    barGrad.addColorStop(0, `${cfg.barColor}0)`);
    barGrad.addColorStop(0.5, `${cfg.barColor}0.55)`);
    barGrad.addColorStop(1, `${cfg.barColor}0)`);
    ctx.fillStyle = barGrad;
    ctx.fillRect(28, H / 2 - 80, 2, 160);

    // ── text ────────────────────────────────────────────────────────────────

    const PADDING = 90;
    const MAX_W = W - PADDING * 2;

    const wrapText = (text: string, maxW: number, font: string): string[] => {
      ctx.font = font;
      // Preserve intentional line breaks
      return text.split("\n").flatMap((para) => {
        if (!para.trim()) return [""];
        const words = para.split(/\s+/);
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        return lines;
      });
    };

    let poemLines: string[] = [];
    let secondaryLines: string[] = [];

    const primarySize = data.template === "proverb" ? 34 : data.template === "psalm" ? 27 : 28;

    if (data.template === "heart_cry") {
      poemLines = wrapText(
        data.body.trim(),
        MAX_W,
        `italic ${primarySize}px 'Cormorant Garamond', Georgia, serif`,
      );
    } else if (data.template === "psalm") {
      poemLines = wrapText(
        data.praise.trim(),
        MAX_W,
        `italic ${primarySize}px 'Cormorant Garamond', Georgia, serif`,
      );
      if (data.anchor.trim()) {
        secondaryLines = wrapText(
          data.anchor.trim(),
          MAX_W - 60,
          `18px 'Cormorant Garamond', Georgia, serif`,
        );
      }
    } else if (data.template === "proverb") {
      poemLines = wrapText(
        data.line.trim(),
        MAX_W - 80,
        `italic ${primarySize}px 'Cormorant Garamond', Georgia, serif`,
      );
    }

    const primaryLineH = primarySize * 1.75;
    const secondaryLineH = 18 * 1.65;
    const totalH =
      poemLines.length * primaryLineH +
      (secondaryLines.length > 0 ? 32 + secondaryLines.length * secondaryLineH : 0);
    let y = (H - totalH) / 2;

    ctx.textAlign = "center";
    ctx.fillStyle = cfg.textColor;

    for (const line of poemLines) {
      ctx.font = `italic ${primarySize}px 'Cormorant Garamond', Georgia, serif`;
      if (line.trim()) ctx.fillText(line, W / 2, y + primarySize);
      y += primaryLineH;
    }

    if (secondaryLines.length > 0) {
      y += 16;
      // Short rule separator
      ctx.strokeStyle = cfg.borderColor;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 60, y);
      ctx.lineTo(W / 2 + 60, y);
      ctx.stroke();
      y += 22;
      ctx.fillStyle = cfg.secondaryColor;
      for (const line of secondaryLines) {
        ctx.font = `18px 'Cormorant Garamond', Georgia, serif`;
        if (line.trim()) ctx.fillText(line, W / 2, y + 18);
        y += secondaryLineH;
      }
    }

    // Reference — bottom right
    if (reference) {
      ctx.font = `13px 'Cormorant Garamond', Georgia, serif`;
      ctx.fillStyle = cfg.refColor;
      ctx.textAlign = "right";
      ctx.fillText(reference, W - 46, H - 42);
    }

    // SanctumIQ mark — bottom left
    ctx.font = `10px 'Inter', sans-serif`;
    ctx.fillStyle = cfg.markColor;
    ctx.textAlign = "left";
    ctx.fillText("SANCTUMIQ", 46, H - 42);

    prevMoodRef.current = mood;
    setRendered(true);
  }, [data, reference, mood]);

  // Render on mount + re-render when mood changes
  const [hasInit, setHasInit] = useState(false);
  if (!hasInit) {
    setHasInit(true);
    setTimeout(renderArt, 0);
  }
  if (prevMoodRef.current !== null && prevMoodRef.current !== mood) {
    prevMoodRef.current = mood;
    setTimeout(renderArt, 0);
  }

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanctumiq-verse-art-${Date.now()}.png`;
    a.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSharing(false);
          return;
        }
        const file = new File([blob], "verse-art.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: reference ?? "Verse Art — SanctumIQ" });
        } else {
          handleDownload();
        }
        setSharing(false);
      }, "image/png");
    } catch {
      handleDownload();
      setSharing(false);
    }
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-gold/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{ aspectRatio: "1/1" }}
      />
      {rendered && (
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Save image
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PDF Poem Scroll export ───────────────────────────────────────────────────

/** True for iPhone/iPad/iPod, including iPadOS 13+ which reports as Mac. */
function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ masquerades as Mac — distinguish by touch support.
  return ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document;
}

/** Coarse mobile check (touch + small viewport). Used to drive the share-first UX. */
function detectMobile(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPad|iPhone|iPod|Mobile/i.test(ua)) return true;
  return ua.includes("Mac") && "ontouchend" in document && window.innerWidth < 820;
}

const QUALITY_PRESETS: { id: PdfQuality; label: string; hint: string }[] = [
  { id: "standard", label: "Standard", hint: "Smallest file — best for email & messages" },
  { id: "high", label: "High", hint: "Crisper text — good for screen reading" },
  { id: "print", label: "Print", hint: "Uncompressed — pro print shops" },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function PoemScrollExport({ data, inspiration }: { data: PoemData; inspiration?: string }) {
  const [sharing, setSharing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [byteSize, setByteSize] = useState(0);
  const [verseLinks, setVerseLinks] = useState<VerseLinkRecord[]>([]);
  const [quality, setQuality] = useState<PdfQuality>("standard");
  const [zoom, setZoom] = useState(100);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isIOS = useRef(detectIOS()).current;
  const isMobile = useRef(detectMobile()).current;

  // Cached so we can show "5 verse links · 2 pages" before the user opens the modal.
  const quickMeta = useMemo(() => {
    try {
      const meta = buildPoemPDFBlobWithMeta(data, inspiration, { quality: "standard" });
      // Don't leak the blob — we only want the metadata for the chip.
      return { pageCount: meta.pageCount, verseCount: meta.verseLinks.length };
    } catch {
      return { pageCount: 0, verseCount: 0 };
    }
  }, [data, inspiration]);

  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const ZOOM_STEP = 25;

  const handleDownload = useCallback(() => {
    downloadPoemPDF(data, inspiration, { quality });
  }, [data, inspiration, quality]);

  /** Builds a fresh blob URL with the chosen zoom hint baked in. */
  const buildPreviewUrl = useCallback(
    (z: number, q: PdfQuality) => {
      const meta = buildPoemPDFBlobWithMeta(data, inspiration, { quality: q });
      const raw = URL.createObjectURL(meta.blob);
      // PDF Open Parameters — Chrome/Edge/Firefox honor these; Safari ignores them.
      const url = `${raw}#toolbar=0&navpanes=0&view=FitH&zoom=${z}`;
      return { url, meta };
    },
    [data, inspiration],
  );

  const openPreview = () => {
    const { url, meta } = buildPreviewUrl(zoom, quality);
    setPageCount(meta.pageCount);
    setByteSize(meta.byteSize);
    setVerseLinks(meta.verseLinks);
    setIframeReady(false);
    setPreviewUrl(url);
  };

  const closePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current.split("#")[0]);
      return null;
    });
    setZoom(100);
    setIframeReady(false);
  }, []);

  const applyZoom = (next: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    setZoom(clamped);
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl.split("#")[0]);
    const { url, meta } = buildPreviewUrl(clamped, quality);
    setPageCount(meta.pageCount);
    setByteSize(meta.byteSize);
    setVerseLinks(meta.verseLinks);
    setIframeReady(false);
    setPreviewUrl(url);
  };

  const applyQuality = (q: PdfQuality) => {
    if (q === quality) return;
    setQuality(q);
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl.split("#")[0]);
    const { url, meta } = buildPreviewUrl(zoom, q);
    setPageCount(meta.pageCount);
    setByteSize(meta.byteSize);
    setVerseLinks(meta.verseLinks);
    setIframeReady(false);
    setPreviewUrl(url);
  };

  const handlePrint = () => {
    const frame = iframeRef.current;
    try {
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      if (previewUrl) window.open(previewUrl, "_blank", "noopener");
    }
  };

  /** iOS-only: open the same blob in Safari's native PDF viewer. */
  const openInNewTab = () => {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener");
  };

  // Cleanup blob URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl.split("#")[0]);
    };
  }, [previewUrl]);

  // Keyboard: Esc closes, ⌘/Ctrl + =/− zooms.
  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        applyZoom(zoom + ZOOM_STEP);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        applyZoom(zoom - ZOOM_STEP);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, zoom]);

  /**
   * Mobile-first share. Tries Web Share API with the PDF file payload, then
   * falls back to text+url-only share, then to a plain download.
   */
  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = buildPoemPDFBlob(data, inspiration, { quality });
      const file = new File([blob], `${poemSlug(data)}.pdf`, { type: "application/pdf" });
      const title = "Poem Scroll — SanctumIQ";
      const text = poemPreviewText(data);

      // Tier 1 — full share with file (mobile Safari, modern Chrome/Edge).
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return;
      }
      // Tier 2 — text + title only (older mobile browsers).
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text });
        toast("Shared link — file kept local. Tap Save PDF to download it.", {
          duration: 3500,
          position: "top-center",
        });
        return;
      }
      // Tier 3 — desktop / unsupported. Fall back to download.
      handleDownload();
      toast("Sharing isn't supported on this device — saved the PDF instead.", {
        duration: 3500,
        position: "top-center",
      });
    } catch (err) {
      // User cancel throws AbortError — ignore quietly.
      if ((err as DOMException)?.name !== "AbortError") {
        handleDownload();
      }
    } finally {
      setSharing(false);
    }
  };

  // Whether mobile-share is even possible.
  const canMobileShare =
    isMobile && typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <FileText className="h-3.5 w-3.5" />
          Poem Scroll
        </span>
        {quickMeta.verseCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[10px] tracking-[0.14em] text-gold-soft/80"
            title={`${quickMeta.verseCount} clickable verse link${quickMeta.verseCount === 1 ? "" : "s"} embedded`}
          >
            <Link2 className="h-3 w-3" />
            {quickMeta.verseCount} link{quickMeta.verseCount === 1 ? "" : "s"}
          </span>
        )}
        <button
          type="button"
          onClick={openPreview}
          className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors disabled:opacity-50"
        >
          <Share2 className="h-3.5 w-3.5" />
          {canMobileShare ? "Share" : "Share PDF"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Save PDF
        </button>
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-2 sm:p-4 backdrop-blur-md animate-fade-in"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Poem Scroll preview"
        >
          <div
            className="relative flex h-full max-h-[96vh] sm:max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gold/25 bg-obsidian shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/15 px-3 sm:px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.22em] text-gold/70">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Poem Scroll preview</span>
                  <span className="sm:hidden">Preview</span>
                </span>
                {pageCount > 0 && (
                  <span
                    className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[9px] sm:text-[10px] tracking-[0.16em] text-gold-soft"
                    aria-label={`${pageCount} ${pageCount === 1 ? "page" : "pages"}, letter, ${formatBytes(byteSize)}`}
                  >
                    {pageCount} {pageCount === 1 ? "pg" : "pgs"} · {formatBytes(byteSize)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Quality selector — drives compression + precision in jsPDF. */}
                <div
                  role="radiogroup"
                  aria-label="PDF quality"
                  className="inline-flex items-center gap-0.5 rounded-full border border-gold/20 bg-background/30 p-0.5"
                >
                  {QUALITY_PRESETS.map((p) => {
                    const active = quality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => applyQuality(p.id)}
                        title={p.hint}
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] tracking-[0.12em] uppercase transition-colors",
                          active
                            ? "bg-gold/20 text-gold-soft"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Zoom — desktop & Android only. iOS PDF viewer handles pinch-zoom natively. */}
                {!isIOS && (
                  <div className="hidden sm:inline-flex items-center gap-1 rounded-full border border-gold/20 bg-background/30 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => applyZoom(zoom - ZOOM_STEP)}
                      disabled={zoom <= ZOOM_MIN}
                      aria-label="Zoom out"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyZoom(100)}
                      aria-label="Reset zoom"
                      className="min-w-[3rem] rounded-full px-2 text-center text-[10px] tracking-wider text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      {zoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyZoom(zoom + ZOOM_STEP)}
                      disabled={zoom >= ZOOM_MAX}
                      aria-label="Zoom in"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Mobile share — promoted into the header on touch devices. */}
                {canMobileShare && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/15 px-3 py-1.5 text-xs text-gold-soft transition-colors hover:bg-gold/25 disabled:opacity-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                )}

                {!isIOS && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-xs text-gold-soft transition-colors hover:bg-gold/10"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-xs text-gold-soft transition-colors hover:bg-gold/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Close preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Verse link map — shown when the inspiration field has scripture refs. */}
            {verseLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-gold/10 bg-obsidian-elevated/30 px-3 py-2 text-[10px] sm:text-[11px]">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Link2 className="h-3 w-3 text-gold/60" />
                  Verse links
                </span>
                {verseLinks.map((vl, i) => (
                  <a
                    key={`${vl.url}-${i}`}
                    href={vl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-gold-soft hover:bg-gold/15 transition-colors"
                    title={`Open ${vl.label} in the reader`}
                  >
                    {vl.label}
                    <span className="text-[9px] tracking-[0.14em] text-muted-foreground/80 uppercase">
                      p.{vl.page}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {/* Body — iOS gets a tailored full-screen card; everything else gets the iframe. */}
            <div className="relative flex-1 bg-[#1a1a1a]">
              {isIOS ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="rounded-2xl border border-gold/25 bg-obsidian-elevated/40 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                    <FileText className="mx-auto h-10 w-10 text-gold/70" />
                    <p className="mt-3 text-sm text-foreground">Your Poem Scroll is ready.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pageCount} {pageCount === 1 ? "page" : "pages"} · Letter ·{" "}
                      {formatBytes(byteSize)}
                    </p>
                    <p className="mt-3 text-[11px] text-muted-foreground/70 leading-relaxed">
                      iOS doesn't render PDFs inline. Tap Share to send it via Messages, Mail, or
                      AirDrop — or open it in Safari to read and pinch-zoom.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={sharing}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/15 px-4 py-2 text-xs text-gold-soft transition-colors hover:bg-gold/25 disabled:opacity-50"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={openInNewTab}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-4 py-2 text-xs text-gold-soft transition-colors hover:bg-gold/10"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open in Safari
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-4 py-2 text-xs text-gold-soft transition-colors hover:bg-gold/10"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!iframeReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/70">
                      Rendering preview…
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Poem Scroll preview"
                    onLoad={() => setIframeReady(true)}
                    className={cn(
                      "h-full w-full border-0 transition-opacity duration-300",
                      iframeReady ? "opacity-100" : "opacity-0",
                    )}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function poemSlug(data: PoemData): string {
  if (data.template === "heart_cry") return "SanctumIQ — Heart Cry";
  if (data.template === "psalm") return "SanctumIQ — Psalm";
  return "SanctumIQ — Proverb";
}
