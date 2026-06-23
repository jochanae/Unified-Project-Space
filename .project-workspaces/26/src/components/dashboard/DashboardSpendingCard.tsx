import { Card } from "@/components/ui/card";
import { FinancialSnapshotChart } from "./FinancialSnapshotChart";
import { Expand } from "lucide-react";
import type { ChartData } from "@/hooks/useDashboardFinancials";

interface DashboardSpendingCardProps {
  chartData: ChartData;
  income: number;
  expenses: number;
  formatCurrency: (n: number) => string;
  onExpand?: () => void;
}

export function DashboardSpendingCard({ chartData, income, expenses, formatCurrency, onExpand }: DashboardSpendingCardProps) {
  const ratio = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;
  
  return (
    <Card
      className="border border-border/50 bg-[#0f1419] text-white cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={onExpand}
    >
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/90">Spending Overview</h3>
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <Expand className="h-3 w-3 text-white/70" />
          </div>
        </div>
        
        {/* Compact chart */}
        <div className="min-h-48 lg:min-h-[36rem]">
          <FinancialSnapshotChart
            spendingByCategory={chartData.spendingByCategory}
            monthlyTrend={chartData.monthlyTrend}
            budgetVsActual={chartData.budgetVsActual}
          />
        </div>
      </div>

      {/* Income vs Expenses bar */}
      <div className="px-4 pb-4 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/70">Expenses</span>
          <span className="text-white/70">Income</span>
        </div>
        {/* Dual-segment bar */}
        <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
            style={{ width: `${ratio}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${100 - ratio}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="font-medium">{formatCurrency(expenses)}</span>
          <span className="font-medium">{formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-white/60">
          <span>Spent: {ratio.toFixed(0)}%</span>
          <span>Remaining: {(100 - ratio).toFixed(0)}%</span>
        </div>
      </div>
    </Card>
  );
}
