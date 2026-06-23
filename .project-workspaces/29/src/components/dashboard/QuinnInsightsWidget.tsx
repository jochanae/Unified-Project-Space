import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Sparkles, Lightbulb, TrendingUp, PiggyBank, ShieldCheck, Target } from "lucide-react";

interface TradeStats {
  totalTrades: number;
  winRate: number;
  openTrades: number;
  totalProfitLoss: number;
}

interface QuinnInsightsWidgetProps {
  stats: TradeStats;
}

// Holistic money tips that rotate — covering budgeting, savings, insurance, retirement, and trading
const moneyTips = [
  {
    text: "Pay yourself first — even $25/month into savings builds powerful habits over time.",
    icon: PiggyBank,
    color: "from-chart-3/5 to-transparent",
    border: "border-chart-3/10",
  },
  {
    text: "Do you have 3–6 months of expenses saved? An emergency fund is your financial foundation.",
    icon: ShieldCheck,
    color: "from-primary/5 to-transparent",
    border: "border-primary/10",
  },
  {
    text: "Start retirement contributions early — compound interest is your greatest ally.",
    icon: Target,
    color: "from-gold/5 to-transparent",
    border: "border-gold/10",
  },
  {
    text: "Review your insurance coverage annually. Life changes mean your protection needs change too.",
    icon: ShieldCheck,
    color: "from-chart-5/5 to-transparent",
    border: "border-chart-5/10",
  },
  {
    text: "Track your spending for one week — awareness is the first step to financial control.",
    icon: Lightbulb,
    color: "from-primary/5 to-transparent",
    border: "border-primary/10",
  },
  {
    text: "Diversify beyond stocks: bonds, real estate, and insurance products can stabilize your wealth.",
    icon: TrendingUp,
    color: "from-gain/5 to-transparent",
    border: "border-gain/10",
  },
];

// Pick a consistent daily tip based on the date
function getDailyTip() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return moneyTips[dayOfYear % moneyTips.length];
}

export function QuinnInsightsWidget({ stats }: QuinnInsightsWidgetProps) {
  const dailyTip = getDailyTip();
  const DailyIcon = dailyTip.icon;

  return (
    <CollapsibleCard
      title="Quinn's Insights"
      description="Smart tips for your money journey"
      icon={<Sparkles className="h-5 w-5 text-gold" />}
      storageKey="dashboard-quinn-insights"
    >
      <div className="space-y-3">
        {/* Daily holistic money tip — always shown */}
        <div className={`p-3 rounded-lg bg-gradient-to-r ${dailyTip.color} border ${dailyTip.border}`}>
          <div className="flex items-start gap-2">
            <DailyIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-sm">{dailyTip.text}</p>
          </div>
        </div>

        {/* Trading-specific insights — only when user has trade data */}
        {stats.totalTrades === 0 ? (
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
            <p className="text-sm">
              Ask Quinn about budgeting, retirement, insurance, or log your first trade to unlock trading insights.
            </p>
          </div>
        ) : (
          <>
            {stats.winRate >= 50 && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-gain/5 to-transparent border border-gain/10">
                <p className="text-sm">
                  Your win rate of {stats.winRate.toFixed(0)}% is above average — great discipline!
                </p>
              </div>
            )}
            {stats.winRate < 50 && stats.totalTrades > 0 && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-gold/5 to-transparent border border-gold/10">
                <p className="text-sm">
                  Your win rate is {stats.winRate.toFixed(0)}%. Ask Quinn for strategy ideas or journal more details.
                </p>
              </div>
            )}
            {stats.openTrades > 0 && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                <p className="text-sm">
                  You have {stats.openTrades} open position{stats.openTrades > 1 ? 's' : ''}. Remember to set exit targets!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </CollapsibleCard>
  );
}
