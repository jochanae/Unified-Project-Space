import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Crown, DollarSign, MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    profile_image_url: string | null;
  };
  total_contributions?: number;
}

interface GoalContributorsProps {
  goalId: string;
  ownerId: string;
  isOwner: boolean;
  isCollaborative: boolean;
  onInvite: () => void;
}

const roleColors: Record<string, string> = {
  owner: "bg-yellow-100 text-yellow-800",
  organizer: "bg-purple-100 text-purple-800",
  contributor: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

const GoalContributors = ({ goalId, ownerId, isOwner, isCollaborative, onInvite }: GoalContributorsProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
  }, [goalId]);

  const fetchCollaborators = async () => {
    try {
      // Fetch owner profile
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, profile_image_url")
        .eq("id", ownerId)
        .single();
      
      setOwnerProfile(ownerData);

      // Fetch collaborators
      const { data: collabData, error } = await supabase
        .from("goal_collaborators")
        .select("*")
        .eq("goal_id", goalId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for collaborators
      if (collabData && collabData.length > 0) {
        const userIds = collabData.map((c) => c.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, profile_image_url")
          .in("id", userIds);

        // Fetch contribution totals
        const { data: contributions } = await supabase
          .from("goal_contributions")
          .select("user_id, amount")
          .eq("goal_id", goalId)
          .eq("is_approved", true);

        const contributionsByUser = contributions?.reduce((acc, c) => {
          acc[c.user_id] = (acc[c.user_id] || 0) + Number(c.amount);
          return acc;
        }, {} as Record<string, number>) || {};

        const enrichedCollaborators = collabData.map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.id === c.user_id),
          total_contributions: contributionsByUser[c.user_id] || 0,
        }));

        setCollaborators(enrichedCollaborators);
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return "?";
  };

  const getName = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return profile?.email || "Unknown";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contributors
          </CardTitle>
          {isCollaborative && isOwner && (
            <Button size="sm" variant="outline" onClick={onInvite}>
              <UserPlus className="h-4 w-4 mr-1" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Owner */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar>
            <AvatarImage src={ownerProfile?.profile_image_url || undefined} />
            <AvatarFallback>
              {getInitials(ownerProfile?.first_name, ownerProfile?.last_name, ownerProfile?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{getName(ownerProfile)}</p>
              <Badge className={roleColors.owner} variant="secondary">
                <Crown className="h-3 w-3 mr-1" />
                Owner
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{ownerProfile?.email}</p>
          </div>
        </div>

        {/* Collaborators */}
        {collaborators.map((collab) => (
          <div key={collab.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <Avatar>
              <AvatarImage src={collab.profile?.profile_image_url || undefined} />
              <AvatarFallback>
                {getInitials(collab.profile?.first_name, collab.profile?.last_name, collab.profile?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{getName(collab.profile)}</p>
                <Badge className={roleColors[collab.role]} variant="secondary">
                  {collab.role}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${(collab.total_contributions || 0).toLocaleString()}
                </span>
                <span>
                  Joined {new Date(collab.joined_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toast.info(`Managing ${collab.profile?.first_name || 'collaborator'}`, {
                  description: "Role: " + collab.role,
                })}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {collaborators.length === 0 && isCollaborative && (
          <div className="text-center py-6">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No collaborators yet
            </p>
            {isOwner && (
              <Button size="sm" onClick={onInvite}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Contributors
              </Button>
            )}
          </div>
        )}

        {!isCollaborative && (
          <p className="text-sm text-muted-foreground text-center py-4">
            This is an individual goal. Upgrade to a collaborative goal type to invite others.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalContributors;
