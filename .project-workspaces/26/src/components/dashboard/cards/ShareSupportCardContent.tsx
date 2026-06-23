import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, MessageSquare, Heart, Briefcase, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";

const APP_URL = "https://coinsbloom.com";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

const ActionButton = ({ icon, label, onClick, className = "" }: ActionButtonProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-[52px] ${className}`}
  >
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
      {icon}
    </div>
    <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
  </button>
);

export const ShareSupportCardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleShare = async () => {
    const success = await smartShare({
      url: APP_URL,
      title: "CoinsBloom",
      text: "Check out CoinsBloom - a great app for managing your family's finances!",
    });
    if (success && !supportsNativeShare()) {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: user?.id || "00000000-0000-0000-0000-000000000000",
        title: "User Feedback",
        message: feedback.trim(),
        type: "feedback",
      });

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      setFeedback("");
      setFeedbackOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const actions = [
    {
      icon: copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4 text-primary" />,
      label: copied ? "Copied!" : "Share",
      onClick: handleShare,
    },
    {
      icon: <Heart className="h-4 w-4 text-pink-500" />,
      label: "Support",
      onClick: () => navigate("/support"),
    },
    {
      icon: <Briefcase className="h-4 w-4 text-amber-500" />,
      label: "Be a Pro",
      onClick: () => navigate("/professionals?apply=true"),
    },
    {
      icon: <MessageSquare className="h-4 w-4 text-emerald-500" />,
      label: "Feedback",
      onClick: () => setFeedbackOpen(true),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-center gap-1 py-1">
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.onClick}
          />
        ))}
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Tell us what you think, suggest improvements, or report issues..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitFeedback} disabled={submitting}>
                {submitting ? "Sending..." : "Send Feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareSupportCardContent;
