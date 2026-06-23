import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Users, User, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KidChatSection } from "@/components/kids/KidChatSection";
import { GroupChatSection } from "@/components/family/GroupChatSection";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LinkedKid {
  id: string;
  kid_profile_id: string;
  kid_profile: {
    id: string;
    display_name: string;
    avatar_emoji: string;
    avatar_url: string | null;
    current_balance: number;
  };
}

interface FamilyGroup {
  id: string;
  name: string;
  subscription_tier: "free" | "premium";
  group_message_count: number;
  group_message_limit: number;
}

type ChatMode = "individual" | "group";

export default function KidsChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [linkedKids, setLinkedKids] = useState<LinkedKid[]>([]);
  const [selectedKid, setSelectedKid] = useState<LinkedKid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("individual");
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch linked kids
      const { data: kidsData, error: kidsError } = await supabase
        .from("family_links")
        .select(`
          id,
          kid_profile_id,
          kid_profile:kids_profiles(id, display_name, avatar_emoji, avatar_url, current_balance)
        `)
        .eq("parent_user_id", user.id)
        .eq("status", "active");

      if (!kidsError && kidsData) {
        // Filter out any links where kid_profile is null (RLS blocked)
        const validKids = kidsData.filter((link: any) => link.kid_profile !== null);
        setLinkedKids(validKids as any);
        if (validKids.length > 0) {
          setSelectedKid(validKids[0] as any);
        }
      }

      // Fetch family group
      const { data: memberData } = await supabase
        .from("family_group_members")
        .select("family_group_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData?.family_group_id) {
        const { data: groupData } = await supabase
          .from("family_groups")
          .select("id, name, subscription_tier, group_message_count, group_message_limit")
          .eq("id", memberData.family_group_id)
          .single();

        if (groupData) {
          setFamilyGroup(groupData as FamilyGroup);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Please log in to chat with your kids</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {/* Sticky Page Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-b border-white/20 overflow-hidden">
        <div className="container px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-5 w-5 text-white" />
            <h1 className="text-lg font-bold text-white">My Kids Chat</h1>
          </motion.div>
        </div>
      </header>

      <div className="container px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading chats..." />
          </div>
        ) : linkedKids.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-bold mb-2">No Kids Linked</h2>
            <p className="text-muted-foreground mb-6">
              Link your child's account first to start messaging
            </p>
            <Button onClick={() => navigate("/kids")} className="gap-2">
              <Users className="h-5 w-5" />
              Go to My Kids
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Chat Mode Toggle */}
            {familyGroup && (
              <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <Button
                  variant={chatMode === "individual" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChatMode("individual")}
                  className={`gap-2 ${chatMode === "individual" ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}`}
                >
                  <User className="h-4 w-4" />
                  Individual
                </Button>
                <Button
                  variant={chatMode === "group" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChatMode("group")}
                  className={`gap-2 ${chatMode === "group" ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}`}
                >
                  <UsersRound className="h-4 w-4" />
                  Family Group
                </Button>
              </div>
            )}

            {chatMode === "individual" ? (
              <>
                {/* Kids Selector */}
                {linkedKids.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {linkedKids.map((link) => (
                      <motion.button
                        key={link.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedKid(link)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                          selectedKid?.id === link.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <span className="text-xl">{link.kid_profile.avatar_emoji}</span>
                        <span className="font-medium">{link.kid_profile.display_name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Individual Chat Section */}
                {selectedKid && (
                  <motion.div
                    key={selectedKid.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <KidChatSection
                      familyLinkId={selectedKid.id}
                      kidName={selectedKid.kid_profile.display_name}
                      kidAvatarEmoji={selectedKid.kid_profile.avatar_emoji}
                      kidAvatarUrl={selectedKid.kid_profile.avatar_url || undefined}
                    />
                  </motion.div>
                )}
              </>
            ) : (
              /* Group Chat Section */
              familyGroup && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GroupChatSection
                    familyGroupId={familyGroup.id}
                    groupName={familyGroup.name}
                    subscriptionTier={familyGroup.subscription_tier}
                    messageCount={familyGroup.group_message_count}
                    messageLimit={familyGroup.group_message_limit}
                    onUpgrade={() => navigate("/pricing")}
                  />
                </motion.div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
