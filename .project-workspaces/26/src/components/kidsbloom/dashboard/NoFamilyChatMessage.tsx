import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Users, Share2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface NoFamilyChatMessageProps {
  open: boolean;
  onClose: () => void;
  kidId: string;
  kidUsername?: string;
  variant: "playful" | "modern";
}

export function NoFamilyChatMessage({ 
  open, 
  onClose, 
  kidId,
  kidUsername,
  variant 
}: NoFamilyChatMessageProps) {
  const isPlayful = variant === "playful";
  const [copied, setCopied] = useState(false);
  const [familyCode, setFamilyCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleShareUsername = async () => {
    if (kidUsername) {
      const success = await smartShare({
        url: kidUsername,
        title: "My CoinsBloom Username",
        text: `My CoinsBloom username is: ${kidUsername}. Use this to add me to your family!`,
      });
      if (success && !supportsNativeShare()) {
        setCopied(true);
        toast.success(isPlayful ? "Copied! 📋" : "Username copied");
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleJoinFamily = async () => {
    if (!familyCode.trim()) {
      toast.error(isPlayful ? "Enter a code first! 🔑" : "Please enter a family code");
      return;
    }

    setIsJoining(true);
    try {
      // Look up family group by invite code
      const { data: familyGroup, error: groupError } = await supabase
        .from("family_groups")
        .select("id, name, created_by")
        .eq("invite_code", familyCode.trim().toLowerCase())
        .single();

      if (groupError || !familyGroup) {
        toast.error(isPlayful ? "Code not found! Try again 🔍" : "Invalid family code");
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("family_group_members")
        .select("id")
        .eq("family_group_id", familyGroup.id)
        .eq("kid_profile_id", kidId)
        .single();

      if (existingMember) {
        toast.info(isPlayful ? "You're already in this family! 👨‍👩‍👧" : "Already a member of this family");
        return;
      }

      // Add kid to family group
      const { error: memberError } = await supabase
        .from("family_group_members")
        .insert({
          family_group_id: familyGroup.id,
          kid_profile_id: kidId,
          member_type: "kid",
          role: "member"
        });

      if (memberError) throw memberError;

      // Create a family link with the group creator
      const { error: linkError } = await supabase
        .from("family_links")
        .insert({
          parent_user_id: familyGroup.created_by,
          kid_profile_id: kidId,
          relationship: "parent",
          status: "active",
          accepted_at: new Date().toISOString()
        });

      if (linkError) throw linkError;

      toast.success(isPlayful ? "You joined the family! 🎉" : "Successfully joined family!");
      onClose();
      // Refresh the page to load family data
      window.location.reload();
    } catch (error) {
      console.error("Join family error:", error);
      toast.error(isPlayful ? "Something went wrong! 😢" : "Failed to join family");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className={`mx-auto max-w-lg rounded-t-3xl ${
        isPlayful 
          ? "bg-gradient-to-b from-purple-100 via-pink-50 to-white" 
          : "bg-gradient-to-b from-slate-50 via-gray-50 to-emerald-50"
      }`}>
        <DrawerHeader className="border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <DrawerTitle className={isPlayful ? "text-purple-700" : "text-emerald-800"}>
              {isPlayful ? "Family Chat 💬" : "Family Chat"}
            </DrawerTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6">
          {/* No Family Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
              isPlayful 
                ? "bg-purple-100" 
                : "bg-emerald-100"
            }`}>
              <Users className={`h-10 w-10 ${isPlayful ? "text-purple-500" : "text-emerald-600"}`} />
            </div>
            
            <h3 className={`text-lg font-semibold mb-2 ${
              isPlayful ? "text-purple-700" : "text-slate-800"
            }`}>
              {isPlayful ? "No family connected yet! 👨‍👩‍👧" : "Not connected to a family"}
            </h3>
            
            <p className={`text-sm mb-6 ${
              isPlayful ? "text-purple-600/70" : "text-slate-600"
            }`}>
              {isPlayful 
                ? "Ask a parent to add you, or enter a family code below!" 
                : "Ask your parent to link your account, or join with a family code"}
            </p>
          </motion.div>

          {/* Share Username Section */}
          {kidUsername && (
            <div className={`p-4 rounded-xl ${
              isPlayful ? "bg-white/80" : "bg-white"
            } shadow-sm`}>
              <p className={`text-sm font-medium mb-2 ${
                isPlayful ? "text-purple-600" : "text-slate-700"
              }`}>
                {isPlayful ? "📝 Share your username with a parent:" : "Share your username:"}
              </p>
              <div className="flex items-center gap-2">
                <div className={`flex-1 p-3 rounded-lg font-mono text-center ${
                  isPlayful 
                    ? "bg-purple-50 text-purple-700" 
                    : "bg-emerald-50 text-emerald-700"
                }`}>
                  {kidUsername}
                </div>
                <Button
                  size="icon"
                  onClick={handleShareUsername}
                  className={isPlayful 
                    ? "bg-purple-500 hover:bg-purple-600" 
                    : "bg-emerald-600 hover:bg-emerald-700"
                  }
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Join with Family Code */}
          <div className={`p-4 rounded-xl ${
            isPlayful ? "bg-white/80" : "bg-white"
          } shadow-sm`}>
            <p className={`text-sm font-medium mb-2 ${
              isPlayful ? "text-purple-600" : "text-slate-700"
            }`}>
              {isPlayful ? "🔑 Have a family code? Enter it here:" : "Enter family code:"}
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                placeholder={isPlayful ? "Enter code..." : "Family code"}
                className={isPlayful 
                  ? "border-purple-200 focus:border-purple-400" 
                  : "border-emerald-200 focus:border-emerald-400"
                }
              />
              <Button
                onClick={handleJoinFamily}
                disabled={isJoining}
                className={isPlayful 
                  ? "bg-purple-500 hover:bg-purple-600" 
                  : "bg-emerald-600 hover:bg-emerald-700"
                }
              >
                {isJoining ? "..." : "Join"}
              </Button>
            </div>
          </div>

          {/* Info */}
          <p className={`text-xs text-center ${
            isPlayful ? "text-purple-400" : "text-slate-400"
          }`}>
            {isPlayful 
              ? "💡 Parents can find their family code in their app settings!" 
              : "Parents can find the family code in their app settings"}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}