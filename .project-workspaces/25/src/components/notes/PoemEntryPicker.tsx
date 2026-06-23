/**
 * PoemEntryPicker — modal that lets the user choose how to start a new poem.
 *
 * Three entry points (decided by the user in the planning phase):
 *  - Blank: free-form, no scripture or prompt
 *  - From a theme: user types a theme word that seeds the inspiration field
 *  - From current scripture: uses the active reader anchor as inspiration
 *
 * The picker is intentionally lightweight: it returns a `PoemSeed` to the
 * caller, who is responsible for opening the editor with that seed. This
 * keeps storage / autosave logic out of the picker.
 */

import { useEffect, useState } from "react";
import { Feather, Sparkles, BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PoemSeed =
  | { kind: "blank" }
  | { kind: "theme"; theme: string }
  | { kind: "scripture"; reference: string };

type Choice = "blank" | "theme" | "scripture";

interface Props {
  open: boolean;
  /** Current reader anchor reference, e.g. "John 3:16". Null disables the scripture option. */
  scriptureRef: string | null;
  onClose: () => void;
  onSelect: (seed: PoemSeed) => void;
}

export function PoemEntryPicker({ open, scriptureRef, onClose, onSelect }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [theme, setTheme] = useState("");

  // Reset transient state every time the sheet re-opens.
  useEffect(() => {
    if (open) {
      setChoice(null);
      setTheme("");
    }
  }, [open]);

  if (!open) return null;

  const confirm = () => {
    if (choice === "blank") onSelect({ kind: "blank" });
    else if (choice === "theme" && theme.trim()) onSelect({ kind: "theme", theme: theme.trim() });
    else if (choice === "scripture" && scriptureRef)
      onSelect({ kind: "scripture", reference: scriptureRef });
  };

  const canConfirm =
    choice === "blank" ||
    (choice === "theme" && theme.trim().length > 0) ||
    (choice === "scripture" && !!scriptureRef);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md hairline rounded-2xl bg-obsidian-elevated/95 backdrop-blur-md p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Begin a poem</p>
            <h2 className="font-display text-xl text-foreground mt-1">How will you enter?</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          <PickerOption
            active={choice === "blank"}
            icon={Feather}
            label="Blank"
            description="Start with a clean page. No prompt, no anchor."
            onClick={() => setChoice("blank")}
          />
          <PickerOption
            active={choice === "theme"}
            icon={Sparkles}
            label="From a theme"
            description="A single word to seed your reflection — grief, gratitude, surrender."
            onClick={() => setChoice("theme")}
          />
          {choice === "theme" && (
            <input
              autoFocus
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && theme.trim()) confirm();
              }}
              placeholder="Type a theme…"
              className="w-full hairline rounded-md bg-obsidian/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold/40 caret-gold ml-3"
              aria-label="Type a theme…"
            />
          )}
          <PickerOption
            active={choice === "scripture"}
            disabled={!scriptureRef}
            icon={BookOpen}
            label="From current scripture"
            description={
              scriptureRef
                ? `Anchor to ${scriptureRef}`
                : "No verse selected — open the Sanctuary first"
            }
            onClick={() => scriptureRef && setChoice("scripture")}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className={cn(
              "text-xs uppercase tracking-widest px-4 py-2 rounded-md hairline transition-colors",
              canConfirm
                ? "bg-gold/15 text-gold-soft hover:bg-gold/25"
                : "text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}

interface OptionProps {
  active: boolean;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}

function PickerOption({ active, disabled, icon: Icon, label, description, onClick }: OptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-left hairline rounded-lg px-4 py-3 flex items-start gap-3 transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed bg-obsidian/40"
          : active
            ? "bg-gold/10 border-gold/30"
            : "bg-obsidian/40 hover:bg-obsidian/60",
      )}
    >
      <Icon
        className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-gold" : "text-muted-foreground")}
      />
      <div className="min-w-0">
        <p className={cn("text-sm", active ? "text-gold-soft" : "text-foreground")}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}
