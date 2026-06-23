import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SavingsGoalsProgressProps {
  currentSavings: number;
  targetSavings: number;
  monthlyContribution: number;
  monthsToGoal: number;
}

const SavingsGoalsProgress = ({ 
  currentSavings, 
  targetSavings, 
  monthlyContribution,
  monthsToGoal 
}: SavingsGoalsProgressProps) => {
  const progressPercent = targetSavings > 0 ? (currentSavings / targetSavings) * 100 : 0;

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Savings Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-semibold text-emerald-600">
                ${currentSavings.toLocaleString()}
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-semibold">
                ${targetSavings.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center p-2">
              <DollarSign className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="font-semibold text-sm">${monthlyContribution}</p>
            </div>
            <div className="text-center p-2">
              <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Months Left</p>
              <p className="font-semibold text-sm">{monthsToGoal}</p>
            </div>
            <div className="text-center p-2">
              <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="font-semibold text-sm">{progressPercent.toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SavingsGoalsProgress;
