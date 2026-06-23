import React from 'react';
import SmartCard from './SmartCard';
import { cn } from '@/lib/utils';

interface DecisionCardProps {
  question: string;
  options: string[];
  onSelect?: (option: string) => void;
  selected?: string;
}

const DecisionCard: React.FC<DecisionCardProps> = ({ question, options, onSelect, selected }) => (
  <SmartCard type="decision">
    <p className="text-sm font-semibold text-foreground mb-3">{question}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect?.(opt)}
          disabled={!!selected}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all border',
            selected === opt
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-white/[0.08] text-muted-foreground border-white/10 hover:bg-white/[0.15]',
            selected && selected !== opt && 'opacity-50',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
    {selected && (
      <p className="text-[10px] text-muted-foreground/50 mt-2">✓ Sent</p>
    )}
  </SmartCard>
);

export default DecisionCard;
