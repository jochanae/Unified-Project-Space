import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Lightbulb, ClipboardList, ShieldCheck, X, ChevronDown, Zap, Check, TrendingUp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type QuinnMode = "focus" | "brainstorm" | "planner" | "audit" | "strategic" | "market" | null;

interface Props {
  activeMode: QuinnMode;
  onSelect: (mode: QuinnMode) => void;
}

// Jewel-tone spectrum — each mode owns a distinct "energy" against the
// Obsidian base. Visual shorthand: Ruby = surgical, Topaz = ideation,
// Emerald = execution, Diamond = forensic analysis, Amethyst = grand vision.
const MODES = [
  { id: "focus" as const, label: "Focus", emoji: "🎯", icon: Target,
    // Ruby — high-alert, surgical
    color: "text-[hsl(0_85%_72%)] border-[hsl(0_75%_58%/0.45)] bg-[hsl(0_75%_58%/0.12)]",
    glow: "shadow-[0_0_14px_hsl(0_75%_58%/0.32),inset_0_0_10px_hsl(0_75%_58%/0.06)]",
    ring: "hsl(0 75% 58% / 0.5)" },
  { id: "brainstorm" as const, label: "Brainstorm", emoji: "💡", icon: Lightbulb,
    // Topaz — bright, electric spark of an idea
    color: "text-[hsl(48_95%_70%)] border-[hsl(48_90%_55%/0.40)] bg-[hsl(48_90%_55%/0.12)]",
    glow: "shadow-[0_0_14px_hsl(48_90%_55%/0.32),inset_0_0_10px_hsl(48_90%_55%/0.06)]",
    ring: "hsl(48 90% 55% / 0.5)" },
  { id: "planner" as const, label: "Planner", emoji: "📋", icon: ClipboardList,
    // Emerald — Go, growth, money (winner — kept)
    color: "text-emerald-300 border-[hsl(var(--quinn-emerald)/0.40)] bg-[hsl(var(--quinn-emerald)/0.12)]",
    glow: "shadow-[0_0_14px_hsl(var(--quinn-emerald)/0.30),inset_0_0_10px_hsl(var(--quinn-emerald)/0.06)]",
    ring: "hsl(var(--quinn-emerald)/0.45)" },
  { id: "audit" as const, label: "Wealth Audit", emoji: "🛡️", icon: ShieldCheck,
    // Diamond Blue — cold, objective, forensic
    color: "text-[hsl(200_90%_78%)] border-[hsl(205_80%_60%/0.45)] bg-[hsl(205_80%_55%/0.12)]",
    glow: "shadow-[0_0_14px_hsl(205_80%_60%/0.32),inset_0_0_10px_hsl(205_80%_60%/0.06)]",
    ring: "hsl(205 80% 60% / 0.5)" },
  { id: "strategic" as const, label: "Strategist", emoji: "⚡", icon: Zap,
    // Amethyst — grand design, high-level vision
    color: "text-[hsl(270_85%_80%)] border-[hsl(268_70%_62%/0.50)] bg-[hsl(268_70%_60%/0.14)]",
    glow: "shadow-[0_0_16px_hsl(268_70%_62%/0.38),inset_0_0_12px_hsl(268_70%_62%/0.08)]",
    ring: "hsl(268 70% 62% / 0.55)" },
  { id: "market" as const, label: "Market", emoji: "📈", icon: TrendingUp,
    // Cyan/Teal — live tickers, market pulse
    color: "text-[hsl(180_85%_70%)] border-[hsl(180_75%_50%/0.45)] bg-[hsl(180_75%_45%/0.12)]",
    glow: "shadow-[0_0_14px_hsl(180_75%_50%/0.34),inset_0_0_10px_hsl(180_75%_50%/0.06)]",
    ring: "hsl(180 75% 50% / 0.5)" },
] as const;

export default function QuinnModeChips({ activeMode, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const active = useMemo(() => MODES.find(m => m.id === activeMode), [activeMode]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="quinn-obsidian z-[80] w-[min(calc(100vw-1rem),11rem)] overflow-visible rounded-2xl border border-white/[0.10] bg-[hsl(160_22%_6%/0.95)] backdrop-blur-2xl p-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/[0.06] mb-1">
            <span className="text-[10px] font-bold tracking-widest text-emerald/80">MODE</span>
            {activeMode && (
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {MODES.map((m) => {
            const isActive = m.id === activeMode;
            return (
              <button
                key={m.id}
                onClick={() => { onSelect(isActive ? null : m.id); setOpen(false); }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-all duration-300 active:scale-95 backdrop-blur-md whitespace-nowrap ${m.color} ${isActive ? m.glow : ""}`}
                style={{ textShadow: `0 0 5px ${m.ring}` }}
              >
                <span className="text-sm">{m.emoji}</span>
                <span className="flex-1 text-left">{m.label}</span>
                {isActive && <Check className="h-3 w-3 opacity-80" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>

      {activeMode && active ? (
        <PopoverTrigger asChild>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-lg shrink-0 active:scale-95 transition-all ${active.color} ${active.glow}`}
            title={`${active.label} mode — tap to change`}
          >
            <span className="text-xs leading-none">{active.emoji}</span>
            <span>{active.label}</span>
            <ChevronDown className={`h-2.5 w-2.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
          </motion.button>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--quinn-emerald)/0.30)] bg-white/[0.04] backdrop-blur-lg px-3 py-1 text-[11px] font-medium text-emerald hover:border-[hsl(var(--quinn-emerald)/0.55)] hover:bg-white/[0.07] transition-all duration-300 active:scale-95 shadow-[0_0_4px_hsl(var(--quinn-emerald)/0.15)]"
          >
            <Zap className="h-3 w-3" />
            Mode
            <ChevronDown className={`h-2.5 w-2.5 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </PopoverTrigger>
      )}
    </Popover>
  );
}
