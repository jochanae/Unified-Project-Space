import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
}

interface BudgetInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
}

interface Insight {
  type: "warning" | "success" | "tip" | "info";
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function BudgetInsightsModal({ open, onOpenChange, budgets }: BudgetInsightsModalProps) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      generateInsights();
    }
  }, [open, budgets]);

  const generateInsights = async () => {
    setLoading(true);
    const generatedInsights: Insight[] = [];

    // Calculate totals
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Overspending warnings
    const overBudget = budgets.filter(b => b.spent > b.amount);
    if (overBudget.length > 0) {
      generatedInsights.push({
        type: "warning",
        title: `${overBudget.length} budget${overBudget.length > 1 ? 's' : ''} over limit`,
        description: `${overBudget.map(b => b.name).join(", ")} ${overBudget.length > 1 ? 'have' : 'has'} exceeded the allocated amount. Consider adjusting or reducing spending.`,
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      });
    }

    // High spending alert (75-100%)
    const highSpending = budgets.filter(b => {
      const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
      return percent >= 75 && percent <= 100;
    });
    if (highSpending.length > 0) {
      generatedInsights.push({
        type: "warning",
        title: "Approaching budget limits",
        description: `${highSpending.map(b => b.name).join(", ")} ${highSpending.length > 1 ? 'are' : 'is'} at 75% or more. Monitor closely to avoid overspending.`,
        icon: <TrendingUp className="h-5 w-5 text-yellow-500" />,
      });
    }

    // Under budget success
    const underBudget = budgets.filter(b => {
      const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
      return percent < 50 && b.spent > 0;
    });
    if (underBudget.length > 0) {
      generatedInsights.push({
        type: "success",
        title: "Great budget management!",
        description: `${underBudget.map(b => b.name).join(", ")} ${underBudget.length > 1 ? 'are' : 'is'} under 50% spent. Keep up the good work!`,
        icon: <TrendingDown className="h-5 w-5 text-green-500" />,
      });
    }

    // Overall status
    if (overallPercent < 50) {
      generatedInsights.push({
        type: "success",
        title: "On track this month",
        description: `You've only spent ${overallPercent.toFixed(0)}% of your total budget. You're in great shape!`,
        icon: <Sparkles className="h-5 w-5 text-emerald-500" />,
      });
    } else if (overallPercent > 90) {
      generatedInsights.push({
        type: "warning",
        title: "Budget nearly depleted",
        description: `You've spent ${overallPercent.toFixed(0)}% of your total budget this month. Be cautious with remaining expenses.`,
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      });
    }

    // Tips based on spending patterns
    const foodBudget = budgets.find(b => b.category === "food");
    if (foodBudget && foodBudget.spent > foodBudget.amount * 0.8) {
      generatedInsights.push({
        type: "tip",
        title: "Food spending tip",
        description: "Consider meal prepping or cooking at home more often to reduce food expenses.",
        icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      });
    }

    const entertainmentBudget = budgets.find(b => b.category === "entertainment");
    if (entertainmentBudget && entertainmentBudget.spent > entertainmentBudget.amount) {
      generatedInsights.push({
        type: "tip",
        title: "Entertainment savings",
        description: "Look for free local events or streaming services you might already have access to.",
        icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      });
    }

    // No budgets
    if (budgets.length === 0) {
      generatedInsights.push({
        type: "info",
        title: "Get started with budgets",
        description: "Create your first budget to start tracking spending and getting personalized insights.",
        icon: <Sparkles className="h-5 w-5 text-primary" />,
      });
    }

    // Savings opportunity
    const savingsBudget = budgets.find(b => b.category === "savings");
    if (!savingsBudget) {
      generatedInsights.push({
        type: "tip",
        title: "Add a savings budget",
        description: "Consider creating a dedicated savings budget. Experts recommend saving at least 20% of your income.",
        icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      });
    }

    setInsights(generatedInsights);
    setLoading(false);
  };

  const getCardColor = (type: Insight["type"]) => {
    switch (type) {
      case "warning": return "border-l-4 border-l-yellow-500 bg-yellow-500/5";
      case "success": return "border-l-4 border-l-green-500 bg-green-500/5";
      case "tip": return "border-l-4 border-l-blue-500 bg-blue-500/5";
      default: return "border-l-4 border-l-primary bg-primary/5";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Budget Insights
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No insights available yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add more budget data to get personalized insights
                </p>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight, index) => (
              <Card key={index} className={getCardColor(insight.type)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{insight.icon}</div>
                    <div>
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Button 
          onClick={generateInsights} 
          variant="outline" 
          className="w-full mt-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Insights
        </Button>
      </DialogContent>
    </Dialog>
  );
}
