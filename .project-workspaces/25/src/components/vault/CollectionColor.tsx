import { cn } from "@/lib/utils";

export type CollectionColor =
  | "gold"
  | "amber"
  | "rose"
  | "violet"
  | "indigo"
  | "teal"
  | "emerald"
  | "slate";

export const COLLECTION_COLORS: { id: CollectionColor; label: string; hex: string }[] = [
  { id: "gold", label: "Gold", hex: "#c9a84c" },
  { id: "amber", label: "Amber", hex: "#e0a23a" },
  { id: "rose", label: "Rose", hex: "#e06b8a" },
  { id: "violet", label: "Violet", hex: "#a78bfa" },
  { id: "indigo", label: "Indigo", hex: "#6366f1" },
  { id: "teal", label: "Teal", hex: "#2dd4bf" },
  { id: "emerald", label: "Emerald", hex: "#34d399" },
  { id: "slate", label: "Slate", hex: "#94a3b8" },
];

export function colorHex(id: string | null | undefined): string {
  return COLLECTION_COLORS.find((c) => c.id === id)?.hex ?? COLLECTION_COLORS[0].hex;
}

export function CollectionAccentBar({
  color,
  className,
}: {
  color: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("block w-1 self-stretch rounded-full", className)}
      style={{
        background: `linear-gradient(to bottom, ${colorHex(color)} 0%, ${colorHex(color)}55 100%)`,
        boxShadow: `0 0 8px ${colorHex(color)}40`,
      }}
    />
  );
}

export function CollectionColorPicker({
  value,
  onChange,
  className,
}: {
  value: string | null | undefined;
  onChange: (color: CollectionColor) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Collection color"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {COLLECTION_COLORS.map((c) => {
        const selected = c.id === (value ?? "gold");
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.label}
            onClick={() => onChange(c.id)}
            className={cn(
              "relative h-7 w-7 rounded-full transition-transform",
              "ring-offset-2 ring-offset-background",
              selected ? "scale-110 ring-2 ring-gold/70" : "hover:scale-105 ring-1 ring-white/10",
            )}
            style={{ background: c.hex }}
          />
        );
      })}
    </div>
  );
}
