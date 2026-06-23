/**
 * CoAuthorConfigurator
 *
 * The Co-Author path of the Choice portal.
 * Three chip rows: Audience → Tone → Depth.
 * Scripture/theme input.
 * Architect's Preview summary — Selah whisper fires here (once, on demand).
 * Build Blueprint creates the sermon row and navigates to the editor.
 */

import { useCallback, useState } from "react";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSelah } from "@/hooks/useSelah";
import { cn } from "@/lib/utils";
import { ChoiceChip } from "@/components/workspace/ChoiceChip";

const AUDIENCE_OPTIONS = [
  { label: "General", sublabel: "All ages" },
  { label: "Leadership", sublabel: "Ministers" },
  { label: "Youth", sublabel: "Teen+" },
  { label: "Seekers", sublabel: "Exploring" },
  { label: "Families", sublabel: "All stages" },
] as const;

const TONE_OPTIONS = [
  { label: "Encouraging", sublabel: "Uplifting" },
  { label: "Challenging", sublabel: "Convicting" },
  { label: "Theological", sublabel: "Deep study" },
  { label: "Story-driven", sublabel: "Narrative" },
] as const;

const DEPTH_OPTIONS = [
  { label: "10 min", sublabel: "Devotional", value: "short" as const },
  { label: "30 min", sublabel: "Standard", value: "standard" as const },
  { label: "45 min", sublabel: "Deep dive", value: "long" as const },
] as const;

const TRADITION_OPTIONS = [
  { label: "Baptist", sublabel: "Expository" },
  { label: "Pentecostal", sublabel: "Spirit-led" },
  { label: "Non-denominational", sublabel: "Contemporary" },
  { label: "Reformed", sublabel: "Doctrinal" },
  { label: "AME", sublabel: "Prophetic" },
  { label: "Methodist", sublabel: "Wesleyan" },
  { label: "Anglican", sublabel: "Liturgical" },
  { label: "Evangelical", sublabel: "Gospel-driven" },
  { label: "Lutheran", sublabel: "Law & Gospel" },
  { label: "Catholic", sublabel: "Homiletic" },
] as const;

type Audience = (typeof AUDIENCE_OPTIONS)[number]["label"] | "";
type Tone = (typeof TONE_OPTIONS)[number]["label"] | "";
type Depth = "short" | "standard" | "long" | "";
type Tradition = (typeof TRADITION_OPTIONS)[number]["label"] | "";

interface Props {
  prefilledScripture?: string;
  prefilledScriptureText?: string;
  onComplete: (sermonId: string) => void;
  onCancel: () => void;
}

