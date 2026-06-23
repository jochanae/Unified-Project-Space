import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Mail, UserPlus, Trash2, Crown, Eye, Edit, Link, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";

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

interface InviteBudgetCollaboratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
}

const InviteBudgetCollaboratorModal = ({
  open,
  onOpenChange,
  budgetId,
  budgetName,
}: InviteBudgetCollaboratorModalProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [copied, setCopied] = useState(false);

  const joinLink = `${window.location.origin}/budgets/join/${budgetId}`;

  useEffect(() => {
    if (open && budgetId) {
      fetchCollaborators();
    }
  }, [open, budgetId]);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_collaborators")
        .select("*")
        .eq("budget_id", budgetId);

      if (error) throw error;

      if (data) {
        // Fetch profiles for collaborators
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
    }
  };

  const handleInvite = async () => {
    if (!user || !email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      // Look up user by email in profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (profileError || !profileData) {
        // User doesn't have an account - create a pending invitation
        const inviteToken = crypto.randomUUID();
        const { error: inviteError } = await supabase
          .from("budget_invitations")
          .insert({
            budget_id: budgetId,
            email: email.toLowerCase().trim(),
            role: role,
            invited_by: user.id,
            status: "pending",
            invite_token: inviteToken,
          });

        if (inviteError) {
          if (inviteError.code === "23505") {
            toast.error("An invitation has already been sent to this email");
          } else {
            throw inviteError;
          }
        } else {
          // Log activity
          await supabase.from("budget_activity").insert({
            budget_id: budgetId,
            user_id: user.id,
            activity_type: "invitation_sent",
            description: `Sent invitation to ${email} as ${role}`,
          });

          toast.success(
            `Invitation sent to ${email}! They'll be able to join once they create an account.`,
            { duration: 5000 }
          );
        }
        setEmail("");
        setLoading(false);
        return;
      }

      // User exists - check if already a collaborator
      const existingCollab = collaborators.find(c => c.user_id === profileData.id);
      if (existingCollab) {
        toast.error("This user is already a collaborator");
        setLoading(false);
        return;
      }

      // Add as collaborator directly
      const { error } = await supabase
        .from("budget_collaborators")
        .insert({
          budget_id: budgetId,
          user_id: profileData.id,
          role: role,
        });

      if (error) throw error;

      // Log activity
      await supabase.from("budget_activity").insert({
        budget_id: budgetId,
        user_id: user.id,
        activity_type: "collaborator_joined",
        description: `Added ${email} as ${role}`,
      });

      toast.success(`Added ${email} as ${role}`);
      setEmail("");
      fetchCollaborators();
    } catch (error) {
      console.error("Error inviting collaborator:", error);
      toast.error("Failed to send invitation");
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

  const handleShareLink = async () => {
    const success = await smartShare({
      url: joinLink,
      title: `Join "${budgetName}" Budget`,
      text: `You've been invited to collaborate on the "${budgetName}" budget on CoinsBloom!`,
    });
    if (success && !supportsNativeShare()) {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "editor":
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "editor":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Invite Collaborators
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Budget: {budgetName}
          </p>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Share Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4 space-y-4">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="collaborator@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "editor" | "viewer")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>Viewer - Can view only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          <span>Editor - Can add expenses</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleInvite}
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? "Adding..." : "Add Collaborator"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-4">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share this link with anyone you want to invite. They'll be able to join as a viewer.
                </p>

                <div className="flex gap-2">
                  <Input
                    value={joinLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={handleShareLink}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Current Collaborators */}
        <div className="space-y-3 mt-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaborators ({collaborators.length})
          </h3>

          {collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No collaborators yet
            </p>
          ) : (
            <div className="space-y-2">
              {collaborators.map((collab) => (
                <Card key={collab.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-semibold">
                        {getInitials(collab.profile)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {getName(collab.profile)}
                        </p>
                        <Badge className={`text-xs ${getRoleBadgeColor(collab.role)}`}>
                          {collab.role}
                        </Badge>
                      </div>
                    </div>
                    {collab.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(collab.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteBudgetCollaboratorModal;