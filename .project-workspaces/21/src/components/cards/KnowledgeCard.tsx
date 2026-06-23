import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bookmark, ChevronDown } from 'lucide-react';
import SmartCard from './SmartCard';

interface KnowledgeCardProps {
  title: string;
  body: string;
  onSave?: () => void;
  onPractice?: () => void;
  isSaved?: boolean;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ title, body, onSave, onPractice, isSaved }) => {
  const [expanded, setExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setNeedsExpand(el.scrollHeight > el.clientHeight + 2);
    }
  }, [body]);

  return (
    <SmartCard type="knowledge">
      <div className="flex items-start gap-1.5">
        <Sparkles size={14} className="text-primary/50 mt-0.5 shrink-0" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p
        ref={textRef}
        className={`text-[13px] text-muted-foreground/80 leading-relaxed mt-1 transition-all duration-300 ease-in-out ${expanded ? '' : 'line-clamp-5'}`}
      >
        {body}
      </p>
      <div className="flex items-center gap-3 mt-3">
        {needsExpand && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
            <ChevronDown size={12} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
        {onSave && (
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 text-xs text-primary/60 hover:text-primary transition-colors"
          >
            <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} className={isSaved ? 'text-primary' : ''} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
        )}
        {onPractice && (
          <button
            onClick={onPractice}
            className="rounded-full px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Practice
          </button>
        )}
      </div>
    </SmartCard>
  );
};

export default KnowledgeCard;
