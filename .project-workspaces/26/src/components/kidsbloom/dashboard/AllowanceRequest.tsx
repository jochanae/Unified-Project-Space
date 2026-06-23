import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, ArrowUpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AllowanceRequestProps {
  kidId: string;
  variant: "playful" | "modern";
}

interface Allowance {
  id: string;
  amount: number;
  frequency: string;
  next_payout_date: string;
}

export function AllowanceRequest({ kidId, variant }: AllowanceRequestProps) {
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPlayful = variant === "playful";

  useEffect(() => {
    const fetchAllowance = async () => {
      const { data } = await supabase
        .from("kid_allowances")
        .select("*")
        .eq("kid_id", kidId)
        .eq("is_active", true)
        .single();

      if (data) setAllowance(data);
      setIsLoading(false);
    };

    fetchAllowance();
  }, [kidId]);

  const handleRequestIncrease = async () => {
    if (!requestAmount && !requestReason) {
      toast.error("Please fill in at least one field");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get kid profile for name
      const { data: kidProfile } = await supabase
        .from("kids_profiles")
        .select("display_name, first_name")
        .eq("id", kidId)
        .single();

      // Get parent(s) from family links
      const { data: familyLinks } = await supabase
        .from("family_links")
        .select("parent_user_id")
        .eq("kid_profile_id", kidId)
        .eq("status", "active");

      if (familyLinks && familyLinks.length > 0) {
        const kidName = kidProfile?.display_name || kidProfile?.first_name || "Your child";
        const message = requestReason 
          ? `${kidName} is requesting an allowance increase${requestAmount ? ` to $${requestAmount}/week` : ""}. Reason: "${requestReason}"`
          : `${kidName} is requesting an allowance increase to $${requestAmount}/week`;

        const notifications = familyLinks.map(link => ({
          user_id: link.parent_user_id,
          title: isPlayful ? "Allowance Request! 💰" : "Allowance Increase Request",
          message,
          type: "info",
          action_url: "/kids",
        }));

        await supabase.from("notifications").insert(notifications);
      }

      toast.success(isPlayful ? "Request sent! 🙏" : "Request sent to parent");
      setShowRequestModal(false);
      setRequestAmount("");
      setRequestReason("");
    } catch (error) {
      toast.error("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  // No allowance set up - show placeholder
  if (!allowance) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`mt-4 p-4 rounded-2xl ${
          isPlayful 
            ? "bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-dashed border-yellow-300" 
            : "bg-white/5 border border-dashed border-white/20"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isPlayful ? "bg-yellow-400" : "bg-gray-200"}`}>
            <Calendar className="h-5 w-5 text-black" />
          </div>
          <div>
            <p className="font-bold text-black">
              {isPlayful ? "No Allowance Yet! 🌱" : "No Allowance Set"}
            </p>
            <p className="text-sm font-medium text-black">
              {isPlayful ? "Ask your parent to set up your allowance!" : "Ask your parent to configure an allowance"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const nextPayoutDate = new Date(allowance.next_payout_date);
  const timeUntilPayout = formatDistanceToNow(nextPayoutDate, { addSuffix: false });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`mt-4 p-4 rounded-2xl ${
          isPlayful 
            ? "bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200" 
            : "bg-white/5 border border-white/10"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isPlayful ? "bg-green-200" : "bg-emerald-500/20"}`}>
              <Calendar className={`h-5 w-5 ${isPlayful ? "text-green-600" : "text-emerald-400"}`} />
            </div>
            <div>
              <p className={`text-xs font-medium ${isPlayful ? "text-gray-600" : "text-white/60"}`}>
                {isPlayful ? "Next Allowance" : "Next Payout"}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${isPlayful ? "text-green-600" : "text-emerald-400"}`}>
                  ${allowance.amount}
                </span>
                <span className={`text-xs font-medium ${isPlayful ? "text-gray-500" : "text-white/50"}`}>
                  in {timeUntilPayout}
                </span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowRequestModal(true)}
            className={`gap-1 ${
              isPlayful 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                : "bg-violet-600 hover:bg-violet-700 text-white"
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" />
            {isPlayful ? "Request More 🙏" : "Request"}
          </Button>
        </div>
      </motion.div>

      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className={isPlayful ? "bg-purple-50" : ""}>
          <DialogHeader>
            <DialogTitle className={isPlayful ? "text-purple-600" : ""}>
              {isPlayful ? "Ask for More Allowance! 💰" : "Request Allowance Increase"}
            </DialogTitle>
            <DialogDescription>
              {isPlayful 
                ? "Tell your parent why you'd like more allowance" 
                : "Your request will be sent to your parent for review"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className={`text-sm font-medium ${isPlayful ? "text-purple-700" : ""}`}>
                {isPlayful ? "How much do you want? 💵" : "Requested Amount (per week)"}
              </label>
              <Input
                type="number"
                placeholder={`Current: $${allowance.amount}`}
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className={`text-sm font-medium ${isPlayful ? "text-purple-700" : ""}`}>
                {isPlayful ? "Why do you need more? 📝" : "Reason (optional)"}
              </label>
              <Textarea
                placeholder={isPlayful ? "I've been doing extra chores..." : "Explain your request..."}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRequestModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestIncrease}
              disabled={isSubmitting || (!requestAmount && !requestReason)}
              className={`flex-1 ${
                isPlayful 
                  ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isPlayful ? "Send Request! 🚀" : "Send Request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
