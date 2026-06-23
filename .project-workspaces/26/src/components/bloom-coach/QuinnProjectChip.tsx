import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ChevronDown, FolderOpen, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface QuinnProject {
  id: string;
  name: string;
  emoji: string;
  lens: "coach" | "strategist" | "planner";
}

const LENS_LABEL: Record<QuinnProject["lens"], string> = {
  coach: "Coach",
  strategist: "Strategist",
  planner: "Planner",
};
const LENS_COLOR: Record<QuinnProject["lens"], string> = {
  coach:      "hsl(40 55% 68% / 0.85)",   // champagne
  strategist: "hsl(158 70% 55% / 0.85)",  // emerald
  planner:    "hsl(200 80% 65% / 0.85)",  // soft blue
};

const STORAGE_KEY = "quinn-projects-v1";
const ACTIVE_KEY = "quinn-active-project-v1";

function loadProjects(): QuinnProject[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveProjects(p: QuinnProject[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* */ }
}

interface Props {
  activeProject: QuinnProject | null;
  onProjectChange: (p: QuinnProject | null) => void;
}

export default function QuinnProjectChip({ activeProject, onProjectChange }: Props) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<QuinnProject[]>(() => loadProjects());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [lens, setLens] = useState<QuinnProject["lens"]>("coach");

  useEffect(() => { saveProjects(projects); }, [projects]);

  const select = (p: QuinnProject | null) => {
    onProjectChange(p);
    try {
      if (p) localStorage.setItem(ACTIVE_KEY, JSON.stringify(p));
      else localStorage.removeItem(ACTIVE_KEY);
    } catch { /* */ }
    setOpen(false);
    setAdding(false);
  };

  const addCustom = () => {
    if (!name.trim()) return;
    const p: QuinnProject = {
      id: `proj_${Date.now()}`,
      name: name.trim(),
      emoji: emoji || "📁",
      lens,
    };
    setProjects(prev => [p, ...prev]);
    select(p);
    setName(""); setEmoji("📁"); setLens("coach");
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setAdding(false); }}>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={12}
        className="quinn-obsidian z-[80] w-[min(calc(100vw-1rem),20rem)] max-h-[min(70dvh,24rem)] rounded-2xl border border-white/[0.10] bg-[hsl(160_22%_6%/0.95)] backdrop-blur-2xl p-0 shadow-[0_-4px_32px_rgba(0,0,0,0.55)] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div>
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-bold tracking-widest text-champagne/80">
                ACTIVE PROJECT
              </span>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            </div>

            {activeProject && (
              <button
                onClick={() => select(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-white/20 text-sm">✕</span>
                <span className="text-[12px] text-white/40">No project</span>
              </button>
            )}

            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => select(p)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors ${
                  activeProject?.id === p.id ? "bg-white/[0.04]" : ""
                }`}
              >
                <span className="text-base shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white/85 truncate">{p.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: LENS_COLOR[p.lens] }}>
                    {LENS_LABEL[p.lens]} lens
                  </p>
                </div>
                {activeProject?.id === p.id && (
                  <Check size={12} className="text-champagne shrink-0" />
                )}
              </button>
            ))}

            {projects.length === 0 && !adding && (
              <div className="px-4 py-5 text-center">
                <p className="text-[12px] leading-relaxed text-white/45 italic">
                  What are you working on? Add a project to give Bloom context.
                </p>
              </div>
            )}

            <div className="border-t border-white/[0.06]">
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
                >
                  <Plus size={12} className="text-white/30" />
                  <span className="text-[12px] text-white/40">Custom project</span>
                </button>
              ) : (
                <div className="p-3 flex flex-col gap-2.5">
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="text"
                      value={emoji}
                      onChange={e => setEmoji(e.target.value.slice(-2) || "📁")}
                      maxLength={2}
                      aria-label="Project emoji"
                      className="h-12 w-12 shrink-0 text-center bg-white/[0.06] border border-white/[0.10] rounded-xl text-lg focus:outline-none focus:border-champagne/40 px-1 text-white"
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Project name"
                      aria-label="Project name"
                      className="h-12 min-w-0 flex-1 bg-white/[0.06] border border-white/[0.10] rounded-xl text-sm text-white/90 px-3 focus:outline-none focus:border-champagne/40 placeholder:text-white/25"
                    />
                  </div>
                  <div className="flex gap-1">
                    {(["coach", "strategist", "planner"] as const).map(L => (
                      <button
                        key={L}
                        onClick={() => setLens(L)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          lens === L ? "border" : "bg-white/[0.04] text-white/30 border border-transparent hover:bg-white/[0.07]"
                        }`}
                        style={lens === L ? {
                          color: LENS_COLOR[L],
                          borderColor: LENS_COLOR[L].replace("0.85", "0.40"),
                          background: LENS_COLOR[L].replace("0.85", "0.10"),
                        } : undefined}
                      >
                        {LENS_LABEL[L]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => { setAdding(false); setName(""); }}
                      className="flex-1 rounded-xl py-2 text-[12px] font-medium text-white/45 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addCustom}
                      disabled={!name.trim()}
                      className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-emerald-grad text-[hsl(160,30%,8%)] disabled:opacity-35 disabled:grayscale"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </PopoverContent>

      {activeProject ? (
        <PopoverTrigger asChild>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full border backdrop-blur-lg px-2.5 py-1 text-[11px] font-medium active:scale-95 transition-all"
            style={{
              color: LENS_COLOR[activeProject.lens],
              borderColor: LENS_COLOR[activeProject.lens].replace("0.85", "0.40"),
              background: LENS_COLOR[activeProject.lens].replace("0.85", "0.10"),
              boxShadow: `0 0 14px ${LENS_COLOR[activeProject.lens].replace("0.85", "0.20")}`,
            }}
          >
            <span className="text-xs leading-none">{activeProject.emoji}</span>
            <span className="max-w-[80px] truncate">{activeProject.name}</span>
            <ChevronDown className={`h-2.5 w-2.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
          </motion.button>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--quinn-champagne)/0.25)] bg-white/[0.04] backdrop-blur-lg px-2.5 py-1 text-[11px] font-medium text-white/45 hover:text-white/70 hover:border-[hsl(var(--quinn-champagne)/0.45)] hover:bg-white/[0.07] transition-all duration-300 active:scale-95"
          >
            <FolderOpen className="h-3 w-3 text-champagne/70" />
            Project
            <ChevronDown className={`h-2.5 w-2.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </PopoverTrigger>
      )}
    </Popover>
  );
}
