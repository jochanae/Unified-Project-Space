/**
 * AltarModal — Zero-trace burden release within the Sanctuary.
 *
 * The user lays a heavy thought down. Selah returns a "truth to hold"
 * and a "small movement." On release, the text dissolves into gold
 * particles. Nothing is stored unless the user explicitly chooses
 * "Keep in Sanctuary" — which saves the truth/movement to their notes.
 *
 * Aesthetic: obsidian + brushed gold, font-display blockquote,
 * hairline borders. Matches Sanctuary tokens — never raw hex.
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Loader2, RotateCcw, BookmarkPlus, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AltarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AltarResult {
  truth: string;
  movement: string;
  burden: string;
}

type Phase = "input" | "listening" | "result" | "releasing" | "released";

const SUGGESTIONS = [
  "I'm afraid I'm not enough.",
  "I can't stop replaying what they said.",
  "I'm carrying something I haven't told anyone.",
];

export function AltarModal({ open, onOpenChange }: AltarModalProps) {
  const { user } = useAuth();
  const [burden, setBurden] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<AltarResult | null>(null);
  const [keeping, setKeeping] = useState(false);
  const [kept, setKept] = useState(false);

  const reset = () => {
    setBurden("");
    setResult(null);
    setPhase("input");
    setKeeping(false);
    setKept(false);
  };

  // Reset whenever the modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(reset, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleLay = async () => {
    const text = burden.trim();
    if (text.length < 3) return;
    setPhase("listening");
    try {
      const { data, error } = await supabase.functions.invoke("altar", {
        body: { burden: text },
      });
      if (error || !data?.truth) {
        console.error("Altar error:", error);
        setPhase("input");
        return;
      }
      setResult({ truth: data.truth, movement: data.movement, burden: text });
      setPhase("result");
    } catch (err) {
      console.error("Altar invoke error:", err);
      setPhase("input");
    }
  };

  const handleRelease = () => {
    setPhase("releasing");
    // Hold the dissolve animation for ~1.6s, then close.
    setTimeout(() => {
      setPhase("released");
      setTimeout(() => onOpenChange(false), 700);
    }, 1600);
  };

  const handleKeep = async () => {
    if (!result || !user || keeping) return;
    setKeeping(true);
    try {
      const body = `Truth to hold:\n${result.truth}\n\nSmall movement:\n${result.movement}`;
      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        body_text: body,
        note_type: "altar",
      });
      if (error) {
        console.error("Keep in Sanctuary failed:", error);
        setKeeping(false);
        return;
      }
      setKept(true);
      setTimeout(() => onOpenChange(false), 900);
    } catch (err) {
      console.error("Keep in Sanctuary error:", err);
      setKeeping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] top-[52%] border-gold/25 bg-[rgba(13,13,13,0.96)] p-0 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden">
        {/* Ambient gold bloom */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold/8 blur-[80px]" />
          <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-gold/5 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col">
          {/* Header — silent, no label */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gold/15">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-obsidian shadow-[0_0_18px_rgba(201,168,76,0.3)]">
              <Lock className="h-4 w-4 text-gold" strokeWidth={1.5} />
            </span>
            <div className="leading-tight">
              <h2 className="font-display text-base text-foreground">The Altar</h2>
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold/65">
                Zero-trace · lay it down
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5 min-h-[300px]">
            {phase === "input" && (
              <div className="space-y-4">
                <p className="font-display italic text-[15px] leading-relaxed text-foreground/85">
                  What are you carrying? Set it down here. It won't be saved unless you choose to
                  keep it.
                </p>
                <textarea
                  value={burden}
                  onChange={(e) => setBurden(e.target.value)}
                  placeholder="Lay it down…"
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-lg border border-gold/20 bg-obsidian/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold/40 transition-colors resize-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBurden(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-gold/15 bg-obsidian/40 text-muted-foreground hover:text-gold-soft hover:border-gold/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleLay}
                  disabled={burden.trim().length < 3}
                  className="w-full rounded-lg bg-gold/90 hover:bg-gold text-obsidian text-sm font-medium py-2.5 disabled:opacity-40 transition-colors"
                >
                  Lay it down
                </button>
              </div>
            )}

            {phase === "listening" && (
              <div className="flex flex-col items-center justify-center min-h-[260px] gap-5">
                <div className="font-display italic text-center text-foreground/75 px-4 leading-relaxed">
                  &ldquo;{burden}&rdquo;
                </div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gold/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sitting with it…
                </div>
              </div>
            )}

            {(phase === "result" || phase === "releasing" || phase === "released") && result && (
              <div className="space-y-4 relative">
                <div
                  className={`rounded-xl border border-gold/30 bg-obsidian/50 p-4 space-y-3 shadow-[0_0_24px_rgba(201,168,76,0.12)] transition-all duration-700 ${
                    phase === "releasing" || phase === "released"
                      ? "opacity-0 blur-md scale-95"
                      : "opacity-100"
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.22em] text-gold/70 uppercase mb-1.5">
                      Truth to hold
                    </div>
                    <p className="font-display italic text-[15px] leading-relaxed text-foreground/90">
                      {result.truth}
                    </p>
                  </div>
                  <div className="h-px bg-gold/15" />
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.22em] text-gold/70 uppercase mb-1.5 flex items-center gap-1.5">
                      <Wind className="h-3 w-3" strokeWidth={1.5} /> Small movement
                    </div>
                    <p className="text-[14px] leading-relaxed text-foreground/85">
                      {result.movement}
                    </p>
                  </div>
                </div>

                {/* Gold particle dissolve */}
                {(phase === "releasing" || phase === "released") && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const left = Math.random() * 100;
                      const delay = Math.random() * 0.4;
                      const size = 2 + Math.random() * 3;
                      const drift = (Math.random() - 0.5) * 60;
                      return (
                        <span
                          key={i}
                          style={{
                            left: `${left}%`,
                            width: `${size}px`,
                            height: `${size}px`,
                            animationDelay: `${delay}s`,
                            // CSS variable consumed by the keyframe
                            ["--drift" as string]: `${drift}px`,
                          }}
                          className="absolute bottom-0 rounded-full bg-gold-soft shadow-[0_0_8px_rgba(240,215,140,0.8)] animate-[altar-rise_1.6s_ease-out_forwards]"
                        />
                      );
                    })}
                  </div>
                )}

                {phase === "result" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          reset();
                        }}
                        className="flex-1 rounded-lg border border-gold/15 bg-obsidian/40 text-muted-foreground hover:text-foreground hover:border-gold/30 text-sm py-2 inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Lay another
                      </button>
                      {user && (
                        <button
                          onClick={handleKeep}
                          disabled={keeping || kept}
                          className="flex-1 rounded-lg border border-gold/30 bg-obsidian/40 text-gold-soft hover:bg-gold/8 text-sm py-2 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {keeping ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BookmarkPlus className="h-3.5 w-3.5" />
                          )}
                          {kept ? "Kept" : "Keep in Sanctuary"}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleRelease}
                      className="w-full rounded-lg bg-gold/90 hover:bg-gold text-obsidian text-sm font-medium py-2.5 transition-colors"
                    >
                      Release
                    </button>
                  </div>
                )}

                {phase === "releasing" && (
                  <p className="text-center text-[11px] uppercase tracking-[0.28em] text-gold/70 pt-2">
                    Released
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
