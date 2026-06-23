import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Plus, Settings, Share2, Check, Crown, UserPlus, Trash2, 
  ChevronDown, ChevronUp, Sparkles, Shield 
} from "lucide-react";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useKidAvatarUrl } from "@/hooks/useKidAvatarUrl";

// Small wrapper so we can call the hook per-row inside a list
const KidAvatarImage = ({ value, alt }: { value?: string | null; alt?: string }) => {
  const src = useKidAvatarUrl(value);
  if (!src) return null;
  return <AvatarImage src={src} alt={alt} />;
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";

interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  subscription_tier: "free" | "premium";
  max_kids: number;
  invite_code: string;
  group_message_count: number;
  group_message_limit: number;
  created_at: string;
}

interface FamilyMember {
  id: string;
  family_group_id: string;
  user_id: string | null;
  kid_profile_id: string | null;
  member_type: "parent" | "kid";
  role: "primary" | "secondary" | "member";
  joined_at: string;
  profile?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  kid_profile?: {
    display_name?: string;
    avatar_emoji?: string;
    avatar_url?: string;
  };
}

interface LinkedKid {
  kid_profile_id: string;
  kid_profile: {
    id: string;
    display_name: string;
    avatar_emoji: string;
  };
}

export const FamilyGroupManager = () => {
  const { user } = useAuth();
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [linkedKids, setLinkedKids] = useState<LinkedKid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAddKidModal, setShowAddKidModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Check if user is admin based on email from database
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("admin_emails")
        .select("email")
        .ilike("email", user.email)
        .single();
      
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user?.email]);

  const fetchFamilyGroup = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: memberData } = await supabase
      .from("family_group_members")
      .select(`
        family_group_id,
        family_groups(*)
      `)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (memberData?.family_groups) {
      setFamilyGroup(memberData.family_groups as unknown as FamilyGroup);
      await fetchMembers(memberData.family_group_id);
    }

    const { data: kidsData } = await supabase
      .from("family_links")
      .select(`
        kid_profile_id,
        kid_profile:kids_profiles(id, display_name, avatar_emoji)
      `)
      .eq("parent_user_id", user.id)
      .eq("status", "active");

    if (kidsData) {
      setLinkedKids(kidsData as unknown as LinkedKid[]);
    }

    setIsLoading(false);
  };

  const fetchMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from("family_group_members")
      .select(`
        id,
        family_group_id,
        user_id,
        kid_profile_id,
        member_type,
        role,
        joined_at,
        kid_profile:kids_profiles(id, display_name, avatar_emoji, avatar_url)
      `)
      .eq("family_group_id", groupId);

    if (error) {
      console.error("Error fetching members:", error);
    }
    
    // Fetch profiles separately for parent members since there's no FK relationship
    if (data) {
      const parentUserIds = data
        .filter(m => m.member_type === "parent" && m.user_id)
        .map(m => m.user_id as string);
      
      let profilesMap: Record<string, { first_name?: string; last_name?: string; email?: string; profile_image_url?: string }> = {};
      
      if (parentUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, profile_image_url")
          .in("id", parentUserIds);
        
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map(p => [p.id, p])
          );
        }
      }
      
      // Merge profiles into member data
      const membersWithProfiles = data.map(m => ({
        ...m,
        profile: m.user_id ? profilesMap[m.user_id] : undefined,
      }));
      
      setMembers(membersWithProfiles as unknown as FamilyMember[]);
    }
    
    // Re-fetch linked kids to update available list
    const { data: kidsData } = await supabase
      .from("family_links")
      .select(`
        kid_profile_id,
        kid_profile:kids_profiles(id, display_name, avatar_emoji)
      `)
      .eq("parent_user_id", user?.id || '')
      .eq("status", "active");

    if (kidsData) {
      setLinkedKids(kidsData as unknown as LinkedKid[]);
    }
  };

  useEffect(() => {
    fetchFamilyGroup();
  }, [user]);

  const createFamilyGroup = async () => {
    if (!user || !groupName.trim()) return;

    try {
      const { data: group, error: groupError } = await supabase
        .from("family_groups")
        .insert({
          name: groupName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("family_group_members")
        .insert({
          family_group_id: group.id,
          user_id: user.id,
          member_type: "parent",
          role: "primary",
        });

      if (memberError) throw memberError;

      toast.success("Family group created!");
      setShowCreateModal(false);
      setGroupName("");
      fetchFamilyGroup();
    } catch (error: any) {
      console.error("Create group error:", error);
      toast.error(error.message || "Failed to create family group");
    }
  };

  const joinFamilyGroup = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      const { data: group, error: findError } = await supabase
        .from("family_groups")
        .select("*")
        .eq("invite_code", joinCode.trim().toLowerCase())
        .single();

      if (findError || !group) {
        toast.error("Invalid invite code");
        return;
      }

      const { data: existing } = await supabase
        .from("family_group_members")
        .select("id")
        .eq("family_group_id", group.id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast.error("You're already a member of this group");
        return;
      }

      const { error: joinError } = await supabase
        .from("family_group_members")
        .insert({
          family_group_id: group.id,
          user_id: user.id,
          member_type: "parent",
          role: "secondary",
        });

      if (joinError) throw joinError;

      toast.success(`Joined ${group.name}!`);
      setShowJoinModal(false);
      setJoinCode("");
      fetchFamilyGroup();
    } catch (error: any) {
      console.error("Join group error:", error);
      toast.error(error.message || "Failed to join family group");
    }
  };

  const addKidToGroup = async (kidProfileId: string) => {
    if (!familyGroup) return;

    try {
      const kidCount = members.filter(m => m.member_type === "kid").length;
      if (familyGroup.subscription_tier === "free" && kidCount >= familyGroup.max_kids) {
        toast.error(`Free tier limited to ${familyGroup.max_kids} kids. Upgrade to premium for unlimited!`);
        return;
      }

      // Check if already in group (double-check against DB)
      const { data: existingMember } = await supabase
        .from("family_group_members")
        .select("id")
        .eq("family_group_id", familyGroup.id)
        .eq("kid_profile_id", kidProfileId)
        .maybeSingle();

      if (existingMember) {
        toast.info("This child is already in the group");
        setShowAddKidModal(false);
        await fetchMembers(familyGroup.id);
        return;
      }

      const { error } = await supabase
        .from("family_group_members")
        .insert({
          family_group_id: familyGroup.id,
          kid_profile_id: kidProfileId,
          member_type: "kid",
          role: "member",
        });

      if (error) throw error;

      toast.success("Child added to family group!");
      setShowAddKidModal(false);
      await fetchMembers(familyGroup.id);
    } catch (error: any) {
      console.error("Add kid error:", error);
      if (error.message?.includes("unique_kid_per_group")) {
        toast.info("This child is already in the group");
        setShowAddKidModal(false);
        await fetchMembers(familyGroup.id);
      } else {
        toast.error(error.message || "Failed to add child");
      }
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("family_group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed");
      if (familyGroup) await fetchMembers(familyGroup.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const leaveGroup = async () => {
    if (!familyGroup || !user) return;

    try {
      const { error } = await supabase
        .from("family_group_members")
        .delete()
        .eq("family_group_id", familyGroup.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Left family group");
      setFamilyGroup(null);
      setMembers([]);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to leave group");
    }
  };

  const shareInviteCode = async () => {
    if (familyGroup?.invite_code) {
      const success = await smartShare({
        url: familyGroup.invite_code,
        title: `Join ${familyGroup.name} on CoinsBloom`,
        text: `Use this code to join our family group: ${familyGroup.invite_code}`,
      });
      if (success && !supportsNativeShare()) {
        setCopied(true);
        toast.success("Invite code copied!");
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const isPrimaryParent = members.find(m => m.user_id === user?.id)?.role === "primary";
  const availableKidsToAdd = linkedKids.filter(
    k => !members.find(m => m.kid_profile_id === k.kid_profile_id)
  );

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-200/50">
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (!familyGroup) {
    return (
      <>
        <Card className="border-dashed border-purple-300/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6 px-4">
            <div className="relative">
              <div className="text-5xl sm:text-6xl">👨‍👩‍👧‍👦</div>
              <motion.div 
                className="absolute -top-2 -right-2 sm:right-8"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
              </motion.div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create a Family Group
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Chat together, share chores, and manage allowances as a family!
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:gap-3">
              <Button 
                onClick={() => setShowCreateModal(true)} 
                className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="h-4 w-4" />
                Create Family Group
              </Button>
              <Button variant="outline" onClick={() => setShowJoinModal(true)} className="gap-2 border-purple-200">
                <UserPlus className="h-4 w-4" />
                Join with Code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-500" />
                Create Family Group
              </DialogTitle>
              <DialogDescription>
                Give your family group a name. You can invite your partner and add your kids.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Family Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="The Smith Family"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createFamilyGroup} 
                disabled={!groupName.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Join Modal */}
        <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-500" />
                Join Family Group
              </DialogTitle>
              <DialogDescription>
                Enter the invite code shared by your partner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Invite Code</Label>
                <Input
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="abc123def456"
                  className="font-mono"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowJoinModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={joinFamilyGroup} 
                disabled={!joinCode.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Join Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const parentCount = members.filter(m => m.member_type === "parent").length;
  const kidCount = members.filter(m => m.member_type === "kid").length;

  return (
    <>
      {/* Compact Header Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200/50 dark:border-purple-800/50 overflow-hidden">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">{familyGroup.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant={(isAdmin || familyGroup.subscription_tier === "premium") ? "default" : "secondary"}
                    className={(isAdmin || familyGroup.subscription_tier === "premium")
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-xs" 
                      : "text-xs"
                    }
                  >
                    {isAdmin ? (
                      <><Crown className="h-3 w-3 mr-1" /> Admin</>
                    ) : familyGroup.subscription_tier === "premium" ? (
                      <><Crown className="h-3 w-3 mr-1" /> Premium</>
                    ) : "Free"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {parentCount} parent{parentCount !== 1 ? 's' : ''} • {kidCount} kid{kidCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isPrimaryParent && (
                <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                className="h-8 w-8"
              >
                {isHeaderExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isHeaderExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-4 px-4 space-y-4">
                {/* Invite Code */}
                <div className="bg-background/60 backdrop-blur rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Invite Code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted/50 px-3 py-1.5 rounded-md font-mono text-xs sm:text-sm truncate">
                      {familyGroup.invite_code}
                    </code>
                    <Button variant="outline" size="sm" onClick={shareInviteCode} className="shrink-0 h-8">
                      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Share2 className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share with your partner to join
                  </p>
                </div>

                {/* Message Limit (Free tier only, hide for admins) */}
                {familyGroup.subscription_tier === "free" && !isAdmin && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="text-xs">
                        {familyGroup.group_message_count}/{familyGroup.group_message_limit} messages used
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-7 text-xs gap-1 bg-gradient-to-r from-purple-500 to-pink-500"
                      onClick={() => setShowSubscriptionModal(true)}
                    >
                      <Sparkles className="h-3 w-3" />
                      Upgrade
                    </Button>
                  </div>
                )}
                {/* Admin badge */}
                {isAdmin && (
                  <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-3 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">Admin: Unlimited access</span>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Collapsible Members Section */}
      <Collapsible open={isMembersExpanded} onOpenChange={setIsMembersExpanded}>
        <Card className="border-purple-100/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Family Members ({members.length})</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {availableKidsToAdd.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setShowAddKidModal(true); }} 
                      className="gap-1 h-7 text-xs border-purple-200"
                    >
                      <Plus className="h-3 w-3" />
                      Add Child
                    </Button>
                  )}
                  {isMembersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-3 px-4">
              <div className="space-y-2">
                {members.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        {member.member_type === "kid" ? (
                          <KidAvatarImage value={member.kid_profile?.avatar_url} alt={member.kid_profile?.display_name || "Child"} />
                        ) : (
                          member.profile?.profile_image_url ? (
                            <AvatarImage src={member.profile.profile_image_url} alt={member.profile.first_name || "Parent"} />
                          ) : null
                        )}
                        <AvatarFallback className={
                          member.member_type === "kid" 
                            ? "bg-gradient-to-br from-pink-200 to-purple-200 text-lg"
                            : "bg-gradient-to-br from-blue-200 to-cyan-200 text-sm"
                        }>
                          {member.member_type === "kid" 
                            ? member.kid_profile?.avatar_emoji || "🧒"
                            : member.profile?.first_name?.[0]?.toUpperCase() || "👤"
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {member.member_type === "kid"
                              ? member.kid_profile?.display_name || "Child"
                              : member.profile?.first_name || "Parent"
                            }
                          </span>
                          {member.role === "primary" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-purple-200">
                              <Crown className="h-2.5 w-2.5 mr-0.5 text-purple-500" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {member.member_type}
                        </span>
                      </div>
                    </div>
                    
                    {isPrimaryParent && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add Kid Modal */}
      <Dialog open={showAddKidModal} onOpenChange={setShowAddKidModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Child to Group</DialogTitle>
            <DialogDescription>
              Select a linked child to add to your family group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {availableKidsToAdd.map((kid) => (
              <Button
                key={kid.kid_profile_id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => addKidToGroup(kid.kid_profile_id)}
              >
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-xl">
                    {kid.kid_profile?.avatar_emoji || "🧒"}
                  </AvatarFallback>
                </Avatar>
                <span>{kid.kid_profile?.display_name}</span>
              </Button>
            ))}
            {availableKidsToAdd.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                All linked children are already in the group.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave/Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Family Group?</AlertDialogTitle>
            <AlertDialogDescription>
              {isPrimaryParent
                ? "As the primary parent, leaving will remove the entire group. This action cannot be undone."
                : "Are you sure you want to leave this family group?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={leaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPrimaryParent ? "Delete Group" : "Leave Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        currentTier={familyGroup?.subscription_tier || "free"}
      />
    </>
  );
};
