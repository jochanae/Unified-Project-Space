import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, UserPlus, Trash2 } from "lucide-react";
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
}

interface BudgetContributorsProps {
  budgetId: string;
  ownerId: string;
  isOwner: boolean;
  onInvite: () => void;
}

const BudgetContributors = ({ budgetId, ownerId, isOwner, onInvite }: BudgetContributorsProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
  }, [budgetId]);

  const fetchCollaborators = async () => {
    try {
      // Fetch owner profile
      const { data: owner } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, profile_image_url")
        .eq("id", ownerId)
        .single();
      setOwnerProfile(owner);

      // Fetch collaborators
      const { data, error } = await supabase
        .from("budget_collaborators")
        .select("*")
        .eq("budget_id", budgetId);

      if (error) throw error;

      if (data) {
        const userIds = data.map((c) => c.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, profile_image_url")
          .in("id", userIds);

        const collaboratorsWithProfiles = data.map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.id === c.user_id),
        }));

        setCollaborators(collaboratorsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("budget_collaborators")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;
      toast.success("Collaborator removed");
      fetchCollaborators();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Failed to remove collaborator");
    }
  };

  const getInitials = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.first_name) return profile.first_name[0].toUpperCase();
    if (profile?.email) return profile.email[0].toUpperCase();
    return "?";
  };

  const getName = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return profile?.email || "Unknown";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
            Team ({collaborators.length + 1})
          </CardTitle>
          <Button size="sm" onClick={onInvite}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Owner */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
          <Avatar className="h-10 w-10">
            <AvatarImage src={ownerProfile?.profile_image_url || undefined} />
            <AvatarFallback>{getInitials(ownerProfile)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{getName(ownerProfile)}</p>
              <Crown className="h-4 w-4 text-yellow-500" />
            </div>
            <Badge className={getRoleBadgeColor("owner")}>Owner</Badge>
          </div>
        </div>

        {/* Collaborators */}
        {collaborators.map((collaborator) => (
          <div key={collaborator.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src={collaborator.profile?.profile_image_url || undefined} />
              <AvatarFallback>{getInitials(collaborator.profile)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{getName(collaborator.profile)}</p>
              <Badge className={getRoleBadgeColor(collaborator.role)}>{collaborator.role}</Badge>
            </div>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(collaborator.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {collaborators.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            No other collaborators yet. Invite someone to share this budget!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetContributors;