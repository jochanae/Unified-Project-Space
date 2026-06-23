import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SignInFeedbackProps {
  variant?: "button" | "link";
}

export const SignInFeedback = ({ variant = "button" }: SignInFeedbackProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please describe the issue you're experiencing");
      return;
    }

    setSubmitting(true);
    try {
      // Store feedback in notifications table
      const { error: dbError } = await supabase.from("notifications").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        title: "Sign-In Issue Report",
        message: `Name: ${name.trim() || "Anonymous"}\nEmail: ${email.trim() || "Not provided"}\n\nIssue: ${message.trim()}\n\nUser Agent: ${navigator.userAgent}`,
        type: "feedback",
      });

      if (dbError) throw dbError;

      // Send admin notification email
      try {
        await supabase.functions.invoke("notify-signin-feedback", {
          body: {
            name: name.trim() || "Anonymous",
            email: email.trim() || "Not provided",
            message: message.trim(),
            userAgent: navigator.userAgent,
          },
        });
      } catch {
        // Email notification is best-effort, don't fail the submission
      }

      toast.success("Thank you! We'll look into this right away.");
      setName("");
      setEmail("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {variant === "button" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Need Help?
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Need Help Signing In?
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Report a Sign-In Issue
            </DialogTitle>
            <DialogDescription>
              Having trouble signing in? Let us know and we'll help you out.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">Your Name (optional)</Label>
              <Input
                id="feedback-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">Your Email (optional)</Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">
                What happened? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="feedback-message"
                placeholder="Describe the issue you're experiencing (e.g., error message, blank screen, button not working...)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Sending...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
