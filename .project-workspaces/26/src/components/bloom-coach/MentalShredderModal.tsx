import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FolderInput, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

interface MentalShredderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShredResult {
  reframe: string;
  smallest_action: string;
  original: string;
}

const SUGGESTIONS = [
  "I'll never afford a house.",
  "What if I lose my job tomorrow?",
  "I'm bad with money.",
  "I'll never catch up on my debt.",
];

export function MentalShredderModal({ open, onOpenChange }: MentalShredderModalProps) {
  const { user } = useAuth();
  const [thought, setThought] = useState("");
  const [phase, setPhase] = useState<"input" | "shredding" | "result">("input");
  const [result, setResult] = useState<ShredResult | null>(null);
  const [isFiling, setIsFiling] = useState(false);

  const reset = () => {
    setThought("");
    setResult(null);
    setPhase("input");
    setIsFiling(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const handleShred = async () => {
    const text = thought.trim();
    if (text.length < 3) {
      toast.error("Type a thought to shred (at least a few words).");
      return;
    }

    setPhase("shredding");
    trackEvent("shredder_submitted", { length: text.length });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in.");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mental-shredder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ thought: text }),
        },
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Shredder failed");
      }

      const data: ShredResult = await resp.json();
      // Hold the shred animation for a beat so it lands cinematically
      await new Promise((r) => setTimeout(r, 900));
      setResult(data);
      setPhase("result");
    } catch (e: any) {
      console.error("shred error:", e);
      toast.error(e?.message || "Couldn't shred that thought. Try again.");
      setPhase("input");
    }
  };

  const handleFile = async () => {
    if (!result || !user) return;
    setIsFiling(true);
    try {
      const { error } = await supabase.from("quinn_blueprint_cards").insert({
        user_id: user.id,
        card_type: "insight",
        title: result.original.length > 80 ? result.original.slice(0, 77) + "…" : result.original,
        callout: result.reframe,
        sections: [
          {
            heading: "Smallest next action",
            body: result.smallest_action,
          },
        ],
        mode_lens: "shredder",
      });
      if (error) throw error;
      trackEvent("shredder_filed");
      toast.success("Filed to your Vault.");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error("file error:", e);
      toast.error("Couldn't file to Vault. " + (e?.message || ""));
      setIsFiling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="quinn-obsidian quinn-shell p-0 max-w-lg border-[hsl(var(--quinn-glass-border))] bg-transparent overflow-hidden"
      >
        <div className="quinn-ambient" />
        <div className="relative z-10 flex flex-col">
          {/* Header — DialogContent provides its own close button; do not add a second X here */}
          <div className="quinn-glass-strong px-5 py-4 pr-12 border-b border-[hsl(var(--quinn-glass-border))] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-grad flex items-center justify-center ring-1 ring-[hsl(var(--quinn-champagne)/0.55)] shadow-[0_0_14px_hsl(var(--quinn-champagne)/0.25)]">
                <Sparkles className="h-4 w-4 text-[hsl(160,30%,8%)]" strokeWidth={2.5} />
              </div>
              <div className="leading-tight">
                <h2 className="text-[15px] font-semibold text-foreground tracking-tight">Mental Shredder</h2>
                <p className="text-[11px] text-champagne/80 tracking-wide">Zero-trace · Architect mode</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5 min-h-[320px]">
            <AnimatePresence mode="wait">
              {phase === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <p className="text-[13px] text-foreground/75 leading-relaxed">
                    Drop the anxious thought. Bloom will turn it into structure — not comfort.
                  </p>
                  <Textarea
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    placeholder="e.g. I'll never afford a house…"
                    maxLength={1000}
                    rows={4}
                    className="bg-white/[0.03] border-[hsl(var(--quinn-glass-border))] text-foreground placeholder:text-foreground/40 focus-visible:ring-[hsl(var(--quinn-emerald)/0.5)] resize-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setThought(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-[hsl(var(--quinn-glass-border))] text-foreground/70 hover:text-champagne hover:bg-white/[0.07] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleShred}
                    disabled={thought.trim().length < 3}
                    className="w-full bg-emerald-grad text-[hsl(160,30%,8%)] hover:opacity-90 font-semibold tracking-wide"
                  >
                    Shred it
                  </Button>
                </motion.div>
              )}

              {phase === "shredding" && (
                <motion.div
                  key="shredding"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[280px] gap-6"
                >
                  <div className="relative w-full max-w-sm">
                    <div className="text-center text-[14px] text-foreground/85 italic mb-4 px-3">
                      "{thought}"
                    </div>
                    <div className="flex gap-[2px] h-12 overflow-hidden">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 0, opacity: 1 }}
                          animate={{ y: 80, opacity: 0 }}
                          transition={{
                            duration: 0.7,
                            delay: i * 0.025,
                            ease: "easeIn",
                          }}
                          className="flex-1 bg-gradient-to-b from-[hsl(var(--quinn-emerald))] to-[hsl(var(--quinn-emerald)/0.3)] rounded-sm"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-champagne/80">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Restructuring…
                  </div>
                </motion.div>
              )}

              {phase === "result" && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border border-[hsl(var(--quinn-emerald)/0.35)] bg-white/[0.03] p-4 space-y-3 shadow-[0_0_24px_hsl(var(--quinn-emerald)/0.12)]">
                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-champagne/80 uppercase mb-1.5">
                        Architect Reframe
                      </div>
                      <p className="text-[14px] text-foreground leading-relaxed">{result.reframe}</p>
                    </div>
                    <div className="h-px bg-[hsl(var(--quinn-glass-border))]" />
                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-champagne/80 uppercase mb-1.5">
                        Smallest Next Action
                      </div>
                      <p className="text-[14px] text-foreground leading-relaxed">{result.smallest_action}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={reset}
                      className="flex-1 text-foreground/70 hover:text-champagne hover:bg-white/5 gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Shred another
                    </Button>
                    <Button
                      onClick={handleFile}
                      disabled={isFiling}
                      className="flex-1 bg-emerald-grad text-[hsl(160,30%,8%)] hover:opacity-90 font-semibold gap-1.5"
                    >
                      {isFiling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FolderInput className="h-3.5 w-3.5" />
                      )}
                      File to Vault
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
