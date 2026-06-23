import { Button } from '@/components/ui/button';
import { Target, Sparkles, Lightbulb, Shield, TrendingUp } from 'lucide-react';

interface PlanEmptyStateProps {
  onAskQuinn: () => void;
}

export function PlanEmptyState({ onAskQuinn }: PlanEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-chart-3/20 to-primary/20 flex items-center justify-center">
          <Target className="h-10 w-10 text-chart-3" />
        </div>
        <div className="absolute -right-2 -top-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-2">Your Plan Starts Here</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        This is where you'll track actionable steps toward your financial goals.
        Quinn can help you discover what matters most.
      </p>

      <Button onClick={onAskQuinn} className="gap-2 mb-8">
        <Sparkles className="h-4 w-4" />
        Ask Quinn to help me get started
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        <div className="flex flex-col items-center p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <Shield className="h-6 w-6 text-emerald-500 mb-2" />
          <span className="text-sm font-medium">Foundations</span>
          <span className="text-xs text-muted-foreground">Security first</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <TrendingUp className="h-6 w-6 text-blue-500 mb-2" />
          <span className="text-sm font-medium">Wealth Building</span>
          <span className="text-xs text-muted-foreground">Grow over time</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <Lightbulb className="h-6 w-6 text-purple-500 mb-2" />
          <span className="text-sm font-medium">Active Investing</span>
          <span className="text-xs text-muted-foreground">Trade smarter</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 max-w-sm">
        As you chat with Quinn, actionable items will appear here.
        <br />
        You're always in control of what gets added.
      </p>
    </div>
  );
}
