import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Hand, Zap, ListChecks, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChoresTabsProps {
  kidId: string;
  variant: "playful" | "modern";
  isDarkMode?: boolean;
}

interface Chore {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  due_date: string | null;
  icon: string;
  chore_type: string;
  is_bonus: boolean;
  claimed_by: string | null;
  family_group_id: string | null;
}

export function ChoresTabs({ kidId, variant, isDarkMode = false }: ChoresTabsProps) {
  const [myChores, setMyChores] = useState<Chore[]>([]);
  const [upForGrabs, setUpForGrabs] = useState<Chore[]>([]);
  const [activeTab, setActiveTab] = useState("my-chores");
  const isPlayful = variant === "playful";
  
  // Modern light mode colors  
  const getModernBg = () => isDarkMode ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white/90 backdrop-blur-sm border border-teal-100";
  const getModernTabBg = () => isDarkMode ? "bg-white/5" : "bg-teal-50/50";
  const getModernActiveTab = () => isDarkMode ? "bg-white/10 text-white" : "bg-white shadow-md text-teal-700";
  const getModernInactiveTab = () => isDarkMode ? "text-white/50" : "text-teal-500";
  const getModernText = () => isDarkMode ? "text-white" : "text-teal-800";
  const getModernTextMuted = () => isDarkMode ? "text-white/50" : "text-teal-600";
  const getModernCardBg = () => isDarkMode ? "bg-white/5" : "bg-teal-50/50";

  const fetchMyChores = async () => {
    const { data } = await supabase
      .from("kid_chores")
      .select("*")
      .eq("kid_id", kidId)
      .in("status", ["pending", "in_progress", "completed"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setMyChores(data);
  };

  const fetchUpForGrabs = async () => {
    const { data: kidData } = await supabase
      .from("family_group_members")
      .select("family_group_id")
      .eq("kid_profile_id", kidId)
      .single();

    if (!kidData?.family_group_id) return;

    const { data } = await supabase
      .from("kid_chores")
      .select("*")
      .eq("family_group_id", kidData.family_group_id)
      .eq("chore_type", "bonus")
      .is("claimed_by", null)
      .eq("status", "pending")
      .order("reward_amount", { ascending: false })
      .limit(10);

    if (data) setUpForGrabs(data);
  };

  useEffect(() => {
    fetchMyChores();
    fetchUpForGrabs();
  }, [kidId]);

  const handleComplete = async (choreId: string) => {
    await supabase
      .from("kid_chores")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", choreId);

    toast.success(isPlayful ? "Great job! ⭐" : "Marked complete!");
    fetchMyChores();
  };

  const handleClaim = async (choreId: string) => {
    const { data: chore } = await supabase
      .from("kid_chores")
      .select("claimed_by")
      .eq("id", choreId)
      .single();

    if (chore?.claimed_by) {
      toast.error("Someone already grabbed this!");
      fetchUpForGrabs();
      return;
    }

    await supabase
      .from("kid_chores")
      .update({ claimed_by: kidId, claimed_at: new Date().toISOString(), kid_id: kidId })
      .eq("id", choreId);

    toast.success(isPlayful ? "You got it! 🏆" : "Claimed!");
    fetchMyChores();
    fetchUpForGrabs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return isPlayful ? "bg-yellow-100 text-yellow-700" : "bg-yellow-500/20 text-yellow-400";
      case "completed": return isPlayful ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-400";
      default: return isPlayful ? "bg-gray-100 text-gray-700" : "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden ${
        isPlayful 
          ? "bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200/50" 
          : getModernBg()
      }`}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`w-full grid grid-cols-2 h-12 p-1 rounded-none ${
          isPlayful ? "bg-orange-100/50" : getModernTabBg()
        }`}>
          <TabsTrigger 
            value="my-chores" 
            className={`gap-2 rounded-xl transition-all ${
              activeTab === "my-chores"
                ? isPlayful ? "bg-white shadow-md text-orange-600" : getModernActiveTab()
                : isPlayful ? "text-orange-400" : getModernInactiveTab()
            }`}
          >
            <ListChecks className="h-4 w-4" />
            {isPlayful ? "My Chores ✅" : "My Tasks"}
          </TabsTrigger>
          <TabsTrigger 
            value="up-for-grabs" 
            className={`gap-2 rounded-xl transition-all relative ${
              activeTab === "up-for-grabs"
                ? isPlayful ? "bg-white shadow-md text-yellow-600" : getModernActiveTab()
                : isPlayful ? "text-yellow-500" : getModernInactiveTab()
            }`}
          >
            <Trophy className="h-4 w-4" />
            {isPlayful ? "Grab First! 🏆" : "Up for Grabs"}
            {upForGrabs.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-yellow-500 text-white text-[10px]">
                {upForGrabs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-chores" className="p-4 mt-0 space-y-2">
          {myChores.length > 0 ? (
            myChores.map((chore) => (
              <div
                key={chore.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  isPlayful ? "bg-white/80" : getModernCardBg()
                }`}
              >
                <span className="text-2xl">{chore.icon || "⭐"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isPlayful ? "text-orange-800" : getModernText()}`}>
                    {chore.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(chore.status)}`}>
                      {chore.status === "completed" ? "Done!" : "Todo"}
                    </span>
                    {chore.reward_amount > 0 && (
                      <span className={`text-xs font-bold ${isPlayful ? "text-yellow-600" : "text-emerald-400"}`}>
                        ${chore.reward_amount}
                      </span>
                    )}
                  </div>
                </div>
                {chore.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleComplete(chore.id)}
                    className={isPlayful ? "text-green-600 hover:bg-green-100" : "text-emerald-400"}
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                )}
                {chore.status === "completed" && <span className="text-green-500 text-xl">✓</span>}
              </div>
            ))
          ) : (
            <div className={`text-center py-6 ${isPlayful ? "text-orange-400" : getModernTextMuted()}`}>
              <span className="text-4xl block mb-2">🌟</span>
              <p className="text-sm">{isPlayful ? "No chores yet!" : "No tasks assigned"}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="up-for-grabs" className="p-4 mt-0 space-y-2">
          {upForGrabs.length > 0 ? (
            <>
              <p className={`text-xs mb-3 ${isPlayful ? "text-yellow-600" : isDarkMode ? "text-yellow-400/70" : "text-teal-600"}`}>
                {isPlayful ? "Be first to claim & complete for rewards! 🎁" : "Claim bonus tasks for extra rewards"}
              </p>
              {upForGrabs.map((chore) => (
                <div
                  key={chore.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isPlayful ? "bg-white/90 shadow-md" : getModernCardBg()
                  }`}
                >
                  <span className="text-2xl">{chore.icon || "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isPlayful ? "text-yellow-800" : getModernText()}`}>
                      {chore.title}
                    </p>
                    <span className={`text-sm font-bold ${isPlayful ? "text-yellow-600" : "text-emerald-500"}`}>
                      ${chore.reward_amount}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleClaim(chore.id)}
                    className={isPlayful 
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white" 
                      : "bg-yellow-500 hover:bg-yellow-600"
                    }
                  >
                    <Hand className="h-4 w-4 mr-1" />
                    Grab!
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <div className={`text-center py-6 ${isPlayful ? "text-yellow-500" : getModernTextMuted()}`}>
              <span className="text-4xl block mb-2">🏆</span>
              <p className="text-sm">{isPlayful ? "No bonus chores right now!" : "No available tasks"}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
