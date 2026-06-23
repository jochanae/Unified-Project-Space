// Permanent "Aa" text-size control for the Reader top bar (and reusable elsewhere).
// Independent of audio playback — users can scale text without starting the narrator.
// Pops a small glass panel with the same Standard / Large / Extra Large presets.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTextScale, TEXT_SCALE_STYLES, type TextScale } from "@/hooks/useTextScale";

const OPTIONS: TextScale[] = ["standard", "large", "xlarge", "pulpit", "presentation"];

const PREVIEW_PX: Record<TextScale, string> = {
  standard: "14px",
  large: "18px",
  xlarge: "22px",
  pulpit: "26px",
  presentation: "30px",
};

export function TextSizeMenu({ className }: { className?: string }) {
  const { scale, setScale } = useTextScale();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Text size"
        aria-expanded={open}
        title={`Text size — ${TEXT_SCALE_STYLES[scale].label}`}
        className={cn(
          "rounded-md px-2 py-1.5 transition-colors font-display leading-none inline-flex items-baseline gap-0.5",
          open
            ? "text-gold bg-gold/10"
            : "text-muted-foreground hover:text-gold-soft hover:bg-gold/5",
        )}
      >
        <span className="text-base">A</span>
        <span className="text-xs">a</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-72 hairline rounded-xl bg-obsidian-elevated/80 backdrop-blur-2xl backdrop-saturate-150 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]"
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold mb-2 px-1">Text Size</p>
          <div className="grid grid-cols-3 gap-1.5">
            {OPTIONS.slice(0, 3).map((opt) => {
              const meta = TEXT_SCALE_STYLES[opt];
              const active = scale === opt;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setScale(opt);
                    setOpen(false);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md hairline px-2 py-2.5 text-center transition-colors flex flex-col items-center gap-1",
                    active
                      ? "bg-gold/15 border-gold/60 text-gold-soft"
                      : "bg-obsidian/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-display leading-none" style={{ fontSize: PREVIEW_PX[opt] }}>
                    Aa
                  </span>
                  <span className="text-[10px] tracking-wide">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="h-px flex-1 bg-gold/15" />
            <span className="text-[9px] uppercase tracking-[0.28em] text-gold/70">Pulpit</span>
            <span className="h-px flex-1 bg-gold/15" />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {OPTIONS.slice(3).map((opt) => {
              const meta = TEXT_SCALE_STYLES[opt];
              const active = scale === opt;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setScale(opt);
                    setOpen(false);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md hairline px-2 py-2.5 text-center transition-colors flex flex-col items-center gap-1",
                    active
                      ? "bg-gold/15 border-gold/60 text-gold-soft shadow-[0_0_18px_rgba(201,168,76,0.18)]"
                      : "bg-obsidian/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-display leading-none" style={{ fontSize: PREVIEW_PX[opt] }}>
                    Aa
                  </span>
                  <span className="text-[10px] tracking-wide">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 px-1 text-[10px] text-muted-foreground/70">
            Pulpit sizes are designed for live service reading at a stand or laptop.
          </p>
        </div>
      )}
    </div>
  );
}
