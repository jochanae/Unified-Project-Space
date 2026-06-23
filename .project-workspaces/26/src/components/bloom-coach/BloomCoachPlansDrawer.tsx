import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Map, ExternalLink, CheckCircle2, Circle, Target, Clock } from "lucide-react";
import { toast } from "sonner";

interface PlanAction {
  id: string;
  title: string;
  is_completed: boolean;
  amount: number;
  frequency: string;
}

interface PlanMilestone {
  id: string;
  title: string;
  target_amount: number;
  status: string;
  actions: PlanAction[];
}

interface Plan {
  id: string;
  title: string;
  plan_type: string;
  status: string;
  target_amount: number;
  milestones: PlanMilestone[];
}

interface BloomCoachPlansDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BloomCoachPlansDrawer({ open, onOpenChange }: BloomCoachPlansDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) fetchPlans();
  }, [open, user]);

  const fetchPlans = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: planData } = await supabase
        .from("bloom_financial_plans")
        .select("id, title, plan_type, status, target_amount")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!planData || planData.length === 0) {
        setPlans([]);
        setIsLoading(false);
        return;
      }

      const planIds = planData.map(p => p.id);
      const [msRes, actRes] = await Promise.all([
        supabase.from("bloom_plan_milestones").select("id, title, plan_id, target_amount, status").in("plan_id", planIds).order("order_index"),
        supabase.from("bloom_plan_actions").select("id, title, milestone_id, is_completed, amount, frequency").in("plan_id", planIds).order("order_index"),
      ]);

      const milestones = msRes.data || [];
      const actions = actRes.data || [];

      setPlans(planData.map(p => ({
        ...p,
        milestones: milestones
          .filter(m => m.plan_id === p.id)
          .map(m => ({
            ...m,
            actions: actions.filter(a => a.milestone_id === m.id),
          })),
      })));
    } catch {
      console.error("Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = (plan: Plan) => {
    const total = plan.milestones.reduce((s, m) => s + m.actions.length, 0);
    const done = plan.milestones.reduce((s, m) => s + m.actions.filter(a => a.is_completed).length, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  const toggleAction = async (actionId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from("bloom_plan_actions")
      .update({
        is_completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", actionId);

    if (error) {
      toast.error("Failed to update");
      return;
    }
    fetchPlans();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0">
        <SheetHeader className="p-4 pb-3 pr-12 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Map className="h-4 w-4 text-primary" />
              My Plans
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onOpenChange(false); navigate("/financial-plans"); }}
              className="gap-1 text-xs h-7"
            >
              View All <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-60px)] p-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <Map className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active plans yet</p>
               <p className="text-xs text-muted-foreground mt-1">Ask Bloom to create one!</p>
            </div>
          ) : (
            plans.map(plan => {
              const progress = getProgress(plan);
              return (
                <div key={plan.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium truncate flex-1">{plan.title}</h4>
                    <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                      {plan.plan_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{progress}%</span>
                  </div>

                  {/* Show next incomplete actions */}
                  <div className="space-y-1">
                    {plan.milestones.flatMap(m => m.actions)
                      .filter(a => !a.is_completed)
                      .slice(0, 3)
                      .map(action => (
                        <button
                          key={action.id}
                          onClick={() => toggleAction(action.id, action.is_completed)}
                          className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-muted/50 transition-colors group"
                        >
                          <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary" />
                          <span className="text-xs truncate">{action.title}</span>
                        </button>
                      ))
                    }
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
