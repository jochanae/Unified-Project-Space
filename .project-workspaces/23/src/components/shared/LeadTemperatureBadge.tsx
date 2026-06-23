import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Contact } from '@/features/contacts';
import { classifyLeadTemperature, TEMPERATURE_META } from '@/lib/lead-temperature';

interface LeadTemperatureBadgeProps {
  contact: Contact;
  size?: 'xs' | 'sm';
  className?: string;
}

export function LeadTemperatureBadge({ contact, size = 'xs', className }: LeadTemperatureBadgeProps) {
  const result = useMemo(() => classifyLeadTemperature(contact), [contact]);
  const meta = TEMPERATURE_META[result.temperature];

  const sizeClasses = size === 'xs'
    ? 'h-4 px-1.5 text-[9px]'
    : 'h-5 px-2 text-[10px]';

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wider ring-1',
              meta.bg,
              meta.color,
              meta.ring,
              sizeClasses,
              className
            )}
          >
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] glass">
          <p className="text-xs font-medium mb-1">{meta.label} lead</p>
          <p className="text-[11px] text-muted-foreground mb-2">{result.rationale}</p>
          {result.signals.length > 0 && (
            <ul className="text-[10px] text-muted-foreground/80 space-y-0.5">
              {result.signals.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
