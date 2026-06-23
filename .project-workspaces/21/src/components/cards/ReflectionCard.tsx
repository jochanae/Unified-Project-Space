import React from 'react';
import { Feather, Bookmark } from 'lucide-react';
import SmartCard from './SmartCard';

interface ReflectionCardProps {
  prompt: string;
  onWrite?: () => void;
  onSkip?: () => void;
  onSave?: () => void;
}

const ReflectionCard: React.FC<ReflectionCardProps> = ({ prompt, onWrite, onSkip, onSave }) => (
  <SmartCard type="reflection">
    <div className="flex items-start gap-2">
      <Feather size={14} className="text-primary/60 mt-0.5 shrink-0" />
      <p className="text-sm italic text-foreground/90 leading-relaxed">{prompt}</p>
    </div>
    <div className="flex items-center gap-3 mt-3">
      <button
        onClick={onWrite}
        className="rounded-full px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        Write
      </button>
      <button
        onClick={onSkip}
        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Skip
      </button>
      {onSave && (
        <button onClick={onSave} className="ml-auto text-primary/60 hover:text-primary transition-colors">
          <Bookmark size={14} />
        </button>
      )}
    </div>
  </SmartCard>
);

export default ReflectionCard;
