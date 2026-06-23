import { TrendingUp, PiggyBank, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ReportsSummaryCardsProps {
  netCashFlow: number;
  savingsRate: number;
  budgetHealth: number;
}

const ReportsSummaryCards = ({ netCashFlow, savingsRate, budgetHealth }: ReportsSummaryCardsProps) => {
  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/90 to-emerald-600 border-0 p-3 text-center text-white shadow-lg">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-100" />
          <p className="text-xs text-emerald-100/80">Net Cash Flow</p>
          <p className="text-lg font-bold">
            ${netCashFlow >= 0 ? '+' : ''}{netCashFlow.toLocaleString()}
          </p>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/90 to-blue-600 border-0 p-3 text-center text-white shadow-lg">
          <PiggyBank className="w-5 h-5 mx-auto mb-1 text-blue-100" />
          <p className="text-xs text-blue-100/80">Savings Rate</p>
          <p className="text-lg font-bold">{savingsRate}%</p>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/90 to-amber-600 border-0 p-3 text-center text-white shadow-lg">
          <Target className="w-5 h-5 mx-auto mb-1 text-amber-100" />
          <p className="text-xs text-amber-100/80">Budget Health</p>
          <p className="text-lg font-bold">{budgetHealth}%</p>
        </Card>
      </div>
    </div>
  );
};

export default ReportsSummaryCards;
