import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isAfter, isBefore, addDays } from "date-fns";

interface CoachInsight {
  emoji: string;
  message: string;
  cta: string;
  prompt: string;
}

const FALLBACK_INSIGHT: CoachInsight = {
  emoji: "🚀",
  message: "I'm ready when you are. Let's map out your next move.",
  cta: "Let's get started",
  prompt: "Help me create a plan to improve my financial health",
};

export function useCoachInsight() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<CoachInsight>(FALLBACK_INSIGHT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchInsight = async () => {
      try {
        const today = new Date();
        const nextWeek = addDays(today, 7);
        const startOfMonth = format(today, "yyyy-MM-01");

        const [billsRes, budgetsRes, debtsRes, goalsRes] = await Promise.all([
          supabase
            .from("bills")
            .select("id, name, amount, due_date")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .lte("due_date", format(nextWeek, "yyyy-MM-dd"))
            .gte("due_date", format(today, "yyyy-MM-dd"))
            .order("due_date", { ascending: true }),
          supabase
            .from("budgets")
            .select("name, amount, spent")
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase
            .from("debts")
            .select("id, name, current_balance, minimum_payment")
            .eq("user_id", user.id)
            .eq("status", "active"),
          supabase
            .from("goals")
            .select("id, title, target_amount, current_amount")
            .eq("user_id", user.id)
            .eq("is_archived", false),
        ]);

        const bills = billsRes.data || [];
        const budgets = budgetsRes.data || [];
        const debts = debtsRes.data || [];
        const goals = goalsRes.data || [];

        // Priority 1: Upcoming bills this week
        if (bills.length > 0) {
          const totalDue = bills.reduce((s, b) => s + (b.amount || 0), 0);
          setInsight({
            emoji: "📋",
            message: `I've flagged ${bills.length} bill${bills.length > 1 ? "s" : ""} due this week — $${totalDue.toLocaleString()} total. Let's make sure nothing slips.`,
            cta: "Review my bills",
            prompt: `I have ${bills.length} bills due this week totaling $${totalDue}. Can you review them and help me prioritize?`,
          });
          return;
        }

        // Priority 2: Budget over 80%
        const overBudget = budgets.find(
          (b) => b.amount > 0 && b.spent / b.amount >= 0.8
        );
        if (overBudget) {
          const pct = Math.round((overBudget.spent / overBudget.amount) * 100);
          setInsight({
            emoji: "📊",
            message: `Your ${overBudget.name} budget is at ${pct}% — I have a few strategies to keep you on track.`,
            cta: "Show me strategies",
            prompt: `My ${overBudget.name} budget is at ${pct}% spent ($${overBudget.spent} of $${overBudget.amount}). Can you give me tips to stay within budget?`,
          });
          return;
        }

        // Priority 3: Active debts
        if (debts.length > 0) {
          const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
          setInsight({
            emoji: "💳",
            message: `I'm tracking $${totalDebt.toLocaleString()} across ${debts.length} account${debts.length > 1 ? "s" : ""}. Let's build your payoff roadmap.`,
            cta: "Plan my payoff",
            prompt: `I have $${totalDebt.toLocaleString()} in debt across ${debts.length} accounts. Can you help me create a payoff strategy?`,
          });
          return;
        }

        // Priority 4: Goals progress
        if (goals.length > 0) {
          const closestGoal = goals.reduce((closest, g) => {
            const progress = (g.current_amount || 0) / (g.target_amount || 1);
            const closestProgress =
              (closest.current_amount || 0) / (closest.target_amount || 1);
            return progress > closestProgress ? g : closest;
          }, goals[0]);
          const pct = Math.round(
            ((closestGoal.current_amount || 0) / (closestGoal.target_amount || 1)) * 100
          );
          setInsight({
            emoji: "🎯",
            message: `"${closestGoal.title}" is ${pct}% funded. I can help you accelerate this.`,
            cta: "Boost my savings",
            prompt: `My goal "${closestGoal.title}" is ${pct}% funded ($${closestGoal.current_amount || 0} of $${closestGoal.target_amount}). How can I reach it faster?`,
          });
          return;
        }

        // Fallback
        setInsight(FALLBACK_INSIGHT);
      } catch (err) {
        console.error("Failed to fetch coach insight:", err);
        setInsight(FALLBACK_INSIGHT);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsight();
  }, [user]);

  return { insight, isLoading };
}
