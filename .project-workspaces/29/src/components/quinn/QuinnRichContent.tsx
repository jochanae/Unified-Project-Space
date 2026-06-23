import { ExternalLink, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceCitation {
  url: string;
  title?: string;
}

interface QuinnSourcesProps {
  citations: string[];
}

export function QuinnSources({ citations }: QuinnSourcesProps) {
  if (!citations || citations.length === 0) return null;

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <BookOpen className="h-3 w-3" />
        <span>Sources</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {citations.slice(0, 5).map((url, index) => (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {getDomain(url)}
          </a>
        ))}
      </div>
    </div>
  );
}

interface QuinnStepCardProps {
  step: number;
  title: string;
  description: string;
  status?: 'pending' | 'active' | 'complete';
}

export function QuinnStepCard({ step, title, description, status = 'pending' }: QuinnStepCardProps) {
  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg border transition-colors",
      status === 'complete' && "bg-gain/10 border-gain/30",
      status === 'active' && "bg-primary/10 border-primary/30",
      status === 'pending' && "bg-muted/30 border-border/50"
    )}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        status === 'complete' && "bg-gain text-white",
        status === 'active' && "bg-primary text-primary-foreground",
        status === 'pending' && "bg-muted text-muted-foreground"
      )}>
        {status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

interface QuinnComparisonRow {
  label: string;
  optionA: string;
  optionB: string;
  highlight?: 'a' | 'b' | 'none';
}

interface QuinnComparisonTableProps {
  title?: string;
  optionAName: string;
  optionBName: string;
  rows: QuinnComparisonRow[];
}

export function QuinnComparisonTable({ title, optionAName, optionBName, rows }: QuinnComparisonTableProps) {
  return (
    <div className="my-3 rounded-lg border border-border/50 overflow-hidden">
      {title && (
        <div className="px-3 py-2 bg-muted/50 border-b border-border/50">
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Feature</th>
            <th className="px-3 py-2 text-center font-medium">{optionAName}</th>
            <th className="px-3 py-2 text-center font-medium">{optionBName}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border/30 last:border-0">
              <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
              <td className={cn(
                "px-3 py-2 text-center",
                row.highlight === 'a' && "bg-gain/10 text-gain font-medium"
              )}>
                {row.optionA}
              </td>
              <td className={cn(
                "px-3 py-2 text-center",
                row.highlight === 'b' && "bg-gain/10 text-gain font-medium"
              )}>
                {row.optionB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface QuinnMarketCardProps {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
}

export function QuinnMarketCard({ symbol, price, change, changePercent, high, low }: QuinnMarketCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="my-3 p-3 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{symbol}</h4>
          <p className="text-2xl font-bold">${price.toFixed(2)}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
          isPositive ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
        )}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </div>
      </div>
      {(high !== undefined && low !== undefined) && (
        <div className="mt-2 pt-2 border-t border-border/30 flex gap-4 text-xs text-muted-foreground">
          <span>High: ${high.toFixed(2)}</span>
          <span>Low: ${low.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

interface QuinnAlertBoxProps {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

export function QuinnAlertBox({ type, title, message }: QuinnAlertBoxProps) {
  const config = {
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-amber-500/10 border-amber-500/30',
      iconClass: 'text-amber-500',
    },
    info: {
      icon: Info,
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      iconClass: 'text-blue-500',
    },
    success: {
      icon: CheckCircle2,
      bgClass: 'bg-gain/10 border-gain/30',
      iconClass: 'text-gain',
    },
  };

  const { icon: Icon, bgClass, iconClass } = config[type];

  return (
    <div className={cn("my-3 p-3 rounded-lg border flex gap-3", bgClass)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconClass)} />
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
      </div>
    </div>
  );
}

interface QuinnMentorshipExerciseProps {
  question: string;
  options?: string[];
  context?: string;
}

export function QuinnMentorshipExercise({ question, options, context }: QuinnMentorshipExerciseProps) {
  return (
    <div className="my-3 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 text-primary mb-2">
        <BookOpen className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">Interactive Exercise</span>
      </div>
      {context && (
        <p className="text-sm text-muted-foreground mb-2">{context}</p>
      )}
      <p className="font-medium">{question}</p>
      {options && options.length > 0 && (
        <div className="mt-2 space-y-1">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
