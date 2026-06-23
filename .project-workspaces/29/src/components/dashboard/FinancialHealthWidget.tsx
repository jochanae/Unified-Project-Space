import { Link } from 'react-router-dom';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Heart, Landmark, PiggyBank, ShieldCheck, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WELLNESS_TOPICS = [
  {
    icon: Landmark,
    label: 'Retirement',
    description: 'Plan your future',
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    prompt: 'Tell me about retirement planning. What should I know about 401(k)s, IRAs, and building a retirement strategy?',
  },
  {
    icon: PiggyBank,
    label: 'Budget & Save',
    description: 'Build your safety net',
    color: 'text-gain',
    bgColor: 'bg-gain/10',
    prompt: 'Help me create a budgeting and savings plan. How do I build an emergency fund and manage my spending?',
  },
  {
    icon: ShieldCheck,
    label: 'Insurance',
    description: 'Protect your wealth',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    prompt: 'What types of insurance should I have to protect my wealth? Tell me about life, health, disability, and property insurance.',
  },
  {
    icon: TrendingUp,
    label: 'Investing',
    description: 'Grow your money',
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    prompt: 'I want to learn about investing. What are the basics of stocks, bonds, ETFs, and building a diversified portfolio?',
  },
];

export function FinancialHealthWidget() {
  return (
    <CollapsibleCard
      title="Financial Wellness"
      description="Explore your complete financial picture"
      icon={<Heart className="h-4 w-4 text-loss" />}
      defaultOpen={true}
      storageKey="financial-health-expanded"
    >
      <div className="space-y-2">
        {WELLNESS_TOPICS.map((topic) => (
          <Link
            key={topic.label}
            to="/mentor"
            state={{ prompt: topic.prompt }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              'hover:bg-muted/60 transition-colors group cursor-pointer'
            )}
          >
            <div className={cn('rounded-lg p-2', topic.bgColor)}>
              <topic.icon className={cn('h-4 w-4', topic.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                {topic.label}
              </p>
              <p className="text-xs text-muted-foreground">{topic.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </Link>
        ))}
        
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center py-1">
            💡 Ask Quinn about any financial topic
          </p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
