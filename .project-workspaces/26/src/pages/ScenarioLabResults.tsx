import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Clock, TrendingUp, BarChart3, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScenarioData {
  category: string;
  upgradeCost: number;
  currentMonthly: number;
  projectedMonthly: number;
  brokerageReturn: number;
}

export default function ScenarioLabResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [phase, setPhase] = useState(0); // controls sequential reveal

  const data = location.state as ScenarioData | null;

  useEffect(() => {
    if (!data) {
      navigate("/scenario-lab", { replace: true });
      return;
    }
    // Sequential reveal: each card appears after a delay
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 1900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [data, navigate]);

  if (!data) return null;

  const { upgradeCost: cost, currentMonthly: current, projectedMonthly: projected, brokerageReturn, category } = data;
  const monthlySavings = current - projected;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(cost / monthlySavings) : 0;
  const annualSavings = monthlySavings * 12;
  const projectionYears = 5;
  const totalSavings5yr = monthlySavings * 12 * projectionYears;
  const netGain5yr = totalSavings5yr - cost;
  const annualReturn = brokerageReturn / 100;
  const investmentGrowth5yr = cost * Math.pow(1 + annualReturn, projectionYears) - cost;
  const upgradeNetValue = netGain5yr;
  const investmentNetValue = investmentGrowth5yr;
  const upgradeWins = upgradeNetValue > investmentNetValue;

  const formatCurrency = (n: number) =>
    n < 0
      ? `-$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const handleFinalizeStrategy = async () => {
    if (!user) {
      toast.error("Please sign in to create a goal");
      return;
    }
    setCreatingGoal(true);
    try {
      const goalTitle = `${category} — Monthly Savings Redirect`;
      const { data: goalData, error } = await supabase
        .from("goals")
        .insert({
          title: goalTitle,
          description: `Redirect $${monthlySavings.toLocaleString()}/mo savings from ${category} upgrade into investments. Break-even: ${breakEvenMonths} months. 5-year net gain: $${netGain5yr.toLocaleString()}.`,
          target_amount: totalSavings5yr,
          goal_type: "individual",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("goal_activity").insert({
        goal_id: goalData.id,
        user_id: user.id,
        activity_type: "goal_created",
        description: `Created savings redirect goal from Scenario Lab: "${goalTitle}"`,
      });

      toast.success("Strategy committed. Goal created.", {
        action: {
          label: "View Goal",
          onClick: () => navigate(`/goals/${goalData.id}`),
        },
      });
    } catch (err) {
      console.error("Failed to create goal:", err);
      toast.error("Failed to create goal");
    } finally {
      setCreatingGoal(false);
    }
  };

  const cardBase =
    "rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 transition-all duration-700";
  const cardHidden = "opacity-0 translate-y-8";
  const cardVisible = "opacity-100 translate-y-0";

  return (
    <div className="min-h-[100dvh] bg-[hsl(240,20%,7%)] text-white relative overflow-hidden">
      <Helmet>
        <title>Analysis Results | Scenario Lab | CoinsBloom</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-emerald-500/[0.06] blur-[100px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-violet-500/[0.04] blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Frosted shimmer loading overlay */}
      <div
        className={`fixed inset-0 z-50 bg-[hsl(240,20%,7%)] flex items-center justify-center transition-opacity duration-700 ${
          phase >= 1 ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
          <p className="text-sm text-white/50 tracking-widest uppercase">Calculating Projections</p>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[hsl(240,20%,7%)]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-5 py-4">
          <button
            onClick={() => navigate("/scenario-lab")}
            className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Edit Parameters</span>
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400/60" />
            <span className="text-xs text-white/30 uppercase tracking-widest">Visual Vault</span>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-5 py-8 space-y-6">
        {/* Title */}
        <div className={`transition-all duration-700 ${phase >= 1 ? cardVisible : cardHidden}`}>
          <p className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] mb-2">Scenario Analysis</p>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">{category}</h1>
          <p className="text-sm text-white/40 mt-1">
            {formatCurrency(cost)} investment · {formatCurrency(monthlySavings)}/mo projected savings
          </p>
        </div>

        {/* Card 1: Break-even Timeline */}
        <div className={`${cardBase} ${phase >= 2 ? cardVisible : cardHidden}`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Break-even Timeline</h2>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-5xl font-bold text-white tabular-nums">{breakEvenMonths}</span>
            <span className="text-lg text-white/40">months</span>
          </div>
          <Progress value={Math.min((12 / breakEvenMonths) * 100, 100)} className="h-1.5 bg-white/[0.06] [&>div]:bg-emerald-500" />
          <p className="text-sm text-white/40 mt-3">
            At {formatCurrency(monthlySavings)}/mo, the full {formatCurrency(cost)} is recovered in{" "}
            {breakEvenMonths < 12
              ? `${breakEvenMonths} months`
              : `${(breakEvenMonths / 12).toFixed(1)} years`}.
            Every dollar saved after that is pure gain.
          </p>
        </div>

        {/* Card 2: 5-Year Projection */}
        <div className={`${cardBase} ${phase >= 3 ? cardVisible : cardHidden}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">5-Year Savings Projection</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 5].map((year) => {
              const cumSavings = monthlySavings * 12 * year;
              const net = cumSavings - cost;
              return (
                <div key={year} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-white/40 font-medium">Year {year}</p>
                  <p className="text-xl font-bold text-white mt-1">{formatCurrency(cumSavings)}</p>
                  <p className={`text-xs font-semibold mt-1 ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    Net: {formatCurrency(net)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Opportunity Cost */}
        <div className={`${cardBase} ${phase >= 4 ? cardVisible : cardHidden}`}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Opportunity Cost</h2>
          </div>
          <p className="text-xs text-white/30 mb-5">
            Upgrade vs. investing {formatCurrency(cost)} at {brokerageReturn}% annual return
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className={`p-5 rounded-xl border-2 transition-colors ${
              upgradeWins ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2">Upgrade</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(upgradeNetValue)}</p>
              <p className="text-xs text-white/30 mt-1">5-year net value</p>
              {upgradeWins && (
                <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  Superior Return
                </span>
              )}
            </div>
            <div className={`p-5 rounded-xl border-2 transition-colors ${
              !upgradeWins ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2">Keep Invested</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(investmentNetValue)}</p>
              <p className="text-xs text-white/30 mt-1">5-year growth</p>
              {!upgradeWins && (
                <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  Superior Return
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/50 leading-relaxed">
            {upgradeWins ? (
              <>
                The upgrade yields{" "}
                <span className="font-semibold text-emerald-400">{formatCurrency(upgradeNetValue - investmentNetValue)}</span>{" "}
                more than keeping {formatCurrency(cost)} invested over 5 years. The effective annual return is{" "}
                <span className="font-semibold text-emerald-400">{((annualSavings / cost) * 100).toFixed(0)}%</span> — significantly above market returns.
              </>
            ) : (
              <>
                Keeping the capital invested outperforms the upgrade by{" "}
                <span className="font-semibold text-emerald-400">{formatCurrency(investmentNetValue - upgradeNetValue)}</span>{" "}
                over 5 years. Consider delaying the upgrade or finding financing that preserves your invested capital.
              </>
            )}
          </div>
        </div>

        {/* Commit to Strategy */}
        <div className={`${cardBase} border-emerald-500/20 transition-all duration-700 ${phase >= 4 ? cardVisible : cardHidden}`} style={{ transitionDelay: "200ms" }}>
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
              <Target className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-white">Commit to Strategy</h3>
                <p className="text-sm text-white/40 mt-1">
                  Lock in this upgrade. A savings goal of {formatCurrency(monthlySavings)}/mo will be created
                  to redirect the freed-up cash into your investment pipeline.
                </p>
              </div>
              <Button
                onClick={handleFinalizeStrategy}
                disabled={creatingGoal}
                variant="ghost"
                className="w-full border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                {creatingGoal ? "Creating Goal..." : "Commit to Strategy"}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom spacer for mobile nav */}
        <div className="h-20" />
      </div>
    </div>
  );
}
