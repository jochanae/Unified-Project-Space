import { useState, useEffect } from "react";
import { Gift, Copy, Share2, Check, ExternalLink, GraduationCap, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReferralData {
  referral_code: string;
  credits_earned: number;
  credits_used: number;
  referral_count: number;
}

export const ReferEarnSection = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_referrals")
        .select("referral_code, credits_earned, credits_used, referral_count")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If no referral record exists, create one
        if (error.code === "PGRST116") {
          const { data: newData, error: insertError } = await supabase
            .from("user_referrals")
            .insert({ 
              user_id: user.id, 
              referral_code: generateCode() 
            })
            .select("referral_code, credits_earned, credits_used, referral_count")
            .single();
          
          if (!insertError && newData) {
            setReferralData(newData);
          }
        }
      } else {
        setReferralData(data);
      }
    } catch (err) {
      console.error("Error fetching referral data:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const referralLink = referralData 
    ? `https://coinsbloom.com/signup?ref=${referralData.referral_code}`
    : "";

  const handleCopyCode = async () => {
    if (!referralData) return;
    await navigator.clipboard.writeText(referralData.referral_code);
    setCopied("code");
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    if (!referralLink) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join CoinsBloom",
          text: "Smart budgeting made simple! Sign up with my referral link:",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied("link");
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const availableCredits = referralData 
    ? (referralData.credits_earned - referralData.credits_used).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <div className="pb-4">
        <div className="h-32 bg-card/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="pb-6 lg:max-w-xl">
      <Collapsible defaultOpen={false}>
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4 backdrop-blur-sm">
          {/* Header */}
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground text-sm">Refer & Earn</h3>
                  <p className="text-xs text-muted-foreground">Earn $10 credit per referral</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {Number(availableCredits) > 0 && (
                  <div className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium">
                    ${availableCredits} credit
                  </div>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>

        {/* Reward Preview */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-card/80 backdrop-blur-sm rounded-lg p-2.5 text-center border border-border/50">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">$10</p>
            <p className="text-[10px] text-muted-foreground">You get credit</p>
          </div>
          <div className="flex-1 bg-card/80 backdrop-blur-sm rounded-lg p-2.5 text-center border border-border/50">
            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">✨ Free</p>
            <p className="text-[10px] text-muted-foreground">Friend gets started</p>
          </div>
        </div>

        {/* Referral Code */}
        {referralData && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/80 rounded-lg px-3 py-2 font-mono text-sm tracking-wider">
                {referralData.referral_code}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleCopyCode}
              >
                {copied === "code" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleShare}
              >
                {copied === "link" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {referralData.referral_count > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                🎉 You've referred {referralData.referral_count} friend{referralData.referral_count !== 1 ? "s" : ""}!
              </p>
            )}
          </div>
        )}

        {/* IntoIQ Cross-Promo */}
        <div className="pt-3 border-t border-border/50">
          <a 
            href="https://mymoneymypower.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
            <span>Smart Money Mentor with</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 group-hover:underline">IntoIQ</span>
            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
          </a>
        </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
