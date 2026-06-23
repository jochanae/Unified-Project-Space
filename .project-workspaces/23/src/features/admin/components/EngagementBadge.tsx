import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MailOpen, MousePointerClick, AlertTriangle, ShieldAlert, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EngagementStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';

interface Props {
  status?: string | null;
  openCount?: number;
  clickCount?: number;
  className?: string;
  size?: 'sm' | 'md';
}

const CONFIG: Record<EngagementStatus, { label: string; tone: string; Icon: typeof Send }> = {
  sent:        { label: 'Sent',       tone: 'text-muted-foreground border-border/50',                Icon: Send },
  delivered:   { label: 'Delivered',  tone: 'text-sky-500 border-sky-500/30 bg-sky-500/5',           Icon: CheckCircle2 },
  opened:      { label: 'Opened',     tone: 'text-amber-400 border-amber-400/30 bg-amber-400/5',     Icon: MailOpen },
  clicked:     { label: 'Clicked',    tone: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5', Icon: MousePointerClick },
  bounced:     { label: 'Bounced',    tone: 'text-destructive border-destructive/30 bg-destructive/5', Icon: AlertTriangle },
  complained:  { label: 'Complaint',  tone: 'text-destructive border-destructive/30 bg-destructive/10', Icon: ShieldAlert },
};

export function EngagementBadge({ status, openCount, clickCount, className, size = 'sm' }: Props) {
  const key = (status as EngagementStatus) in CONFIG ? (status as EngagementStatus) : 'sent';
  const cfg = CONFIG[key];
  const Icon = cfg.Icon;

  const count = key === 'clicked' && (clickCount ?? 0) > 1
    ? clickCount
    : key === 'opened' && (openCount ?? 0) > 1
      ? openCount
      : null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        cfg.tone,
        className,
      )}
      title={`Engagement: ${cfg.label}${count ? ` (${count}×)` : ''}`}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {cfg.label}{count ? ` ${count}×` : ''}
    </Badge>
  );
}
