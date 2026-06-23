import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import AvatarStack from "@/components/goals/AvatarStack";
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

const JoinGoal = () => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalId) {
      fetchGoalDetails();
    }
  }, [goalId, user]);

  const fetchGoalDetails = async () => {
    try {
      // Fetch goal - this uses a public-friendly approach
      const { data: goalData, error: goalError } = await supabase
        .from("goals")
        .select("*")
        .eq("id", goalId)
        .single();

      if (goalError) {
        if (goalError.code === "PGRST116") {
          setError("Goal not found or you don't have access to view it.");
        } else {
          throw goalError;
        }
        return;
      }

      setGoal(goalData);

      // Fetch owner profile
      const { data: owner } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, profile_image_url")
        .eq("id", goalData.user_id)
        .single();

      setOwnerProfile(owner);

      // Fetch collaborators
      const { data: collabs } = await supabase
        .from("goal_collaborators")
        .select("user_id")
        .eq("goal_id", goalId);

      if (collabs && collabs.length > 0) {
        const userIds = collabs.map((c) => c.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, profile_image_url")
          .in("id", userIds);

        setCollaborators(profiles || []);

        // Check if current user is already a member
        if (user) {
          const isMember = userIds.includes(user.id) || goalData.user_id === user.id;
          setAlreadyMember(isMember);
        }
      } else if (user && goalData.user_id === user.id) {
        setAlreadyMember(true);
      }
    } catch (err) {
      console.error("Error fetching goal:", err);
      setError("Failed to load goal details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGoal = async () => {
    if (!user) {
      // Redirect to auth with return URL
      const returnUrl = `/goals/join/${goalId}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setJoining(true);
    try {
      // Add as collaborator with contributor role
      const { error: joinError } = await supabase
        .from("goal_collaborators")
        .insert({
          goal_id: goalId!,
          user_id: user.id,
          role: "contributor",
        });

      if (joinError) {
        if (joinError.code === "23505") {
          toast.error("You're already a member of this goal");
          setAlreadyMember(true);
        } else {
          throw joinError;
        }
        return;
      }

      // Log activity
      await supabase.from("goal_activity").insert({
        goal_id: goalId!,
        user_id: user.id,
        activity_type: "collaborator_joined",
        description: "Joined the goal as a contributor",
      });

      toast.success("You've joined the goal!");
      navigate(`/goals/${goalId}`);
    } catch (err) {
      console.error("Error joining goal:", err);
      toast.error("Failed to join goal. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  // Build avatar list for the stack
  const getAvatarList = () => {
    const avatars = [];
    
    if (ownerProfile) {
      avatars.push({
        name: ownerProfile.first_name && ownerProfile.last_name 
          ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
          : ownerProfile.email,
        imageUrl: ownerProfile.profile_image_url,
      });
    }

    collaborators.forEach((collab) => {
      avatars.push({
        name: collab.first_name && collab.last_name
          ? `${collab.first_name} ${collab.last_name}`
          : "Member",
        imageUrl: collab.profile_image_url,
      });
    });

    return avatars;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-white/70">Loading goal details...</p>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Unable to Join</h2>
            <p className="text-muted-foreground mb-6">
              {error || "This goal doesn't exist or you don't have permission to view it."}
            </p>
            <Button onClick={() => navigate("/goals")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = goal.target_amount > 0
    ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
    : 0;
  const participantCount = 1 + collaborators.length;
  const avatarList = getAvatarList();

  const getDaysLeft = () => {
    if (!goal.deadline) return null;
    const days = Math.ceil(
      (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? `${days} days left` : "Overdue";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-500 to-green-500 flex items-center justify-center p-4">
      <Helmet>
        <title>Join Goal: {goal?.title || 'Collaborative Savings'} | CoinsBloom</title>
        <meta name="description" content={`Join this collaborative savings goal and help reach ${goal?.target_amount ? `$${goal.target_amount.toLocaleString()}` : 'the target'}.`} />
      </Helmet>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-10 top-20 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute right-10 bottom-20 w-48 h-48 rounded-full bg-purple-400/20" />
        <div className="absolute left-1/2 top-10 w-32 h-32 rounded-full bg-white/5" />
      </div>

      <Card className="relative max-w-md w-full shadow-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-t-lg text-white">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-6 w-6" />
              <span className="text-sm font-medium opacity-90">You're invited to join</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{goal.title}</h1>
            <Badge className="bg-white/20 text-white border-0">
              {goalTypeEmojis[goal.goal_type]} {goal.goal_type} goal
            </Badge>
          </div>

          {/* Goal details */}
          <div className="p-6 space-y-6">
            {/* Description */}
            {goal.description && (
              <p className="text-muted-foreground">{goal.description}</p>
            )}

            {/* Progress */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-green-600">
                  ${Number(goal.current_amount).toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  of ${Number(goal.target_amount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Participants with Avatar Stack */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <AvatarStack avatars={avatarList} size="md" maxDisplay={4} />
                <div>
                  <p className="font-semibold text-sm">
                    {participantCount} {participantCount === 1 ? "participant" : "participants"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created by {ownerProfile?.first_name || "the owner"}
                  </p>
                </div>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Deadline */}
            {goal.deadline && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    Target: {new Date(goal.deadline).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-muted-foreground">{getDaysLeft()}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {alreadyMember ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-50 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">You're already a member!</span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/goals/${goalId}`)}
                >
                  View Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 h-12 text-lg"
                  onClick={handleJoinGoal}
                  disabled={joining}
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : user ? (
                    <>
                      <Users className="h-5 w-5 mr-2" />
                      Join Goal
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign in to Join
                    </>
                  )}
                </Button>

                {!user && (
                  <p className="text-center text-sm text-muted-foreground">
                    You'll need to sign in or create an account to join this goal
                  </p>
                )}
              </div>
            )}

            {/* Back link */}
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/goals")}
                className="text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to my goals
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGoal;
