import React from 'react';
import { Volume2, ChevronRight } from 'lucide-react';
import SmartCard from './SmartCard';

interface PracticeCardProps {
  scenario: string;
  phrase?: string;
  tip?: string;
  onHear?: () => void;
  onNext?: () => void;
}

const PracticeCard: React.FC<PracticeCardProps> = ({ scenario, phrase, tip, onHear, onNext }) => {
  return (
    <SmartCard type="practice">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-1">Practice scenario</p>
      <p className="text-sm font-semibold text-foreground">{scenario}</p>
      {phrase && (
        <div className="rounded bg-white/[0.08] px-3 py-2 text-sm font-mono text-foreground/90 mt-2">{phrase}</div>
      )}
      {tip && <p className="text-[11px] text-muted-foreground/60 italic mt-1">{tip}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onHear}
          disabled={!onHear}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] transition-colors disabled:opacity-30 disabled:cursor-default"
        >
          <Volume2 className="h-3.5 w-3.5" /> Hear it
        </button>
        <button
          onClick={onNext}
          disabled={!onNext}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] transition-colors disabled:opacity-30 disabled:cursor-default"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </SmartCard>
  );
};

export default PracticeCard;
