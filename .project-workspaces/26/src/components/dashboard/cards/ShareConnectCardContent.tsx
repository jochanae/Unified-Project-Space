import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, MessageSquare, Copy, Check, Twitter, Facebook, Linkedin, Heart, Briefcase } from "lucide-react";
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

export const ShareConnectCardContent = () => {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-2">
      <div className="flex items-center gap-2">
        <Share2 className="h-6 w-6 text-primary" />
        <span className="text-sm font-medium text-foreground">Share App</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-sm h-8"
        onClick={handleShare}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Copied!" : "Share"}
      </Button>
    </div>
  );
};

export const ShareConnectExpandedContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleShareLink = async () => {
    const success = await smartShare({
      url: APP_URL,
      title: "CoinsBloom",
      text: "Check out CoinsBloom - a great app for managing your family's finances!",
    });
    if (success && !supportsNativeShare()) {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform: string) => {
    const text = "Check out CoinsBloom - a great app for managing your family's finances!";
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(APP_URL);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };

    window.open(urls[platform], "_blank", "width=600,height=400");
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

  return (
    <div className="space-y-6 p-4">
      {/* Share Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Share CoinsBloom</h3>
        <p className="text-xs text-muted-foreground">
          Know someone who could benefit from better financial management? Share the app!
        </p>

        {/* Copy Link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground truncate">
            {APP_URL}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 flex-shrink-0"
            onClick={handleShareLink}
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>

        {/* Social Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => handleShare("twitter")}
          >
            <Twitter className="h-4 w-4" />
            Twitter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => handleShare("facebook")}
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => handleShare("linkedin")}
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Join & Support Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Join & Support</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2 h-auto py-3 flex-col"
            onClick={() => navigate("/support")}
          >
            <Heart className="h-5 w-5 text-pink-500" />
            <span className="text-xs">Support Us</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-auto py-3 flex-col"
            onClick={() => navigate("/professionals?apply=true")}
          >
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="text-xs">Become a Pro</span>
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Feedback Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Give Feedback</h3>
        <p className="text-xs text-muted-foreground">
          Help us improve! Share your thoughts, suggestions, or report issues.
        </p>
        <Button
          variant="secondary"
          className="w-full gap-2"
          onClick={() => setFeedbackOpen(true)}
        >
          <MessageSquare className="h-4 w-4" />
          Send Feedback
        </Button>
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
    </div>
  );
};
