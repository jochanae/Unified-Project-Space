import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";

interface JoinFamilySectionProps {
  kidId: string;
  kidUsername?: string;
  variant: "playful" | "modern";
  hasFamilyLink: boolean;
  familyName?: string;
}

export function JoinFamilySection({ 
  kidId, 
  kidUsername, 
  variant, 
  hasFamilyLink,
  familyName 
}: JoinFamilySectionProps) {
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
      // Refresh the page to load family data
      window.location.reload();
    } catch (error) {
      console.error("Join family error:", error);
      toast.error(isPlayful ? "Something went wrong! 😢" : "Failed to join family");
    } finally {
      setIsJoining(false);
    }
  };

  if (hasFamilyLink) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 ${
          isPlayful 
            ? "bg-white/80 shadow-lg" 
            : "bg-white/90 shadow-lg border border-emerald-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${
            isPlayful ? "bg-green-100" : "bg-emerald-100"
          }`}>
            <Users className={`h-5 w-5 ${
              isPlayful ? "text-green-600" : "text-emerald-600"
            }`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${
              isPlayful ? "text-green-700" : "text-emerald-800"
            }`}>
              {isPlayful ? "Connected! 🎉" : "Family Connected"}
            </h3>
            <p className={`text-sm ${
              isPlayful ? "text-green-600/70" : "text-emerald-600"
            }`}>
              {familyName || (isPlayful ? "You're part of a family!" : "Linked to a parent account")}
            </p>
          </div>
          <Check className={`h-6 w-6 ${
            isPlayful ? "text-green-500" : "text-emerald-500"
          }`} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 space-y-4 ${
        isPlayful 
          ? "bg-white/80 shadow-lg" 
          : "bg-white/90 shadow-lg border border-emerald-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${
          isPlayful ? "bg-purple-100" : "bg-emerald-100"
        }`}>
          <Users className={`h-5 w-5 ${
            isPlayful ? "text-purple-600" : "text-emerald-600"
          }`} />
        </div>
        <div>
          <h3 className={`font-semibold ${
            isPlayful ? "text-purple-700" : "text-slate-800"
          }`}>
            {isPlayful ? "Join a Family 👨‍👩‍👧" : "Family Connection"}
          </h3>
          <p className={`text-xs ${
            isPlayful ? "text-purple-500" : "text-slate-500"
          }`}>
            {isPlayful ? "Connect with your parent!" : "Link to your parent's account"}
          </p>
        </div>
      </div>

      {/* Share Username */}
      {kidUsername && (
        <div className={`p-3 rounded-lg ${
          isPlayful ? "bg-purple-50" : "bg-emerald-50"
        }`}>
          <p className={`text-xs font-medium mb-2 ${
            isPlayful ? "text-purple-600" : "text-emerald-700"
          }`}>
            {isPlayful ? "📝 Your username (share with parents):" : "Your username:"}
          </p>
          <div className="flex items-center gap-2">
            <code className={`flex-1 p-2 rounded text-sm text-center ${
              isPlayful 
                ? "bg-white text-purple-700" 
                : "bg-white text-emerald-700"
            }`}>
              {kidUsername}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShareUsername}
              className="h-8 w-8"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Join with Code */}
      <div className={`p-3 rounded-lg ${
        isPlayful ? "bg-pink-50" : "bg-slate-50"
      }`}>
        <p className={`text-xs font-medium mb-2 ${
          isPlayful ? "text-pink-600" : "text-slate-700"
        }`}>
          {isPlayful ? "🔑 Or enter a family code:" : "Enter family code:"}
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={familyCode}
            onChange={(e) => setFamilyCode(e.target.value)}
            placeholder={isPlayful ? "Enter code..." : "Family code"}
            className={`h-9 text-sm ${
              isPlayful 
                ? "border-pink-200 focus:border-pink-400" 
                : "border-slate-200 focus:border-emerald-400"
            }`}
          />
          <Button
            size="sm"
            onClick={handleJoinFamily}
            disabled={isJoining}
            className={isPlayful 
              ? "bg-pink-500 hover:bg-pink-600" 
              : "bg-emerald-600 hover:bg-emerald-700"
            }
          >
            {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}