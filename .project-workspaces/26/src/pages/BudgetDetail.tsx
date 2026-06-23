import React, { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Home,
  Wallet,
  Share2,
  Settings,
  Plus,
  Users,
  MessageCircle,
  Activity,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import BudgetContributors from "@/components/budgets/BudgetContributors";
import BudgetComments from "@/components/budgets/BudgetComments";
import BudgetActivityFeed from "@/components/budgets/BudgetActivityFeed";
import InviteBudgetCollaboratorModal from "@/components/budgets/InviteBudgetCollaboratorModal";
import AddExpenseModal from "@/components/budgets/AddExpenseModal";
import PaymentMethodsModal from "@/components/collaboration/PaymentMethodsModal";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useBudgetBills } from "@/hooks/useBudgetBills";
import BudgetUpcomingBills from "@/components/budgets/BudgetUpcomingBills";

const BudgetDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { hasFeature } = useFeatureGating();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  
  const canInvite = hasFeature('collaborative-budgets');
  const { getBillsForBudgetCategory } = useBudgetBills();

  useEffect(() => {
    if (user && id) {
      fetchBudget();
      fetchCollaboratorCount();
      setupRealtimeSubscription();
    }
  }, [user, id]);

  const fetchBudget = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setBudget(data);
      setIsOwner(data.user_id === user?.id);
    } catch (error: any) {
      console.error("Error fetching budget:", error);
      // Don't show error toast if budget was just deleted (PGRST116 = not found)
      if (error?.code !== "PGRST116") {
        toast.error("Failed to load budget");
      }
      navigate("/budgets");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaboratorCount = async () => {
    const { count } = await supabase
      .from("budget_collaborators")
      .select("*", { count: "exact", head: true })
      .eq("budget_id", id);
    setCollaboratorCount((count || 0) + 1);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`budget-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets", filter: `id=eq.${id}` },
        () => fetchBudget()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_transactions", filter: `budget_id=eq.${id}` },
        () => fetchBudget()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading budget details..." />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Budget not found</h2>
        <Button onClick={() => navigate("/budgets")}>Back to Budgets</Button>
      </div>
    );
  }

  const spent = Number(budget.spent);
  const total = Number(budget.amount);
  const remaining = total - spent;
  const progress = total > 0 ? (spent / total) * 100 : 0;
  const isCollaborative = collaboratorCount > 1;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{budget?.name || "Budget Details"} | CoinsBloom</title>
        <meta name="description" content={`Track your ${budget?.name} budget. View spending, collaborators, and activity.`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 px-4 pt-4 pb-8 relative overflow-hidden">
        <div className="absolute left-4 top-32 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-0 top-20 w-40 h-40 rounded-full bg-pink-400/20" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/budgets")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-white hover:bg-white/20"
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPaymentMethodsModal(true)}
              className="text-white hover:bg-white/20"
            >
              <CreditCard className="h-5 w-5" />
            </Button>
            {canInvite ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInviteModal(true)}
                className="text-white hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toast.info("Upgrade to Premium to invite collaborators", {
                  description: "Free users can join collaborative budgets, but need Premium to invite others.",
                  action: { label: "Upgrade", onClick: () => navigate("/settings") }
                })}
                className="text-white hover:bg-white/20 relative"
              >
                <Share2 className="h-5 w-5" />
                <Crown className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400" />
              </Button>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toast.info("Budget settings", { 
                  description: "You can edit or delete this budget from the Budgets page",
                  action: {
                    label: "Go to Budgets",
                    onClick: () => navigate("/budgets"),
                  }
                })}
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="relative z-10">
          <Badge className="bg-white/20 text-white border-0 mb-2 capitalize">
            {budget.category}
          </Badge>
          <h1 className="text-2xl font-bold text-white mb-1">{budget.name}</h1>
          <p className="text-white/80 text-sm">{budget.period} budget</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-4 space-y-4">
        {/* Progress Card */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Math.min(progress, 100) * 3.52} 352`}
                    className={progress > 100 ? "text-red-500" : "text-purple-500"}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{Math.min(progress, 100).toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">Used</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className={`text-2xl font-bold ${progress > 100 ? "text-red-500" : "text-purple-500"}`}>
                    ${spent.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${total.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Budget</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Progress value={Math.min(progress, 100)} className="h-3" />
              
              <div className="flex justify-between text-sm">
                <span className={remaining < 0 ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                  {remaining >= 0 ? `$${remaining.toLocaleString()} remaining` : `$${Math.abs(remaining).toLocaleString()} over budget`}
                </span>
                <Badge variant="secondary">{budget.period}</Badge>
              </div>
            </div>

            <Button
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-purple-600"
              onClick={() => setShowExpenseModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Log Expense
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-semibold">
                {new Date(budget.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">Started</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-semibold">{collaboratorCount}</p>
              <p className="text-xs text-muted-foreground">
                {isCollaborative ? "Contributors" : "Participant"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className={`h-5 w-5 mx-auto mb-1 ${progress > 80 ? "text-red-500" : "text-green-500"}`} />
              <p className={`text-sm font-semibold ${progress > 80 ? "text-red-500" : "text-green-500"}`}>
                {progress > 80 ? "Caution" : "On Track"}
              </p>
              <p className="text-xs text-muted-foreground">Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bills for this budget category */}
        <BudgetUpcomingBills
          bills={getBillsForBudgetCategory(budget.category)}
          budgetAmount={total}
          spent={spent}
        />

        {/* Tabs for Contributors, Comments, Activity */}
        <Tabs defaultValue="contributors" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="contributors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Comments</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contributors" className="mt-4">
            <BudgetContributors 
              budgetId={budget.id} 
              ownerId={budget.user_id}
              isOwner={isOwner}
              onInvite={() => setShowInviteModal(true)}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <BudgetComments budgetId={budget.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <BudgetActivityFeed budgetId={budget.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InviteBudgetCollaboratorModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        budgetId={budget.id}
        budgetName={budget.name}
      />

      <AddExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        budget={{
          id: budget.id,
          name: budget.name,
          category: budget.category,
          amount: Number(budget.amount),
          spent: Number(budget.spent),
        }}
        onSuccess={fetchBudget}
      />

      <PaymentMethodsModal
        open={showPaymentMethodsModal}
        onOpenChange={setShowPaymentMethodsModal}
        entityType="budget"
        entityId={budget.id}
        entityName={budget.name}
        isOwner={isOwner}
      />
    </div>
  );
};

export default BudgetDetail;