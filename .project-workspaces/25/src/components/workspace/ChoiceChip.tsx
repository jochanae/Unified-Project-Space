/**
 * ChoiceChip
 *
 * Tappable chip for the Co-Author Configurator.
 * Selected: gold border + soft box-shadow glow + gold dot.
 * Unselected: dim border, muted text.
 */

import { cn } from "@/lib/utils";

interface ChoiceChipProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function ChoiceChip({
  label,
  sublabel,
  selected,
  onSelect,
  disabled = false,
}: ChoiceChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-sm transition-all duration-200 select-none min-w-[5rem] gap-0.5",
        selected && [
          "border-gold/70 bg-gold/10 text-gold-soft",
          "shadow-[0_0_16px_rgba(201,168,76,0.25),inset_0_1px_0_rgba(201,168,76,0.15)]",
        ],
        !selected && [
          "border-gold/18 bg-obsidian-elevated/30 text-muted-foreground/70",
          "hover:border-gold/35 hover:bg-gold/5 hover:text-muted-foreground",
        ],
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(201,168,76,0.7)]"
        />
      )}
      <span
        className={cn(
          "font-display text-[13px] leading-tight transition-colors",
          selected ? "text-gold-soft" : "text-foreground/75",
        )}
      >
        {label}
      </span>
      {sublabel && (
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.18em] leading-none transition-colors",
            selected ? "text-gold/65" : "text-muted-foreground/40",
          )}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
}
