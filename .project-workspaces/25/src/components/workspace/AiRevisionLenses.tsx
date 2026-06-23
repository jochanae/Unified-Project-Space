import { useState } from "react";
import { ScanText, Lightbulb, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export type Lens = "tighten" | "clarify" | "strengthen" | "illustrate";

const LENSES: Array<{
  id: Lens;
  label: string;
  hint: string;
  icon: typeof ScanText;
  instruction: string;
}> = [
  {
    id: "tighten",
    label: "Tighten",
    hint: "Cut filler. Keep voice.",
    icon: ScanText,
    instruction:
      "Tighten this sermon manuscript. Cut redundant phrases, shorten meandering paragraphs, and remove filler — but preserve the preacher's voice, every scripture reference, every illustration, and the overall structure. Aim for ~15% shorter.",
  },
  {
    id: "clarify",
    label: "Clarify",
    hint: "Plainer language.",
    icon: Lightbulb,
    instruction:
      "Clarify this sermon manuscript. Replace abstract or churchy language with concrete, plain-spoken phrasing. Keep the theology intact. Keep all scripture references and illustrations. Do not shorten substantively — only swap words and reshape sentences for clarity.",
  },
  {
    id: "strengthen",
    label: "Strengthen Theology",
    hint: "Anchor in scripture.",
    icon: ShieldCheck,
    instruction:
      "Strengthen the theological grounding of this sermon. Where claims are loose, anchor them to the scripture text already cited. Where the doctrine is thin, deepen it without importing outside theology. Do not change the structure or voice. Do not add denominational jargon.",
  },
  {
    id: "illustrate",
    label: "Add Illustrations",
    hint: "Concrete stories.",
    icon: Sparkles,
    instruction:
      "Add one concrete, human illustration to each main point that currently lacks one. Keep illustrations short (2-4 sentences), culturally neutral, and aligned with the point they serve. Do not change the existing text — only add illustrations where helpful.",
  },
];

interface Props {
  manuscript: string;
  /** Called BEFORE applying — caller should snapshot the current text. */
  onBeforeApply: () => Promise<void> | void;
  /** Called with the new manuscript when AI returns. */
  onApply: (next: string, lensLabel: string) => void;
  disabled?: boolean;
}

export function AiRevisionLenses({ manuscript, onBeforeApply, onApply, disabled }: Props) {
  const [busy, setBusy] = useState<Lens | null>(null);

  const run = async (lens: (typeof LENSES)[number]) => {
    if (!manuscript.trim()) {
      toast.error("Write or generate a manuscript first.");
      return;
    }
    setBusy(lens.id);
    try {
      await onBeforeApply();
      const { data, error } = await supabase.functions.invoke("sermon-composer", {
        body: { action: "revise", manuscript, instruction: lens.instruction },
      });
      if (error || !data?.manuscript) {
        toast.error(data?.error ?? "Revision failed. Please try again.");
        return;
      }
      onApply(data.manuscript as string, lens.label);
      toast.success(`${lens.label} applied. Previous version saved.`);
    } catch (err) {
      console.error("AI lens revision error:", err);
      toast.error("Connection error. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-gold/15 bg-obsidian-elevated/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Wand2 className="h-3.5 w-3.5 text-gold/80" />
        <h3 className="text-[10px] uppercase tracking-[0.28em] text-gold/80">AI revision</h3>
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          Pick a lens — your current text is auto-saved as a version first.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LENSES.map((lens) => {
          const Icon = lens.icon;
          const isBusy = busy === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              disabled={Boolean(busy) || disabled}
              onClick={() => run(lens)}
              className="group relative flex flex-col items-start gap-1 rounded-lg border border-gold/20 bg-obsidian/50 p-3 text-left transition-colors hover:border-gold/50 hover:bg-obsidian/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <LoadingSpinner context="inline" />
              ) : (
                <Icon className="h-4 w-4 text-gold/80 group-hover:text-gold" />
              )}
              <span className="text-xs font-medium text-foreground">{lens.label}</span>
              <span className="text-[10px] text-muted-foreground">{lens.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