export function CoAuthorConfigurator({
  prefilledScripture = "",
  prefilledScriptureText = "",
  onComplete,
  onCancel,
}: Props) {
  const { user } = useAuth();
  const { reflect, reflection, status: selahStatus, reset: resetSelah } = useSelah();

  const [audience, setAudience] = useState<Audience>("");
  const [tone, setTone] = useState<Tone>("");
  const [depth, setDepth] = useState<Depth>("");
  const [tradition, setTradition] = useState<Tradition>("");
  const [scripture, setScripture] = useState(prefilledScripture);
  const [scriptureText] = useState(prefilledScriptureText);
  const [theme, setTheme] = useState("");
  const [building, setBuilding] = useState(false);

  const isReady = Boolean(audience && tone && depth && (scripture.trim() || theme.trim()));

  const handleSelahWhisper = useCallback(() => {
    if (selahStatus !== "idle") return;
    const context = [
      scripture.trim() && `Scripture: ${scripture.trim()}`,
      theme.trim() && `Theme: ${theme.trim()}`,
      audience && `Audience: ${audience}`,
      tone && `Tone: ${tone}`,
      tradition && `Tradition: ${tradition}`,
    ]
      .filter(Boolean)
      .join(". ");
    void reflect(context, scripture.trim() || theme.trim() || "Sermon preparation", "prepare");
  }, [selahStatus, scripture, theme, audience, tone, reflect]);

  const handleBuild = useCallback(async () => {
    if (!user || !isReady) return;
    setBuilding(true);
    const depthMap: Record<string, "short" | "standard" | "long"> = {
      short: "short",
      standard: "standard",
      long: "long",
    };
    try {
      const { data, error } = await supabase
        .from("sermons")
        .insert({
          user_id: user.id,
          title: scripture.trim()
            ? `Sermon — ${scripture.trim()}`
            : theme.trim()
              ? `Sermon — ${theme.trim()}`
              : "Untitled sermon",
          status: "draft",
          current_version: 1,
          audience: audience || null,
          tone: tone || null,
          length_target: depthMap[depth] ?? "standard",
          scripture_ref: scripture.trim() || null,
          scripture_text: scriptureText.trim() || null,
          theme: theme.trim() || null,
          tradition: tradition || null,
        })
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Could not create sermon. Please try again.");
        setBuilding(false);
        return;
      }
      onComplete(data.id);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setBuilding(false);
    }
  }, [user, isReady, audience, tone, depth, scripture, scriptureText, theme, onComplete]);

  return (
    <div className="space-y-8">
      {/* Audience */}
      <ChipSection label="Who are you speaking to?" step={1} complete={Boolean(audience)}>
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.label}
              label={opt.label}
              sublabel={opt.sublabel}
              selected={audience === opt.label}
              onSelect={() => setAudience(opt.label)}
            />
          ))}
        </div>
      </ChipSection>

      {/* Tone */}
      <ChipSection label="What is the tone of this message?" step={2} complete={Boolean(tone)}>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.label}
              label={opt.label}
              sublabel={opt.sublabel}
              selected={tone === opt.label}
              onSelect={() => setTone(opt.label)}
            />
          ))}
        </div>
      </ChipSection>

      {/* Depth */}
      <ChipSection label="How long is the message?" step={3} complete={Boolean(depth)}>
        <div className="flex flex-wrap gap-2">
          {DEPTH_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.value}
              label={opt.label}
              sublabel={opt.sublabel}
              selected={depth === opt.value}
              onSelect={() => setDepth(opt.value)}
            />
          ))}
        </div>
      </ChipSection>

      {/* Tradition */}
      <ChipSection label="What is your preaching tradition?" step={4} complete={Boolean(tradition)}>
        <div className="flex flex-wrap gap-2">
          {TRADITION_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.label}
              label={opt.label}
              sublabel={opt.sublabel}
              selected={tradition === opt.label}
              onSelect={() => setTradition((t) => (t === opt.label ? "" : opt.label))}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-2">
          Optional — skip if your tradition isn't listed or you prefer a general approach
        </p>
      </ChipSection>

      {/* Scripture / Theme */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.28em] text-gold/60">
            Scripture or theme
          </span>
          <span className="text-[10px] text-muted-foreground/40">(at least one required)</span>
        </div>
        <input
          type="text"
          value={scripture}
          onChange={(e) => setScripture(e.target.value)}
          placeholder="e.g. Romans 8:28 or The grace of Joseph"
          className="w-full rounded-xl border border-gold/18 bg-obsidian-elevated/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-gold/40 transition-colors"
          aria-label="e.g. Romans 8:28 or The grace of Joseph"
        />
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Additional theme or title (optional)"
          className="w-full rounded-xl border border-gold/18 bg-obsidian-elevated/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-gold/40 transition-colors"
          aria-label="Additional theme or title (optional)"
        />
      </div>

      {/* Architect's Preview */}
      {isReady && (
        <div
          className={cn(
            "rounded-2xl border border-gold/25 bg-obsidian-elevated/50 p-6 space-y-5",
            "shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(201,168,76,0.08)]",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">
              Architect&apos;s Preview
            </p>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SummaryPill label="Audience" value={audience} />
            <SummaryPill label="Tone" value={tone} />
            <SummaryPill
              label="Depth"
              value={DEPTH_OPTIONS.find((o) => o.value === depth)?.label ?? depth}
            />
          </div>
          {tradition && (
            <div className="rounded-xl border border-gold/15 bg-obsidian/40 px-4 py-2 flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/55">Tradition</p>
              <p className="font-display text-sm text-gold-soft">{tradition}</p>
            </div>
          )}

          {(scripture.trim() || theme.trim()) && (
            <div className="rounded-xl border border-gold/15 bg-obsidian/40 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/55 mb-1">
                {scripture.trim() ? "Scripture" : "Theme"}
              </p>
              <p className="font-display text-sm text-foreground/85">
                {scripture.trim() || theme.trim()}
              </p>
            </div>
          )}

          {/* Selah whisper */}
          <div className="space-y-3">
            {selahStatus === "idle" && (
              <button
                type="button"
                onClick={handleSelahWhisper}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gold/18 bg-gold/5 px-4 py-3 text-sm text-gold-soft/80 hover:bg-gold/10 hover:border-gold/30 transition-all"
              >
                <Sparkles className="h-4 w-4 text-gold/60" strokeWidth={1.5} />
                Ask Selah to reflect before you build
              </button>
            )}
            {selahStatus === "loading" && (
              <div className="flex items-center justify-center gap-2 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-gold/50"
                    style={{
                      animation: "pulse 1.4s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}
            {selahStatus === "done" && reflection && (
              <div className="rounded-xl border border-gold/15 bg-gold/5 px-4 py-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-gold/60" strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-gold/55">
                    Selah
                  </span>
                </div>
                <blockquote className="font-display italic text-sm text-foreground/85 leading-relaxed">
                  {reflection}
                </blockquote>
                <button
                  type="button"
                  onClick={() => resetSelah()}
                  className="text-[11px] text-muted-foreground/40 hover:text-gold-soft transition-colors"
                >
                  ↺ Ask again
                </button>
              </div>
            )}
          </div>

          {/* Build Blueprint */}
          <button
            type="button"
            onClick={handleBuild}
            disabled={building}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 rounded-xl py-4 text-sm font-medium transition-all duration-200",
              "bg-gold hover:bg-gold-soft text-obsidian",
              "shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:shadow-[0_4px_28px_rgba(201,168,76,0.45)]",
              building && "opacity-60 cursor-not-allowed",
            )}
          >
            {building ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {building ? "Opening the manuscript…" : "Build Blueprint"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-xs text-muted-foreground/40 hover:text-gold-soft transition-colors"
          >
            ← Back to choice
          </button>
        </div>
      )}

      {!isReady && (
        <p className="text-center text-[11px] text-muted-foreground/40 pb-2">
          Select audience, tone, depth, and a scripture or theme to unlock your preview
        </p>
      )}
    </div>
  );
}

function ChipSection({
  label,
  step,
  complete,
  children,
}: {
  label: string;
  step: number;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
            complete
              ? "bg-gold text-obsidian shadow-[0_0_10px_rgba(201,168,76,0.4)]"
              : "border border-gold/25 text-muted-foreground/50",
          )}
        >
          {complete ? "✓" : step}
        </span>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">{label}</p>
      </div>
      {children}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-gold/8 px-3 py-2.5 text-center">
      <p className="text-[9px] uppercase tracking-[0.2em] text-gold/55 mb-0.5">{label}</p>
      <p className="font-display text-sm text-gold-soft leading-tight">{value}</p>
    </div>
  );
}
