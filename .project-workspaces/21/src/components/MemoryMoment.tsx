import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

function getMemoryTimeframe(days: number): string {
  if (days < 7) return '';
  if (days < 14) return 'last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'last month';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}

function formatExactDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

interface MemoryMomentProps {
  days: number;
  className?: string;
  /** When provided, the badge becomes tappable and reveals the actual memory. */
  reference?: {
    text: string;
    extractedAt: string;
    daysOld: number;
  };
}

export default function MemoryMoment({ days, className, reference }: MemoryMomentProps) {
  const [open, setOpen] = useState(false);
  if (days < 7) return null;
  const timeframe = getMemoryTimeframe(days);

  // Without a verified reference we don't render — prevents false positives.
  if (!reference) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors animate-in fade-in duration-500 cursor-pointer',
          className
        )}
        aria-label={`Show memory remembered from ${timeframe}`}
      >
        <Sparkles className="w-3 h-3 text-purple-400/60" aria-hidden="true" />
        <span className="underline decoration-dotted decoration-white/20 underline-offset-2">
          Remembered from {timeframe}
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="bg-[#0F0F1A]/95 backdrop-blur-xl border-t border-purple-400/20 rounded-t-3xl"
        >
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <SheetTitle className="text-white/90 text-base font-light">
                Remembered from {timeframe}
              </SheetTitle>
            </div>
            <SheetDescription className="text-white/50 text-xs">
              {formatExactDate(reference.extractedAt)} · {reference.daysOld} days ago
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 mb-2">
            <p className="text-white/85 text-[15px] leading-relaxed font-light italic border-l-2 border-purple-400/40 pl-4">
              "{reference.text}"
            </p>
          </div>
          <p className="text-white/30 text-[11px] mt-4">
            This is the memory the reply leaned on.
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
