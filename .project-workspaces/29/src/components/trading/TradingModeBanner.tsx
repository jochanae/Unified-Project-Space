import { cn } from '@/lib/utils';
import { FileText, DollarSign, Sparkles } from 'lucide-react';

type TradingMode = 'paper' | 'live' | 'practice';

interface TradingModeBannerProps {
  mode: TradingMode;
  className?: string;
}

const modeConfig = {
  paper: {
    icon: FileText,
    label: 'PAPER MODE',
    description: 'Practice with virtual money',
    bgClass: 'bg-gradient-to-r from-chart-1/10 via-chart-2/10 to-chart-1/10',
    borderClass: 'border-chart-1/30',
    textClass: 'text-chart-1',
    iconBgClass: 'bg-chart-1/20',
    badgeClass: 'bg-chart-1 text-white',
  },
  live: {
    icon: DollarSign,
    label: 'LIVE TRADING',
    description: 'Real trades from your journal',
    bgClass: 'bg-gradient-to-r from-gain/10 via-primary/10 to-gain/10',
    borderClass: 'border-gain/30',
    textClass: 'text-gain',
    iconBgClass: 'bg-gain/20',
    badgeClass: 'bg-gain text-white',
  },
  practice: {
    icon: Sparkles,
    label: 'PRACTICE MODE',
    description: 'Learn with pretend money — no real trades!',
    bgClass: 'bg-gradient-to-r from-gold/10 via-chart-3/10 to-gold/10',
    borderClass: 'border-gold/30',
    textClass: 'text-gold',
    iconBgClass: 'bg-gold/20',
    badgeClass: 'bg-gold text-gold-foreground',
  },
};

export function TradingModeBanner({ mode, className }: TradingModeBannerProps) {
  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border-2',
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className={cn('rounded-lg p-2', config.iconBgClass)}>
        <Icon className={cn('h-5 w-5', config.textClass)} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              config.badgeClass
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {config.description}
        </p>
      </div>
    </div>
  );
}
