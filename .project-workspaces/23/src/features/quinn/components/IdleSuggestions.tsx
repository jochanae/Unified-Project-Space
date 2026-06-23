import { useState, useEffect, useRef } from 'react';
import { Lightbulb, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IdleSuggestionsProps {
  visible: boolean;
  projectName: string;
  projectGoal: string;
  onAccept: (suggestion: string) => void;
  onDismiss: () => void;
}

const IDLE_SUGGESTIONS = [
  "This CTA could be more specific — try adding a benefit.",
  "Consider adding a social proof section below the hero.",
  "Your headline is strong, but a subheadline with urgency would boost conversions.",
  "Add a FAQ section to address objections before the CTA.",
  "An email opt-in step before the sales page can warm leads.",
  "Try a testimonial carousel to build trust faster.",
  "Your funnel could benefit from a thank-you page with an upsell.",
];

export function IdleSuggestions({ visible, projectName, projectGoal, onAccept, onDismiss }: IdleSuggestionsProps) {
  const [suggestion, setSuggestion] = useState('');
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }

    // Show after 3 seconds of idle
    timeoutRef.current = setTimeout(() => {
      const random = IDLE_SUGGESTIONS[Math.floor(Math.random() * IDLE_SUGGESTIONS.length)];
      setSuggestion(random);
      setShow(true);
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible]);

  if (!show) return null;

  return (
    <div className={cn(
      'glass rounded-xl p-4 border border-primary/20 flex items-start gap-3 transition-all duration-500',
      'animate-fade-in-up'
    )}>
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Lightbulb className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">IQ Suggestion</p>
        <p className="text-sm text-foreground">{suggestion}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
