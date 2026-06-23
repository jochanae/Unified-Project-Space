import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface Collaborator {
  user_id: string;
  role: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  };
}

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  goal_type: string;
  collaborators: Collaborator[];
}

export const SavingsCardContent = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      // Fetch goals with their collaborators
      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("id, title, target_amount, current_amount, goal_type")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(3);

      if (goalsError) throw goalsError;

      // Calculate total saved
      const total = (goalsData || []).reduce((sum, goal) => sum + Number(goal.current_amount), 0);
      setTotalSaved(total);

      // Fetch collaborators with profile data for each goal
      const goalsWithCollaborators: Goal[] = [];
      
      for (const goal of goalsData || []) {
        const { data: collabData } = await supabase
          .from("goal_collaborators")
          .select("user_id, role")
          .eq("goal_id", goal.id)
          .limit(5);

        // Fetch profiles for collaborators
        const collaboratorsWithProfiles: Collaborator[] = [];
        for (const collab of collabData || []) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("first_name, last_name, profile_image_url")
            .eq("id", collab.user_id)
            .single();

          collaboratorsWithProfiles.push({
            ...collab,
            profile: profileData || undefined,
          });
        }

        goalsWithCollaborators.push({
          ...goal,
          collaborators: collaboratorsWithProfiles,
        });
      }

      setGoals(goalsWithCollaborators);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, userId: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    return userId.slice(0, 2).toUpperCase();
  };

  const getGoalTypeBadge = (goalType: string) => {
    const types: Record<string, { bg: string; text: string; label: string }> = {
      joint: { bg: "bg-pink-100", text: "text-pink-600", label: "Joint" },
      family: { bg: "bg-blue-100", text: "text-blue-600", label: "Family" },
      friends: { bg: "bg-purple-100", text: "text-purple-600", label: "Friends" },
      business: { bg: "bg-green-100", text: "text-green-600", label: "Business" },
      community: { bg: "bg-orange-100", text: "text-orange-600", label: "Community" },
      individual: { bg: "bg-gray-100", text: "text-gray-600", label: "Personal" },
    };
    return types[goalType] || types.individual;
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Total Saved: $0.00</p>
        <p className="text-xs text-muted-foreground text-center py-4">
          No savings goals yet. Create one to start tracking!
        </p>
      </div>
    );
  }

  // Show the first goal with most detail
  const primaryGoal = goals[0];
  const progress = primaryGoal.target_amount > 0 
    ? Math.round((primaryGoal.current_amount / primaryGoal.target_amount) * 100) 
    : 0;
  const badge = getGoalTypeBadge(primaryGoal.goal_type);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Total Saved: ${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className="p-2 rounded-lg border">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate flex-1">{primaryGoal.title}</p>
          <div className="flex gap-1 flex-shrink-0">
            <span className={`text-xs ${badge.bg} ${badge.text} px-1.5 rounded`}>
              {badge.label}
            </span>
            {progress < 25 && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">
                low
              </span>
            )}
            {progress >= 25 && progress < 75 && (
              <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 rounded">
                mid
              </span>
            )}
            {progress >= 75 && (
              <span className="text-xs bg-green-100 text-green-600 px-1.5 rounded">
                high
              </span>
            )}
          </div>
        </div>
        
        {/* Collaborator Avatars */}
        {primaryGoal.collaborators.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex -space-x-1">
              {primaryGoal.collaborators.slice(0, 3).map((collab, index) => (
                <Avatar key={collab.user_id} className="h-5 w-5 border-2 border-background">
                  {collab.profile?.profile_image_url ? (
                    <AvatarImage 
                      src={collab.profile.profile_image_url} 
                      alt={collab.profile.first_name || "Collaborator"} 
                    />
                  ) : null}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(
                      collab.profile?.first_name || null, 
                      collab.profile?.last_name || null, 
                      collab.user_id
                    )}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {primaryGoal.collaborators.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{primaryGoal.collaborators.length - 3} · {primaryGoal.collaborators.length} participants
              </span>
            )}
            {primaryGoal.collaborators.length <= 3 && primaryGoal.collaborators.length > 1 && (
              <span className="text-xs text-muted-foreground">
                {primaryGoal.collaborators.length} participants
              </span>
            )}
          </div>
        )}
        
        <Progress value={progress} className="h-1.5 mb-1" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${primaryGoal.current_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>{progress}%</span>
          <span>${primaryGoal.target_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};
