import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export type BlueprintMode = 'auditor' | 'visionary' | 'strategist';

interface BlueprintSection {
  heading: string;
  points: string[];
}

interface BlueprintCardProps {
  mode: BlueprintMode;
  title: string;
  callout?: string;
  sections: BlueprintSection[];
  onSave?: () => void;
  isSaved?: boolean;
  /** When set, the save button reads "Save to {projectName}" */
  activeProjectName?: string | null;
  onBuildInAxiom?: () => void | Promise<void>;
}

const MODE_CONFIG: Record<BlueprintMode, { emoji: string; label: string; color: string; border: string; glow: string }> = {
  auditor: {
    emoji: '🔍',
    label: 'AUDITOR',
    color: 'text-[rgba(212,175,55,0.95)]',
    border: 'border-l-[rgba(212,175,55,0.6)]',
    glow: 'shadow-[0_0_20px_rgba(212,175,55,0.08),inset_0_0_40px_rgba(212,175,55,0.03)]',
  },
  visionary: {
    emoji: '👁',
    label: 'VISIONARY',
    color: 'text-[rgba(180,160,255,0.9)]',
    border: 'border-l-[rgba(180,160,255,0.5)]',
    glow: 'shadow-[0_0_20px_rgba(180,160,255,0.08),inset_0_0_40px_rgba(180,160,255,0.03)]',
  },
  strategist: {
    emoji: '📊',
    label: 'STRATEGIST',
    color: 'text-[rgba(100,220,180,0.9)]',
    border: 'border-l-[rgba(100,220,180,0.5)]',
    glow: 'shadow-[0_0_20px_rgba(100,220,180,0.08),inset_0_0_40px_rgba(100,220,180,0.03)]',
  },
};

const BlueprintCard: React.FC<BlueprintCardProps> = ({
  mode,
  title,
  callout,
  sections,
  onSave,
  isSaved,
  activeProjectName,
  onBuildInAxiom,
}) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [handoffLoading, setHandoffLoading] = useState(false);

  const handleBuildInAxiom = async () => {
    if (!onBuildInAxiom || handoffLoading) return;
    setHandoffLoading(true);
    try {
      await onBuildInAxiom();
    } finally {
      setHandoffLoading(false);
    }
  };

  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.strategist;

  const toggleSection = (idx: number) => {
    setCollapsed(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = () => {
    const lines: string[] = [`${cfg.emoji} ${cfg.label}: ${title}`, ''];
    if (callout) lines.push(`→ ${callout}`, '');
    sections.forEach(s => {
      lines.push(s.heading);
      s.points.forEach(p => lines.push(`  • ${p}`));
      lines.push('');
    });
    navigator.clipboard?.writeText(lines.join('\n').trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`rounded-2xl bg-[rgba(10,10,18,0.75)] backdrop-blur-md border-[0.5px] border-white/[0.07] border-l-2 ${cfg.border} ${cfg.glow} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{cfg.emoji}</span>
          <span className={`text-[10px] font-semibold tracking-[0.18em] ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-white/[0.06] transition-colors"
          aria-label="Copy blueprint"
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-[rgba(100,220,180,0.9)]" />
            : <Copy className="h-3.5 w-3.5 text-white/40" />}
        </button>
      </div>

      {/* Title */}
      <div className="px-4 pb-2">
        <h3 className="text-[15px] font-semibold text-white/95 leading-snug">{title}</h3>
      </div>

      {/* Callout */}
      {callout && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border-[0.5px] border-white/[0.06]">
          <p className="text-[12.5px] text-white/75 leading-relaxed italic">→ {callout}</p>
        </div>
      )}

      {/* Sections */}
      <div className="px-4 pb-4 space-y-2.5">
        {sections.map((section, idx) => {
          const isCollapsed = collapsed[idx];
          return (
            <div key={idx} className="border-t-[0.5px] border-white/[0.05] pt-2.5 first:border-t-0 first:pt-0">
              <button
                onClick={() => toggleSection(idx)}
                className="w-full flex items-center justify-between gap-2 mb-1.5 group"
              >
                <span className={`text-[10.5px] font-semibold tracking-[0.14em] ${cfg.color}`}>
                  {section.heading}
                </span>
                {isCollapsed
                  ? <ChevronDown className="h-3 w-3 text-white/30 group-hover:text-white/60 transition-colors" />
                  : <ChevronUp className="h-3 w-3 text-white/30 group-hover:text-white/60 transition-colors" />}
              </button>
              {!isCollapsed && (
                <ul className="space-y-1 pl-1">
                  {section.points.map((point, pIdx) => (
                    <li key={pIdx} className="flex gap-2 text-[13px] text-white/80 leading-relaxed">
                      <span className="text-white/30 mt-0.5">•</span>
                      <span className="flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Save action */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={isSaved}
          className={`w-full px-4 py-2.5 border-t-[0.5px] border-white/[0.05] text-[11.5px] font-medium tracking-wide transition-colors ${
            isSaved
              ? 'text-[rgba(100,220,180,0.85)] cursor-default'
              : 'text-white/55 hover:bg-white/[0.04] hover:text-white/85'
          }`}
        >
          {isSaved
            ? activeProjectName
              ? `✓ Pinned to ${activeProjectName}`
              : '✓ Saved to vault'
            : activeProjectName
              ? `Save to ${activeProjectName}`
              : 'Save blueprint'}
        </button>
      )}
      {onBuildInAxiom && (
        <button
          onClick={handleBuildInAxiom}
          disabled={handoffLoading}
          className={`w-full px-4 py-2.5 border-t-[0.5px] border-white/[0.05] text-[11.5px] font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
            handoffLoading
              ? 'text-[rgba(212,175,55,0.5)] cursor-wait'
              : 'text-[rgba(212,175,55,0.7)] hover:bg-white/[0.04] hover:text-[rgba(212,175,55,0.95)]'
          }`}
        >
          {handoffLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Opening Axiom…</span>
            </>
          ) : (
            <>
              <span>→</span>
              <span>Build this in Axiom</span>
            </>
          )}
        </button>
      )}
    </motion.div>
  );
};

export default BlueprintCard;
