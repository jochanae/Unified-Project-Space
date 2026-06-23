import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { QUESTIONS, useRotatingGhost } from '../hooks/use-signal-lab';

interface Props {
  step: number;
  currentQ: (typeof QUESTIONS)[number];
  currentAnswer: string;
  isLastQuestion: boolean;
  onInputChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SignalQuestionFlow({
  step, currentQ, currentAnswer, isLastQuestion, onInputChange, onNext, onBack,
}: Props) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ghost = useRotatingGhost(currentQ.ghosts);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 400);
  }, [step]);

  return (
    <div key={step} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Progress */}
      <div className="flex gap-2 mb-8 justify-center">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              i <= step ? 'bg-primary w-12' : 'bg-muted w-8',
            )}
          />
        ))}
      </div>

      <div className="space-y-4">
        <label
          className="block text-lg font-semibold text-foreground text-center"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {currentQ.label}
        </label>

        <Textarea
          ref={textareaRef}
          value={currentAnswer}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onNext();
            }
          }}
          placeholder={ghost}
          rows={4}
          className="bg-card/50 border-border/30 text-foreground placeholder:text-muted-foreground/40 text-base resize-none focus:ring-primary/30 transition-[placeholder] duration-500"
        />

        <div className="flex justify-between items-center">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
              Cancel
            </Button>
          )}

          <Button onClick={onNext} disabled={!currentAnswer.trim()} className="gap-2">
            {isLastQuestion ? 'Find my Signal' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
