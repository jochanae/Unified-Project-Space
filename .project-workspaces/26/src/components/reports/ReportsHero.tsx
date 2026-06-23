import { TrendingUp, PiggyBank, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ReportsHeroProps {
  netCashFlow: number;
  savingsRate: number;
  budgetHealth: number;
}

const ReportsHero = ({ netCashFlow, savingsRate, budgetHealth }: ReportsHeroProps) => {
  return (
    <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-6 rounded-b-3xl">
      <h1 className="text-2xl font-bold mb-2">Reports & Analytics</h1>
      <p className="text-primary-foreground/80 text-sm mb-6">
        Track your financial progress and trends
      </p>
      
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white/20 backdrop-blur-sm border-0 p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-300" />
          <p className="text-xs text-primary-foreground/70">Net Cash Flow</p>
          <p className="text-lg font-bold">
            ${netCashFlow >= 0 ? '+' : ''}{netCashFlow.toLocaleString()}
          </p>
        </Card>
        
        <Card className="bg-white/20 backdrop-blur-sm border-0 p-3 text-center">
          <PiggyBank className="w-5 h-5 mx-auto mb-1 text-blue-300" />
          <p className="text-xs text-primary-foreground/70">Savings Rate</p>
          <p className="text-lg font-bold">{savingsRate}%</p>
        </Card>
        
        <Card className="bg-white/20 backdrop-blur-sm border-0 p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-amber-300" />
          <p className="text-xs text-primary-foreground/70">Budget Health</p>
          <p className="text-lg font-bold">{budgetHealth}%</p>
        </Card>
      </div>
    </div>
  );
};

export default ReportsHero;
