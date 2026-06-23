import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import {
  Map, Target, CheckCircle2, Circle, Clock,
  Sparkles, Pause, Play, Trash2, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

interface PlanAction {
  id: string;
  title: string;
  description: string;
  amount: number;
  frequency: string;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
}

interface PlanMilestone {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
  order_index: number;
  actions: PlanAction[];
}

interface FinancialPlan {
  id: string;
  title: string;
  description: string;
  plan_type: string;
  status: string;
  priority: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  milestones: PlanMilestone[];
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  debt_payoff: "Debt Payoff",
  savings: "Savings",
  investment: "Investment",
  retirement: "Retirement",
  emergency_fund: "Emergency Fund",
  budget_overhaul: "Budget Overhaul",
  credit_repair: "Credit Repair",
  custom: "Custom",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-yellow-500/10 text-yellow-700",
  low: "bg-muted text-muted-foreground",
};

export default function FinancialPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "paused" | "all">("active");

  const fetchPlans = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("bloom_financial_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data: planData, error } = await query;
      if (error) throw error;
      if (!planData || planData.length === 0) {
        setPlans([]);
        setIsLoading(false);
        return;
      }

      const planIds = planData.map(p => p.id);

      const [msRes, actRes] = await Promise.all([
        supabase.from("bloom_plan_milestones").select("*").in("plan_id", planIds).order("order_index"),
        supabase.from("bloom_plan_actions").select("*").in("plan_id", planIds).order("order_index"),
      ]);

      const milestones = msRes.data || [];
      const actions = actRes.data || [];

      const enriched: FinancialPlan[] = planData.map(p => ({
        ...p,
        milestones: milestones
          .filter(m => m.plan_id === p.id)
          .map(m => ({
            ...m,
            actions: actions.filter(a => a.milestone_id === m.id),
          })),
      }));

      setPlans(enriched);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      toast.error("Failed to load financial plans");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user, filter]);

  const toggleAction = async (actionId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from("bloom_plan_actions")
      .update({
        is_completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", actionId);

    if (error) {
      toast.error("Failed to update action");
      return;
    }
    fetchPlans();
  };

  const updatePlanStatus = async (planId: string, status: string) => {
    const { error } = await supabase
      .from("bloom_financial_plans")
      .update({ status })
      .eq("id", planId);

    if (error) {
      toast.error("Failed to update plan");
      return;
    }
    toast.success(`Plan ${status === "completed" ? "completed" : status === "paused" ? "paused" : "resumed"}!`);
    fetchPlans();
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase
      .from("bloom_financial_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      toast.error("Failed to delete plan");
      return;
    }
    toast.success("Plan deleted");
    fetchPlans();
  };

  const getPlanProgress = (plan: FinancialPlan) => {
    const totalActions = plan.milestones.reduce((s, m) => s + m.actions.length, 0);
    const completedActions = plan.milestones.reduce((s, m) => s + m.actions.filter(a => a.is_completed).length, 0);
    if (totalActions === 0) return 0;
    return Math.round((completedActions / totalActions) * 100);
  };

  const getMilestoneProgress = (milestone: PlanMilestone) => {
    if (milestone.actions.length === 0) return 0;
    const completed = milestone.actions.filter(a => a.is_completed).length;
    return Math.round((completed / milestone.actions.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Living Money Plan | CoinsBloom</title>
        <meta name="description" content="Track your Living Money Plans" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <DashboardHeader />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
        <PageHeroHeader
          icon={<Map className="h-6 w-6" />}
          title="Living Money Plan"
          subtitle="Your personalized roadmap to financial success"
        />

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["active", "completed", "paused", "all"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize shrink-0"
            >
              {f}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading your plans..." />
          </div>
        ) : plans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Map className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Living Money Plan yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Chat with Bloom to create a personalized Living Money Plan. Just say something like
                "Create a plan to pay off my debt" or "Build me a savings plan."
              </p>
              <Button onClick={() => navigate("/coach")} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Ask Bloom to Create a Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {plans.map(plan => {
                const progress = getPlanProgress(plan);
                const totalActions = plan.milestones.reduce((s, m) => s + m.actions.length, 0);
                const completedActions = plan.milestones.reduce((s, m) => s + m.actions.filter(a => a.is_completed).length, 0);

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <CardTitle className="text-base">{plan.title}</CardTitle>
                              <Badge variant="outline" className={STATUS_COLORS[plan.status] || ""}>
                                {plan.status}
                              </Badge>
                              <Badge variant="secondary" className={PRIORITY_COLORS[plan.priority] || ""}>
                                {plan.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}
                              </span>
                              {plan.target_amount > 0 && (
                                <span>${plan.target_amount.toLocaleString()} target</span>
                              )}
                              {plan.target_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(plan.target_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {plan.status === "active" && (
                                <DropdownMenuItem onClick={() => updatePlanStatus(plan.id, "paused")}>
                                  <Pause className="h-4 w-4 mr-2" /> Pause Plan
                                </DropdownMenuItem>
                              )}
                              {plan.status === "paused" && (
                                <DropdownMenuItem onClick={() => updatePlanStatus(plan.id, "active")}>
                                  <Play className="h-4 w-4 mr-2" /> Resume Plan
                                </DropdownMenuItem>
                              )}
                              {plan.status !== "completed" && (
                                <DropdownMenuItem onClick={() => updatePlanStatus(plan.id, "completed")}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => deletePlan(plan.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Plan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{completedActions}/{totalActions} actions</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <Accordion type="multiple" className="space-y-1">
                          {plan.milestones.map((ms, i) => {
                            const msProgress = getMilestoneProgress(ms);
                            const msCompleted = ms.actions.filter(a => a.is_completed).length;

                            return (
                              <AccordionItem key={ms.id} value={ms.id} className="border rounded-lg px-3">
                                <AccordionTrigger className="py-2.5 hover:no-underline text-left">
                                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                      ms.status === "completed" ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
                                    }`}>
                                      {ms.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{ms.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {msCompleted}/{ms.actions.length} done
                                        {ms.target_amount > 0 && ` · $${ms.target_amount.toLocaleString()}`}
                                      </p>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-3">
                                  {ms.description && (
                                    <p className="text-xs text-muted-foreground mb-3">{ms.description}</p>
                                  )}
                                  {ms.actions.length > 0 && (
                                    <div className="space-y-1.5">
                                      {ms.actions.map(action => (
                                        <button
                                          key={action.id}
                                          onClick={() => toggleAction(action.id, action.is_completed)}
                                          className="flex items-start gap-2.5 w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors group"
                                        >
                                          {action.is_completed ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                          ) : (
                                            <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary" />
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <p className={`text-sm ${action.is_completed ? "line-through text-muted-foreground" : ""}`}>
                                              {action.title}
                                            </p>
                                            {action.description && (
                                              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                                            )}
                                            <div className="flex gap-2 mt-1">
                                              {action.amount > 0 && (
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                                  ${action.amount.toLocaleString()}
                                                  {action.frequency !== "one-time" && `/${action.frequency}`}
                                                </Badge>
                                              )}
                                              {action.due_date && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                                  {new Date(action.due_date).toLocaleDateString()}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* FAB to create via Bloom */}
        <div className="fixed bottom-28 right-4 z-40">
          <Button
            size="lg"
            onClick={() => navigate("/coach")}
            className="rounded-full shadow-lg gap-2 h-12 px-5"
          >
            <Sparkles className="h-4 w-4" />
            Create Plan with Bloom
          </Button>
        </div>
      </main>
    </div>
  );
}
