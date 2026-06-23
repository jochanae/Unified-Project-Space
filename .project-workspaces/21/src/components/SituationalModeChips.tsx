import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Lightbulb, Moon, Heart, X, ChevronDown, Zap } from 'lucide-react';

export type SituationalMode = 'focus' | 'brainstorm' | 'decompress' | 'connect' | 'strategic' | null;

interface SituationalModeChipsProps {
  activeMode: SituationalMode;
  onSelect: (mode: SituationalMode) => void;
  companionName: string;
  suggestedMode?: SituationalMode;
}

const MODES = [
  { id: 'focus' as const, label: 'Focus', emoji: '🎯', icon: Target,
    color: 'text-amber-300 border-[rgba(251,191,36,0.35)] bg-amber-500/15',
    glow: 'shadow-[0_0_14px_rgba(251,191,36,0.3),inset_0_0_10px_rgba(251,191,36,0.06)]',
    ring: 'rgba(251,191,36,0.4)' },
  { id: 'brainstorm' as const, label: 'Brainstorm', emoji: '💡', icon: Lightbulb,
    color: 'text-amber-200 border-[rgba(212,175,55,0.3)] bg-amber-400/12',
    glow: 'shadow-[0_0_14px_rgba(212,175,55,0.25),inset_0_0_10px_rgba(212,175,55,0.05)]',
    ring: 'rgba(212,175,55,0.35)' },
  { id: 'decompress' as const, label: 'Decompress', emoji: '😌', icon: Moon,
    color: 'text-cyan-300 border-[rgba(34,211,238,0.35)] bg-cyan-500/15',
    glow: 'shadow-[0_0_14px_rgba(34,211,238,0.3),inset_0_0_10px_rgba(34,211,238,0.06)]',
    ring: 'rgba(34,211,238,0.4)' },
  { id: 'connect' as const, label: 'Connect', emoji: '❤️', icon: Heart,
    color: 'text-[rgba(255,75,75,0.85)] border-[rgba(255,75,75,0.3)] bg-rose-500/15',
    glow: 'shadow-[0_0_14px_rgba(255,75,75,0.25),inset_0_0_10px_rgba(255,75,75,0.05)]',
    ring: 'rgba(255,75,75,0.35)' },
  { id: 'strategic' as const, label: 'Strategic', emoji: '⚡', icon: Zap,
    color: 'text-[rgba(212,175,55,0.95)] border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.1)]',
    glow: 'shadow-[0_0_16px_rgba(212,175,55,0.35),inset_0_0_12px_rgba(212,175,55,0.08)]',
    ring: 'rgba(212,175,55,0.5)' },
] as const;

function getTimeBasedSuggestion(): SituationalMode {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) return 'decompress';
  if (hour >= 9 && hour < 12) return 'focus';
  return null;
}

