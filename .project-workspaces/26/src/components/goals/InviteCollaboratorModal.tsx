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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Mail, Link, Check, UserPlus, Crown, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";

type CollaboratorRole = Database["public"]["Enums"]["collaborator_role"];

interface InviteCollaboratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle: string;
}

const roles: { value: CollaboratorRole; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "organizer", label: "Organizer", description: "Can manage goal and approve contributions", icon: <Crown className="h-4 w-4" /> },
  { value: "contributor", label: "Contributor", description: "Can add contributions and comment", icon: <Users className="h-4 w-4" /> },
  { value: "viewer", label: "Viewer", description: "Can only view progress and comment", icon: <Eye className="h-4 w-4" /> },
];

const InviteCollaboratorModal = ({ open, onOpenChange, goalId, goalTitle }: InviteCollaboratorModalProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("contributor");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchPendingInvites();
    }
  }, [open, goalId]);

  const fetchPendingInvites = async () => {
    const { data } = await supabase
      .from("goal_invitations")
      .select("*")
      .eq("goal_id", goalId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    setPendingInvites(data || []);
  };

  const handleSendInvite = async () => {
    if (!user) {
      toast.error("Please sign in to send invites");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const inviteToken = crypto.randomUUID();
      const { error } = await supabase.from("goal_invitations").insert({
        goal_id: goalId,
        email: email.trim().toLowerCase(),
        role: role,
        invited_by: user.id,
        invite_token: inviteToken,
      });

      if (error) throw error;

      // Log activity
      await supabase.from("goal_activity").insert({
        goal_id: goalId,
        user_id: user.id,
        activity_type: "invitation_sent",
        description: `Sent invitation to ${email}`,
        metadata: { email: email.trim().toLowerCase(), role },
      });

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      fetchPendingInvites();
    } catch (error: any) {
      console.error("Error sending invite:", error);
      if (error.code === "23505") {
        toast.error("An invitation has already been sent to this email");
      } else {
        toast.error("Failed to send invitation");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = async () => {
    const inviteLink = `${window.location.origin}/goals/join/${goalId}`;
    const success = await smartShare({
      url: inviteLink,
      title: `Join "${goalTitle}" Goal`,
      text: `You've been invited to collaborate on the "${goalTitle}" goal on CoinsBloom!`,
    });
    if (success && !supportsNativeShare()) {
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("goal_invitations")
        .update({ status: "expired" })
        .eq("id", inviteId);

      if (error) throw error;
      toast.success("Invitation cancelled");
      fetchPendingInvites();
    } catch (error) {
      console.error("Error cancelling invite:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Collaborators
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Invite others to contribute to "{goalTitle}"
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        {r.icon}
                        <div>
                          <p className="font-medium">{r.label}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600"
              onClick={handleSendInvite}
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending..." : "Send Invitation"}
            </Button>

            {/* Pending invitations */}
            {pendingInvites.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-muted-foreground">Pending Invitations</Label>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invite.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {invite.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Expires in {Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Link className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Share this link with anyone you want to invite to your goal
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/goals/join/${goalId}`}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  onClick={handleShareLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Anyone with this link can request to join your goal. You'll need to approve their request.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InviteCollaboratorModal;
