import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Home,
  Target,
  Share2,
  Settings,
  Plus,
  Users,
  MessageCircle,
  Activity,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus,
  MoreVertical,
  CreditCard,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import GoalContributors from "@/components/goals/GoalContributors";
import GoalComments from "@/components/goals/GoalComments";
import GoalActivityFeed from "@/components/goals/GoalActivityFeed";
import InviteCollaboratorModal from "@/components/goals/InviteCollaboratorModal";
import ContributionModal from "@/components/goals/ContributionModal";
import GoalCelebrationModal from "@/components/goals/GoalCelebrationModal";
import PaymentMethodsModal from "@/components/collaboration/PaymentMethodsModal";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { Tables } from "@/integrations/supabase/types";

type Goal = Tables<"goals">;

const goalTypeEmojis: Record<string, string> = {
  individual: "🎯",
  joint: "👫",
  family: "👨‍👩‍👧‍👦",
  friends: "👥",
  business: "💼",
  community: "🌍",
};

const GoalDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { hasFeature } = useFeatureGating();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  const [previousAmount, setPreviousAmount] = useState<number | null>(null);
  
  const canInvite = hasFeature('collaborative-goals');

  useEffect(() => {
    if (user && id) {
      fetchGoal();
      fetchCollaboratorCount();
      setupRealtimeSubscription();
    }
  }, [user, id]);

  const fetchGoal = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Check if goal just reached 100%
      if (
        previousAmount !== null &&
        data &&
        Number(data.current_amount) >= Number(data.target_amount) &&
        previousAmount < Number(data.target_amount)
      ) {
        setShowCelebration(true);
      }
      
      setPreviousAmount(data ? Number(data.current_amount) : null);
      setGoal(data);
      setIsOwner(data.user_id === user?.id);
    } catch (error) {
      console.error("Error fetching goal:", error);
      toast.error("Failed to load goal");
      navigate("/goals");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaboratorCount = async () => {
    const { count } = await supabase
      .from("goal_collaborators")
      .select("*", { count: "exact", head: true })
      .eq("goal_id", id);
    setCollaboratorCount((count || 0) + 1); // +1 for owner
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`goal-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `id=eq.${id}` },
        () => fetchGoal()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_contributions", filter: `goal_id=eq.${id}` },
        () => fetchGoal()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading goal details..." />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Target className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Goal not found</h2>
        <Button onClick={() => navigate("/goals")}>Back to Goals</Button>
      </div>
    );
  }

  const progress = goal.target_amount > 0 
    ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 
    : 0;
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);
  const isCollaborative = goal.goal_type !== "individual";

  const getDaysLeft = () => {
    if (!goal.deadline) return null;
    const days = Math.ceil(
      (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? `${days} days left` : "Overdue";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{goal?.title || 'Goal Details'} | CoinsBloom</title>
        <meta name="description" content={`Track progress on your savings goal: ${goal?.title}. View contributions, collaborators, and activity.`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-green-500 px-4 pt-4 pb-8 relative overflow-hidden">
        <div className="absolute left-4 top-32 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-0 top-20 w-40 h-40 rounded-full bg-purple-400/20" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/goals")}
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
            {isCollaborative && (
              canInvite ? (
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
                    description: "Free users can join collaborative goals, but need Premium to invite others.",
                    action: { label: "Upgrade", onClick: () => navigate("/settings") }
                  })}
                  className="text-white hover:bg-white/20 relative"
                >
                  <Share2 className="h-5 w-5" />
                  <Crown className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400" />
                </Button>
              )
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toast.info("Goal settings", { 
                  description: "You can edit or archive this goal from the Goals page",
                  action: {
                    label: "Go to Goals",
                    onClick: () => navigate("/goals"),
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
          <Badge className="bg-white/20 text-white border-0 mb-2">
            {goalTypeEmojis[goal.goal_type]} {goal.goal_type}
          </Badge>
          <h1 className="text-2xl font-bold text-white mb-1">{goal.title}</h1>
          {goal.description && (
            <p className="text-white/80 text-sm">{goal.description}</p>
          )}
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
                    strokeDasharray={`${progress * 3.52} 352`}
                    className="text-green-500 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{progress.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">Complete</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    ${Number(goal.current_amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Saved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${Number(goal.target_amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Target</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Progress value={progress} className="h-3" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ${remaining.toLocaleString()} remaining
                </span>
                {getDaysLeft() && (
                  <Badge variant="secondary">{getDaysLeft()}</Badge>
                )}
              </div>
            </div>

            <Button
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-purple-600"
              onClick={() => setShowContributionModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCollaborative ? "Log Contribution" : "Add Funds"}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-semibold">
                {goal.deadline 
                  ? new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "No deadline"
                }
              </p>
              <p className="text-xs text-muted-foreground">Deadline</p>
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
              <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-sm font-semibold text-green-500">On Track</p>
              <p className="text-xs text-muted-foreground">Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Contributors, Comments, Activity */}
        <Tabs defaultValue="contributors" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="contributors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Contributors</span>
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
            <GoalContributors 
              goalId={goal.id} 
              ownerId={goal.user_id}
              isOwner={isOwner}
              isCollaborative={isCollaborative}
              onInvite={() => setShowInviteModal(true)}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <GoalComments goalId={goal.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <GoalActivityFeed goalId={goal.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InviteCollaboratorModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        goalId={goal.id}
        goalTitle={goal.title}
      />

      <ContributionModal
        open={showContributionModal}
        onOpenChange={setShowContributionModal}
        goalId={goal.id}
        goalTitle={goal.title}
        onSuccess={fetchGoal}
      />

      <GoalCelebrationModal
        open={showCelebration}
        onOpenChange={setShowCelebration}
        goalTitle={goal.title}
        goalAmount={Number(goal.target_amount)}
      />

      <PaymentMethodsModal
        open={showPaymentMethodsModal}
        onOpenChange={setShowPaymentMethodsModal}
        entityType="goal"
        entityId={goal.id}
        entityName={goal.title}
        isOwner={isOwner}
      />
    </div>
  );
};

export default GoalDetail;