const FOCUS_PATTERNS = /\b(focus|productive|work|task|deadline|todo|to-do|get stuff done|procrastinat|distract|behind on|need to finish|homework|study|studying)\b/i;
const BRAINSTORM_PATTERNS = /\b(idea|brainstorm|think about|figure out|creative|concept|what if|invent|innovate)\b/i;
const DECOMPRESS_PATTERNS = /\b(overwhelm|stress|anxious|anxiety|tired|exhaust|burnt out|burnout|can't sleep|insomnia|rough day|bad day|drained|need a break|wind down|relax|calm down|breathe)\b/i;
const CONNECT_PATTERNS = /\b(lonely|miss you|need someone|feeling alone|talk about feelings|open up|deep conversation|what do you think about|how are you feeling|vulnerable|been thinking|on my mind|heart)\b/i;
const STRATEGIC_PATTERNS = /\b(launch|funnel|roadmap|saas|mvp|go-to-market|gtm|pricing|monetiz|conversion|retention|acquisition|positioning|product-market|pmf|architecture|tech stack|scalab|investor|pitch|business model|revenue|churn|onboarding flow|feature spec|blueprint|strategy|co-?founder|ship it|shipping)\b/i;

/** Detect a suggested situational mode from message text (passive hint) */
export function detectSituationalSuggestion(text: string): SituationalMode {
  if (!text || text.length < 8) return null;
  if (DECOMPRESS_PATTERNS.test(text)) return 'decompress';
  if (STRATEGIC_PATTERNS.test(text)) return 'strategic';
  if (FOCUS_PATTERNS.test(text)) return 'focus';
  if (BRAINSTORM_PATTERNS.test(text)) return 'brainstorm';
  if (CONNECT_PATTERNS.test(text)) return 'connect';
  return null;
}

const ACTIVATE_FOCUS = /\b(help me focus|let'?s focus|focus mode|i need to focus|time to focus|enter focus)\b/i;
const ACTIVATE_BRAINSTORM = /\b(let'?s brainstorm|brainstorm mode|help me brainstorm|brainstorm with me|let'?s think|brainstorm time)\b/i;
const ACTIVATE_DECOMPRESS = /\b(help me relax|i need to decompress|let'?s decompress|wind me down|help me calm down|decompress mode|i need to chill)\b/i;
const ACTIVATE_CONNECT = /\b(let'?s connect|connect mode|i want to open up|deep talk|heart to heart|i need to talk)\b/i;
const ACTIVATE_STRATEGIC = /\b(strategic mode|strategy session|co-?founder mode|let'?s strategize|strategize with me|business mode|build mode|founder mode|ship mode)\b/i;

/** Detect explicit mode activation from user's message */
export function detectModeActivation(text: string): SituationalMode {
  if (!text || text.length < 6) return null;
  if (ACTIVATE_FOCUS.test(text)) return 'focus';
  if (ACTIVATE_BRAINSTORM.test(text)) return 'brainstorm';
  if (ACTIVATE_DECOMPRESS.test(text)) return 'decompress';
  if (ACTIVATE_CONNECT.test(text)) return 'connect';
  if (ACTIVATE_STRATEGIC.test(text)) return 'strategic';
  return null;
}

/** Detect if companion's response is suggesting a mode shift */
export function detectCompanionModeSuggestion(text: string): SituationalMode {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/shift (into|to|gears).*(focus|productivity)/i.test(lower) || /want me to.*(focus|lock in)/i.test(lower)) return 'focus';
  if (/shift (into|to|gears).*(brainstorm|creative)/i.test(lower) || /want me to.*(brainstorm|ideate)/i.test(lower)) return 'brainstorm';
  if (/shift (into|to|gears).*(decompress|calm|wind down)/i.test(lower) || /want me to.*(decompress|wind down|relax)/i.test(lower)) return 'decompress';
  if (/shift (into|to|gears).*(connect|deep)/i.test(lower) || /want me to.*(connect|go deeper|open up)/i.test(lower)) return 'connect';
  if (/shift (into|to|gears).*(strateg|co-?founder|build mode)/i.test(lower) || /want me to.*(strategize|put on (my|the) (strategist|co-?founder)|think strategically)/i.test(lower)) return 'strategic';
  return null;
}

export default function SituationalModeChips({ activeMode, onSelect, companionName, suggestedMode }: SituationalModeChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeSuggestion = useMemo(() => getTimeBasedSuggestion(), []);
  const highlighted = suggestedMode || timeSuggestion;

  const activeConfig = useMemo(() => MODES.find(m => m.id === activeMode), [activeMode]);
  const suggestedConfig = useMemo(() => MODES.find(m => m.id === highlighted), [highlighted]);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isExpanded]);

  // Active mode: inline pill with dismiss
  if (activeMode && activeConfig) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, borderColor: [activeConfig.ring, 'rgba(255,255,255,0.1)', activeConfig.ring] }}
        transition={{ borderColor: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
        className={`relative inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-1 text-[11px] font-medium overflow-hidden backdrop-blur-lg shrink-0 ${activeConfig.color} ${activeConfig.glow}`}
        title={`${activeConfig.label} mode active — tap × to turn off`}
      >
        <motion.span
          key={activeMode}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-y-0 w-1/2"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.15) 50%, transparent 100%)',
          }}
        />
        <span className="text-sm leading-none">{activeConfig.emoji}</span>
        <span className="hidden sm:inline">{activeConfig.label}</span>
        <button
          onClick={() => onSelect(null)}
          aria-label={`Turn off ${activeConfig.label} mode`}
          className="ml-0.5 rounded-full p-1 hover:bg-white/15 active:bg-white/25 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </motion.span>
    );
  }

  // Collapsed / Expanded mode selector
  return (
    <div className="relative" ref={panelRef}>
      {/* Expand-upward panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full right-0 mb-2 flex flex-col gap-1.5 rounded-2xl border border-white/[0.1] bg-[hsl(230_20%_8%/0.92)] backdrop-blur-2xl p-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
            style={{ minWidth: '140px' }}
          >
            {MODES.map((mode, i) => {
              const isHighlighted = mode.id === highlighted;
              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.15 }}
                  onClick={() => {
                    onSelect(mode.id);
                    setIsExpanded(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-all duration-300 active:scale-95 backdrop-blur-md whitespace-nowrap ${mode.color} ${mode.glow} ${
                    isHighlighted ? 'ring-1 ring-white/10' : ''
                  }`}
                  style={{ textShadow: `0 0 5px ${mode.ring}` }}
                >
                  <span className="text-sm">{mode.emoji}</span>
                  {mode.label}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-white/[0.05] backdrop-blur-lg px-3 py-1 text-[11px] font-medium text-white/50 hover:text-white/70 hover:border-[rgba(212,175,55,0.5)] hover:bg-white/[0.08] transition-all duration-300 active:scale-95 shadow-[0_0_4px_rgba(212,175,55,0.1)]"
      >
        {suggestedConfig && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-xs leading-none"
          >
            {suggestedConfig.emoji}
          </motion.span>
        )}
        Mode
        <ChevronDown className={`h-2.5 w-2.5 text-[rgba(212,175,55,0.5)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
