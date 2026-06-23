import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Sparkles,
  MessageSquare,
  CheckCircle,
  Download,
  Upload,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const STORAGE_KEY = 'intoiq_plan_onboarded';

interface PlanOnboardingModalProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: MessageSquare,
    iconBg: 'bg-chart-3/10',
    iconColor: 'text-chart-3',
    title: 'Chat with Quinn',
    heading: 'Start a conversation',
    description:
      'Tell Quinn about your financial goals — saving, investing, budgeting, or trading. Quinn will suggest actionable steps you can save directly to your plan.',
  },
  {
    icon: Target,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Organize your plan',
    heading: 'Build with sections',
    description:
      'Group your goals into sections like "Foundations," "Wealth Building," or "Risk Management." Add items manually or let Quinn suggest them for you.',
  },
  {
    icon: CheckCircle,
    iconBg: 'bg-gain/10',
    iconColor: 'text-gain',
    title: 'Track progress',
    heading: 'Check things off',
    description:
      'Mark items as in-progress or complete. Revisit any item with Quinn for deeper guidance. Your progress stats update in real time.',
  },
  {
    icon: Download,
    iconBg: 'bg-chart-4/10',
    iconColor: 'text-chart-4',
    title: 'Work offline',
    heading: 'Download & re-import',
    description:
      'Download a CSV template from the Share menu, fill it in on your own time, then import it back. The format matches perfectly so nothing gets lost.',
  },
];

export function PlanOnboardingModal({ onComplete }: PlanOnboardingModalProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasOnboarded = localStorage.getItem(STORAGE_KEY);
    if (!hasOnboarded) {
      setOpen(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    onComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleComplete()}>
      <DialogContent className="sm:max-w-md">
        {/* Progress */}
        <Progress value={progress} className="h-1 mb-2" />

        <DialogHeader className="text-center sm:text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${step.iconBg}`}
          >
            <StepIcon className={`h-8 w-8 ${step.iconColor}`} />
          </div>
          <DialogTitle className="text-xl">{step.heading}</DialogTitle>
          <DialogDescription className="text-base">
            {step.title}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                  ? 'w-2 bg-primary/40'
                  : 'w-2 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            className="text-muted-foreground"
          >
            Skip
          </Button>

          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
