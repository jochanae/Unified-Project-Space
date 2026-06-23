import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Circle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanStatsProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

export function PlanStats({ stats }: PlanStatsProps) {
  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  // Determine health message
  const getHealthMessage = () => {
    if (stats.total === 0) return 'Add goals to get started';
    if (completionRate === 100) return 'All goals complete! Time to set new ones.';
    if (completionRate >= 75) return 'Almost there - strong progress!';
    if (stats.inProgress > 0) return `${stats.inProgress} goal${stats.inProgress > 1 ? 's' : ''} actively in progress`;
    return `${stats.notStarted} goal${stats.notStarted > 1 ? 's' : ''} waiting to be started`;
  };

  return (
    <Card className="p-4 sm:p-5 bg-card/50 border-border/50">
      {/* Progress overview */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Plan Progress</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{getHealthMessage()}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{completionRate}%</span>
        </div>
      </div>

      <Progress value={completionRate} className="h-2 mb-4" />

      {/* Stat pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatPill
          icon={CheckCircle2}
          label="Done"
          count={stats.completed}
          className="text-gain"
        />
        <StatPill
          icon={Clock}
          label="In Progress"
          count={stats.inProgress}
          className="text-blue-500"
        />
        <StatPill
          icon={Circle}
          label="Not Started"
          count={stats.notStarted}
          className="text-muted-foreground"
        />
        <StatPill
          icon={TrendingUp}
          label="Total"
          count={stats.total}
          className="text-foreground"
        />
      </div>
    </Card>
  );
}

function StatPill({
  icon: Icon,
  label,
  count,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={cn('h-3.5 w-3.5', className)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-semibold', className)}>{count}</span>
    </div>
  );
}
