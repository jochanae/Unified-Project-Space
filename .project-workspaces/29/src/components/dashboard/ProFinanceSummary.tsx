import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Wallet, TrendingUp, PiggyBank, Receipt, ArrowRight } from "lucide-react";
import { useFinances } from "@/hooks/useFinances";
import { useNetWorth } from "@/hooks/useNetWorth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface MiniStatProps {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  iconBg: string;
}

function MiniStat({ icon: Icon, label, value, accent, iconBg }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-border/20">
      <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg shrink-0", iconBg)}>
        <Icon className={cn("h-5 w-5", accent)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn("text-lg font-bold tracking-tight", accent)}>{value}</p>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ProFinanceSummary() {
  const { summary, savingsGoals, isLoading: finLoading } = useFinances();
  const { items, summary: nwSummary, isLoading: nwLoading } = useNetWorth(summary.totalSaved);

  const isLoading = finLoading || nwLoading;

  // Savings progress percentage
  const totalTarget = savingsGoals
    .filter((g) => g.status === "active")
    .reduce((sum, g) => sum + Number(g.target_amount), 0);
  const savingsPct = totalTarget > 0 ? Math.round((summary.totalSaved / totalTarget) * 100) : 0;

  // Budget remaining (income minus expenses this month)
  const budgetRemaining = summary.totalIncome - summary.totalExpenses;

  // Available to invest = cash flow surplus + liquid assets (cash & savings from net worth)
  const liquidAssets = items
    .filter((i) => i.type === "asset" && i.category === "cash_savings")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const availableToInvest = summary.availableToInvest + liquidAssets + summary.totalSaved;

  const stats: MiniStatProps[] = [
    {
      icon: Wallet,
      label: "Available to Invest",
      value: formatCurrency(availableToInvest),
      accent: availableToInvest > 0 ? "text-gain" : "text-muted-foreground",
      iconBg: availableToInvest > 0 ? "bg-gain/15" : "bg-muted",
    },
    {
      icon: TrendingUp,
      label: "Net Worth",
      value: formatCurrency(nwSummary.netWorth),
      accent: nwSummary.netWorth >= 0 ? "text-chart-3" : "text-loss",
      iconBg: nwSummary.netWorth >= 0 ? "bg-chart-3/15" : "bg-loss/15",
    },
    {
      icon: Receipt,
      label: "Budget Remaining",
      value: `${budgetRemaining >= 0 ? "" : "-"}${formatCurrency(Math.abs(budgetRemaining))}`,
      accent: budgetRemaining >= 0 ? "text-gold" : "text-loss",
      iconBg: budgetRemaining >= 0 ? "bg-gold/15" : "bg-loss/15",
    },
    {
      icon: PiggyBank,
      label: "Savings Progress",
      value: totalTarget > 0 ? `${savingsPct}%` : "—",
      accent: "text-chart-5",
      iconBg: "bg-chart-5/15",
    },
  ];

  return (
    <Card className="relative overflow-hidden border-gold/30 bg-gradient-to-br from-card via-card to-gold/5 shadow-[0_0_30px_-10px_hsl(var(--gold)/0.15)]">
      {/* Subtle gold shimmer accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-gold to-gold/70">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Monthly snapshot</span>
          </div>
          <Link
            to="/my-finances"
            className="flex items-center gap-1 text-xs font-medium text-gold hover:text-gold/80 transition-colors group"
          >
            View all
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {stats.map((stat) => (
              <MiniStat key={stat.label} {...stat} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
