import React, { useState, useEffect } from "react";
import { BloomCoachTip } from "@/components/shared/BloomCoachTip";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Trophy,
  Plus,
  Filter,
  ArrowUpDown,
  Archive,
  Users,
  MoreVertical,
  Clock,
  Edit,
  Trash2,
  DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { toast } from "sonner";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import InviteCollaboratorModal from "@/components/goals/InviteCollaboratorModal";
import ContributionModal from "@/components/goals/ContributionModal";
import AvatarStack from "@/components/goals/AvatarStack";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import GoalsTrendChart from "@/components/goals/GoalsTrendChart";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  goal_type: string;
  deadline: string | null;
  is_archived: boolean;
  user_id: string;
  created_at: string;
  collaborator_count?: number;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

interface GoalCollaboratorInfo {
  goalId: string;
  collaborators: UserProfile[];
}

const goalTypeEmojis: Record<string, string> = {
  individual: "🎯",
  joint: "👫",
  family: "👨‍👩‍👧‍👦",
  friends: "👥",
  business: "💼",
  community: "🌍",
};

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("none");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [goalCollaborators, setGoalCollaborators] = useState<Record<string, UserProfile[]>>({});
  const [inviteModal, setInviteModal] = useState<{ open: boolean; goalId: string; goalTitle: string }>({
    open: false,
    goalId: "",
    goalTitle: "",
  });
  const [contributionModal, setContributionModal] = useState<{ open: boolean; goalId: string; goalTitle: string }>({
    open: false,
    goalId: "",
    goalTitle: "",
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchGoals();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, profile_image_url")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data) {
      setUserProfile(data);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);

      // Fetch collaborators for each goal
      if (data && data.length > 0) {
        const goalIds = data.map(g => g.id);
        const { data: collabData } = await supabase
          .from("goal_collaborators")
          .select("goal_id, user_id")
          .in("goal_id", goalIds);

        if (collabData && collabData.length > 0) {
          const userIds = [...new Set(collabData.map(c => c.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, profile_image_url")
            .in("id", userIds);

          // Group collaborators by goal
          const collabsByGoal: Record<string, UserProfile[]> = {};
          collabData.forEach(c => {
            if (!collabsByGoal[c.goal_id]) {
              collabsByGoal[c.goal_id] = [];
            }
            const profile = profiles?.find(p => p.id === c.user_id);
            if (profile) {
              collabsByGoal[c.goal_id].push(profile);
            }
          });
          setGoalCollaborators(collabsByGoal);
        }
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const filteredGoals = goals.filter((goal) => {
    if (showArchived) return goal.is_archived;
    if (!goal.is_archived) {
      if (filter === "all") return true;
      return goal.goal_type === filter;
    }
    return false;
  });

  const totalSaved = goals
    .filter((g) => !g.is_archived)
    .reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = goals
    .filter((g) => !g.is_archived)
    .reduce((sum, g) => sum + Number(g.target_amount), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const completedGoals = goals.filter(
    (g) => !g.is_archived && Number(g.current_amount) >= Number(g.target_amount)
  ).length;
  const activeGoals = goals.filter((g) => !g.is_archived).length;

  // Find nearest milestone (goal with soonest deadline)
  const nearestMilestone = goals
    .filter((g) => !g.is_archived && g.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? `${days}d left` : "Overdue";
  };

  const handleArchiveGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("goals")
        .update({ is_archived: true })
        .eq("id", goalId)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Goal archived");
      fetchGoals();
    } catch (error) {
      console.error("Error archiving goal:", error);
      toast.error("Failed to archive goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Goal deleted");
      fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const getProgressPercent = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const handleInviteClick = (goal: Goal, e: React.MouseEvent) => {
    e.stopPropagation();
    setInviteModal({ open: true, goalId: goal.id, goalTitle: goal.title });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your goals..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Target className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2">Sign in to view your goals</h2>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Savings Goals | CoinsBloom - Track Your Financial Milestones</title>
        <meta name="description" content="Set and track savings goals with CoinsBloom. Create individual or collaborative goals, monitor progress, and achieve your financial milestones." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />
      {/* Hero Header */}
      <PageHeroHeader
        title="Goals"
        subtitle="Set savings goals, track progress, and celebrate your financial milestones"
        icon={<Target className="h-6 w-6 text-[hsl(160,80%,70%)]" />}
        colorScheme="green"
      />

      <BloomCoachTip
        example="Create a vacation fund goal for $3,000 by December"
        dismissKey="bloom_tip_goals"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 pt-6 space-y-4 max-w-6xl mx-auto"
      >
        {/* Goals Header with New Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Goals</h2>
            <p className="text-sm text-muted-foreground">
              Track and achieve your SMART goals
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600"
          >
            <Target className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>

        <CreateGoalModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={fetchGoals}
        />

        <InviteCollaboratorModal
          open={inviteModal.open}
          onOpenChange={(open) => setInviteModal({ ...inviteModal, open })}
          goalId={inviteModal.goalId}
          goalTitle={inviteModal.goalTitle}
        />

        {/* Goals Trend Chart */}
        <GoalsTrendChart goals={goals} />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Goals Progress</span>
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-500">
                {overallProgress.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                ${totalSaved.toLocaleString()} of ${totalTarget.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-2xl font-bold">
                    {activeGoals > 0
                      ? ((completedGoals / activeGoals) * 100).toFixed(0)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {completedGoals} of {activeGoals} complete
                  </p>
                </div>
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${(completedGoals / Math.max(activeGoals, 1)) * 125.6} 125.6`}
                      className="text-blue-500"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nearest Milestone */}
        {nearestMilestone && (
          <Card className="bg-bloom-green/10 dark:bg-bloom-green/5 border-bloom-green/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    Nearest Milestone
                  </div>
                  <p className="font-bold text-lg text-foreground">{nearestMilestone.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {getProgressPercent(
                      Number(nearestMilestone.current_amount),
                      Number(nearestMilestone.target_amount)
                    ).toFixed(0)}
                    % complete
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {getDaysLeft(nearestMilestone.deadline!)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setFilter("all")}
          >
            <Filter className="h-4 w-4" />
            All Goals
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setSortBy(sortBy === "none" ? "deadline" : "none")}
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === "none" ? "No Sort" : "By Deadline"}
          </Button>
          <Button
            variant={!showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(false)}
          >
            Active
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowArchived(true)}
          >
            <Archive className="h-4 w-4" />
            Archived
          </Button>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {filteredGoals.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {showArchived ? "No archived goals" : "No goals yet"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                  {showArchived
                    ? "Archived goals will appear here when you archive completed or paused goals"
                    : "Set your first savings goal and start building your financial future"}
                </p>
                {!showArchived && (
                  <Button onClick={() => setShowCreateModal(true)} className="gradient-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Goal
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredGoals.map((goal) => {
              const progress = getProgressPercent(
                Number(goal.current_amount),
                Number(goal.target_amount)
              );
              const isCollaborative = goal.goal_type !== "individual";

              return (
                <Card
                  key={goal.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/goals/${goal.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{goal.title}</h3>
                        <Badge
                          variant="secondary"
                          className="mt-1 text-xs capitalize"
                        >
                          {goalTypeEmojis[goal.goal_type]} {goal.goal_type}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={() => {
                              setContributionModal({
                                open: true,
                                goalId: goal.id,
                                goalTitle: goal.title,
                              });
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Add Funds
                          </DropdownMenuItem>
                          {isCollaborative && (
                            <DropdownMenuItem
                              onClick={() => handleInviteClick(goal, { stopPropagation: () => {} } as React.MouseEvent)}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Invite Collaborator
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleArchiveGoal(goal.id)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Goal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Collaborators with Add Button */}
                    <div className="flex items-center gap-2 mb-3">
                      <AvatarStack
                        avatars={[
                          // Owner (current user) with real profile data
                          { 
                            id: user?.id || "owner", 
                            name: userProfile 
                              ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'You'
                              : 'You',
                            imageUrl: userProfile?.profile_image_url 
                          },
                          // Collaborators with real data
                          ...(goalCollaborators[goal.id] || [])
                            .filter(c => c.id !== user?.id) // Exclude owner from collaborators
                            .map(c => ({
                              id: c.id,
                              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Member',
                              imageUrl: c.profile_image_url,
                            })),
                        ]}
                        size="sm"
                        maxDisplay={4}
                        showAddButton={isCollaborative}
                        onAddClick={() => handleInviteClick(goal, { stopPropagation: () => {} } as React.MouseEvent)}
                      />
                      {isCollaborative && (
                        <span className="text-sm text-muted-foreground">
                          {(goalCollaborators[goal.id]?.length || 0) + 1} participant
                          {((goalCollaborators[goal.id]?.length || 0) + 1) !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Saved</span>
                        <span className="font-semibold">
                          ${Number(goal.current_amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="font-semibold">
                          ${Number(goal.target_amount).toLocaleString()}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress.toFixed(0)}%</span>
                        {goal.deadline && (
                          <span>
                            {new Date(goal.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContributionModal({
                          open: true,
                          goalId: goal.id,
                          goalTitle: goal.title,
                        });
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {isCollaborative ? "Log Contribution" : "Add Funds"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* About Savings Goals */}
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-primary mb-2">About Savings Goals</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Set savings targets with deadlines and track your progress. Create individual or collaborative goals with friends and family.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">🎯 Individual</Badge>
                    <span className="text-muted-foreground">Personal savings goals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">👥 Collaborative</Badge>
                    <span className="text-muted-foreground">Save together with others</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contribution Modal */}
      <ContributionModal
        open={contributionModal.open}
        onOpenChange={(open) => setContributionModal({ ...contributionModal, open })}
        goalId={contributionModal.goalId}
        goalTitle={contributionModal.goalTitle}
        onSuccess={fetchGoals}
      />
    </div>
  );
};

export default Goals;
