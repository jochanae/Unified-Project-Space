import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Users, DollarSign, CheckCircle, MessageCircle, TrendingUp, Settings, UsersRound, ClipboardList, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { LinkedKidCard } from "@/components/kids/LinkedKidCard";
import { PendingChoresSection } from "@/components/kids/PendingChoresSection";
import { AllowanceManager } from "@/components/kids/AllowanceManager";
import { KidSpendingOverview } from "@/components/kids/KidSpendingOverview";
import { LinkKidModal } from "@/components/kids/LinkKidModal";
import { KidChatSection } from "@/components/kids/KidChatSection";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FamilyGroupManager, GroupChatSection, SharedChoreBoard } from "@/components/family";
import { HouseholdTaskBoard } from "@/components/household";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FamilyExpectationsParent } from "@/components/kidsbloom/expectations";

interface LinkedKid {
  id: string;
  kid_profile_id: string;
  relationship: string;
  status: string;
  kid_profile: {
    id: string;
    display_name: string;
    avatar_emoji: string;
    avatar_url: string | null;
    age_tier: string;
    current_balance: number;
    total_earned: number;
    total_spent: number;
  };
}

interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  subscription_tier: "free" | "premium";
  max_kids: number;
  invite_code: string;
  group_message_count: number;
  group_message_limit: number;
}

