import { TrendingUp, TrendingDown, Wallet, ArrowUpDown, Target, PiggyBank, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { FinancialData } from "@/hooks/useDashboardFinancials";

type KPIType = "networth" | "cashflow" | "budget" | "savings";

interface DashboardKPIRowProps {
  data: FinancialData;
  formatCurrency: (n: number) => string;
  activeKPI?: KPIType | null;
  onKPISelect?: (kpi: KPIType) => void;
}

export function DashboardKPIRow({ data, formatCurrency, activeKPI, onKPISelect }: DashboardKPIRowProps) {
  const kpis: {
    id: KPIType;
    label: string;
    value: string;
    change?: number;
    changeLabel?: string;
    subtitle?: string;
    icon: typeof Wallet;
    iconColor: string;
    iconBg: string;
    accentColor: string;
    valueColor?: string;
  }[] = [
    {
      id: "networth",
      label: "Net Worth",
      value: formatCurrency(data.networth.amount),
      change: data.networth.change,
      changeLabel: formatCurrency(Math.abs(data.networth.change)),
      icon: Wallet,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      accentColor: "hsl(160, 60%, 45%)",
    },
    {
      id: "cashflow",
      label: "Cash Flow",
      value: `${data.cashflow.net >= 0 ? '+' : ''}${formatCurrency(data.cashflow.net)}`,
      subtitle: `${formatCurrency(data.cashflow.income)} in · ${formatCurrency(data.cashflow.expenses)} out`,
      icon: ArrowUpDown,
      iconColor: data.cashflow.net >= 0 ? "text-blue-500" : "text-red-500",
      iconBg: data.cashflow.net >= 0 ? "bg-blue-500/10 dark:bg-blue-500/20" : "bg-red-500/10 dark:bg-red-500/20",
      accentColor: "hsl(220, 70%, 55%)",
      valueColor: data.cashflow.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
    },
    {
      id: "budget",
      label: "Budget Health",
      value: data.budget.total > 0 ? `${data.budget.healthPercent}%` : "—",
      subtitle: data.budget.total > 0 ? `${formatCurrency(data.budget.remaining)} left` : "No budgets",
      icon: Target,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
      accentColor: "hsl(45, 80%, 50%)",
      valueColor: data.budget.healthPercent > 50 ? "text-emerald-600 dark:text-emerald-400" : data.budget.healthPercent > 20 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400",
    },
    {
      id: "savings",
      label: "Savings Rate",
      value: `${data.savingsRate}%`,
      subtitle: data.savingsRate > 0 ? "of income saved" : "No data yet",
      icon: PiggyBank,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
      accentColor: "hsl(270, 60%, 55%)",
      valueColor: data.savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : data.savingsRate > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const isActive = activeKPI === kpi.id;
        return (
          <Card
            key={kpi.label}
            className="py-4 pl-7 pr-4 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl hover:shadow-md transition-all cursor-pointer group border-l-[3px]"
            style={{ borderLeftColor: kpi.accentColor }}
            onClick={() => onKPISelect?.(kpi.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
                  {data.isFutureMonth && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Projected
                    </span>
                  )}
                </div>
              </div>
              {/* Color-coded expand circle */}
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                style={{ backgroundColor: `${kpi.accentColor}20`, border: `1.5px solid ${kpi.accentColor}` }}
              >
                <ChevronUp
                  className="h-3 w-3 transition-transform"
                  style={{
                    color: kpi.accentColor,
                    transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </div>
            </div>
            <p className={`text-xl font-bold ${kpi.valueColor || 'text-foreground'}`}>
              {kpi.value}
            </p>
            {kpi.change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${kpi.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{kpi.change >= 0 ? '+' : '-'}{kpi.changeLabel} this month</span>
              </div>
            )}
            {kpi.subtitle && !kpi.change && (
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
