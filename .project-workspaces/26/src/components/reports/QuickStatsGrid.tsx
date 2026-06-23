import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickStatsGridProps {
  income: number;
  expenses: number;
  savingsRate: number;
  goalsProgress: number;
  selectedDate?: Date;
  hasDataForPeriod?: boolean;
}

const QuickStatsGrid = ({ income, expenses, savingsRate, goalsProgress, selectedDate, hasDataForPeriod = true }: QuickStatsGridProps) => {
  const net = income - expenses;
  const hasNoData = income === 0 && expenses === 0;
  
  const stats = [
    {
      label: "Income",
      value: income,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Expenses",
      value: expenses,
      icon: TrendingDown,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      label: "Net",
      value: net,
      icon: DollarSign,
      color: net >= 0 ? "text-emerald-600" : "text-rose-600",
      bgColor: net >= 0 ? "bg-emerald-50" : "bg-rose-50",
    },
    {
      label: "Savings Rate",
      value: savingsRate,
      icon: PiggyBank,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      isPercentage: true,
    },
    {
      label: "Goals",
      value: goalsProgress,
      icon: Target,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      isPercentage: true,
    },
  ];

  // Show empty state for periods with no transaction data
  if (hasNoData && !hasDataForPeriod) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
        <Card className="p-6 bg-muted/30 border-dashed">
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No transaction data for this period
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add transactions to see your stats
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className={`p-4 ${stat.bgColor} border-0`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>
              {stat.isPercentage 
                ? `${stat.value}%`
                : `$${Math.abs(stat.value).toLocaleString()}`
              }
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuickStatsGrid;