export default function Kids() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { tier, subscribed } = useSubscription();
  const [linkedKids, setLinkedKids] = useState<LinkedKid[]>([]);
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"kids" | "household" | "family">("kids");
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);

  const isPremium = subscribed || tier === "premium" || tier === "family";

  // Open link modal if navigated with state
  useEffect(() => {
    if (location.state?.openLinkModal) {
      setShowLinkModal(true);
      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchLinkedKids = useCallback(async (showRefresh = false) => {
    if (!user) return;

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Use secure backend function to fetch linked kid profiles and avoid RLS issues
      const { data: kidProfiles, error: kidsError } = await supabase
        .rpc("get_linked_kids_profiles", { p_parent_id: user.id });

      if (kidsError) {
        console.error("Error fetching linked kid profiles:", kidsError);
        toast.error("Unable to load linked kids right now.");
        setLinkedKids([]);
        return;
      }

      const profiles = kidProfiles ?? [];

      // Fetch corresponding family_links so we still have link ids and relationships
      let links: any[] = [];
      if (profiles.length > 0) {
        const { data: linkData, error: linksError } = await supabase
          .from("family_links")
          .select("id, kid_profile_id, relationship, status")
          .eq("parent_user_id", user.id)
          .eq("status", "active")
          .in(
            "kid_profile_id",
            profiles.map((p: any) => p.id)
          );

        if (linksError) {
          console.error("Error fetching family links:", linksError);
        } else {
          links = linkData || [];
        }
      }

      const combined: LinkedKid[] = profiles.map((kid: any) => {
        const link = links.find((l) => l.kid_profile_id === kid.id);

        return {
          id: link?.id ?? kid.id,
          kid_profile_id: kid.id,
          relationship: link?.relationship ?? "parent",
          status: link?.status ?? "active",
          kid_profile: {
            id: kid.id,
            display_name: kid.display_name,
            avatar_emoji: kid.avatar_emoji,
            avatar_url: kid.avatar_url,
            age_tier: kid.age_tier,
            current_balance: kid.current_balance,
            total_earned: kid.total_earned,
            total_spent: kid.total_spent,
          },
        };
      });

      setLinkedKids(combined);

      // Only set selected kid if none is currently selected
      setSelectedKid(prev => {
        if (combined.length > 0 && !prev) {
          return combined[0].kid_profile_id;
        }
        return prev;
      });
      
      if (showRefresh) {
        toast.success("Data refreshed!");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const fetchFamilyGroup = useCallback(async () => {
    if (!user) return;

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
    }
  }, [user]);

  const handleRefresh = () => {
    fetchLinkedKids(true);
    fetchFamilyGroup();
  };

  useEffect(() => {
    if (user) {
      fetchLinkedKids();
      fetchFamilyGroup();
    }
  }, [user, fetchLinkedKids, fetchFamilyGroup]);

  const selectedKidData = linkedKids.find(k => k.kid_profile_id === selectedKid);

  const handleUpgrade = () => {
    navigate("/settings");
    toast.info("Navigate to Plans & Billing to upgrade to Premium");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Please log in to manage your kids</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <DashboardHeader />
      {/* Page Header */}
      <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-b border-white/20 overflow-hidden">
        <div className="container px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <Users className="h-5 w-5 text-white" />
              <h1 className="text-xl font-bold text-white">My Kids</h1>
            </motion.div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowLinkModal(true)} className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0">
              <Plus className="h-4 w-4" />
              Link Child
            </Button>
          </div>
        </div>
        
        {/* Main Tab Selector */}
        <div className="container px-4 pb-2">
          <div className="flex gap-2">
            <Button
              variant={activeMainTab === "kids" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveMainTab("kids")}
              className={activeMainTab === "kids" ? "bg-white text-purple-600" : "text-white hover:bg-white/20"}
            >
              <Users className="h-4 w-4 mr-1" />
              Kids
            </Button>
            <Button
              variant={activeMainTab === "household" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveMainTab("household")}
              className={activeMainTab === "household" ? "bg-white text-purple-600" : "text-white hover:bg-white/20"}
            >
              <ClipboardList className="h-4 w-4 mr-1" />
              Household
            </Button>
            <Button
              variant={activeMainTab === "family" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveMainTab("family")}
              className={activeMainTab === "family" ? "bg-white text-purple-600" : "text-white hover:bg-white/20"}
            >
              <UsersRound className="h-4 w-4 mr-1" />
              Family
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        {activeMainTab === "kids" ? (
          // Individual Kids Management
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading your kids..." />
              </div>
            ) : linkedKids.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                <h2 className="text-2xl font-bold mb-2">No Kids Linked Yet</h2>
                <p className="text-muted-foreground mb-6">
                  Link your child's KidsBloom account to monitor their progress and manage allowances
                </p>
                <Button onClick={() => setShowLinkModal(true)} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Link a Child
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {/* Kids Selector */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {linkedKids.map((link) => (
                    <LinkedKidCard
                      key={link.id}
                      kid={link.kid_profile}
                      isSelected={selectedKid === link.kid_profile_id}
                      onClick={() => setSelectedKid(link.kid_profile_id)}
                    />
                  ))}
                </div>

                {/* Selected Kid Management */}
                {selectedKidData && (
                  <motion.div
                    key={selectedKid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Tabs defaultValue="overview" className="space-y-4">
                      <TabsList className="grid grid-cols-5 w-full h-auto p-1.5 gap-1">
                        <TabsTrigger value="overview" className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md data-[state=active]:rounded-md">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span className="text-[10px]">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="expectations" className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md data-[state=active]:rounded-md">
                          <FileText className="h-4 w-4 text-emerald-500" />
                          <span className="text-[10px]">Expectations</span>
                        </TabsTrigger>
                        <TabsTrigger value="chores" className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md data-[state=active]:rounded-md">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-[10px]">Chores</span>
                        </TabsTrigger>
                        <TabsTrigger value="allowance" className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md data-[state=active]:rounded-md">
                          <DollarSign className="h-4 w-4 text-amber-500" />
                          <span className="text-[10px]">Allowance</span>
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md data-[state=active]:rounded-md">
                          <MessageCircle className="h-4 w-4 text-purple-500" />
                          <span className="text-[10px]">Chat</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview">
                        <KidSpendingOverview
                          kidId={selectedKidData.kid_profile_id}
                          kidProfile={selectedKidData.kid_profile}
                        />
                      </TabsContent>

                      <TabsContent value="expectations">
                        <FamilyExpectationsParent
                          kidProfileId={selectedKidData.kid_profile_id}
                          kidName={selectedKidData.kid_profile.display_name}
                        />
                      </TabsContent>

                      <TabsContent value="chores">
                        <PendingChoresSection
                          kidId={selectedKidData.kid_profile_id}
                          kidName={selectedKidData.kid_profile.display_name}
                          familyGroupId={familyGroup?.id}
                          onApprove={fetchLinkedKids}
                        />
                      </TabsContent>

                      <TabsContent value="allowance">
                        <AllowanceManager
                          kidId={selectedKidData.kid_profile_id}
                          familyLinkId={selectedKidData.id}
                          kidName={selectedKidData.kid_profile.display_name}
                        />
                      </TabsContent>

                      <TabsContent value="chat">
                        <KidChatSection
                          familyLinkId={selectedKidData.id}
                          kidName={selectedKidData.kid_profile.display_name}
                          kidAvatarEmoji={selectedKidData.kid_profile.avatar_emoji}
                          kidAvatarUrl={selectedKidData.kid_profile.avatar_url}
                        />
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}
              </div>
            )}
          </>
        ) : activeMainTab === "household" ? (
          // Household Task Board
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <HouseholdTaskBoard
              familyGroupId={familyGroup?.id}
              linkedKids={linkedKids}
              onRefresh={fetchLinkedKids}
            />
          </motion.div>
        ) : (
          // Family Group Management
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Family Group Manager */}
            <FamilyGroupManager />

            {/* Group Features - Only show if group exists */}
            {familyGroup && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Group Chat */}
                <GroupChatSection
                  familyGroupId={familyGroup.id}
                  groupName={familyGroup.name}
                  subscriptionTier={familyGroup.subscription_tier}
                  messageCount={familyGroup.group_message_count}
                  messageLimit={familyGroup.group_message_limit}
                  onUpgrade={handleUpgrade}
                />

                {/* Shared Chore Board */}
                <SharedChoreBoard familyGroupId={familyGroup.id} />
              </div>
            )}
          </motion.div>
        )}
      </div>

      <LinkKidModal
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        onSuccess={() => fetchLinkedKids(false)}
      />
    </div>
  );
}
