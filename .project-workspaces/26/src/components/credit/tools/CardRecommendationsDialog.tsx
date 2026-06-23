import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { useStreamAI } from "./useStreamAI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardRecommendationsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { response, isLoading, error: aiError, generate } = useStreamAI();
  const [generated, setGenerated] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError || aiError;

  const handleGenerate = async () => {
    if (!user) return;

    const { data: scores } = await supabase
      .from("credit_scores")
      .select("score, bureau, score_date")
      .eq("user_id", user.id)
      .order("score_date", { ascending: false })
      .limit(3);

    if (!scores || scores.length === 0) {
      setLocalError("Please add at least one credit score before getting card recommendations. Go to the Credit page to input your scores.");
      setGenerated(true);
      return;
    }

    setGenerated(true);
    await generate("card-recommendations", {
      scores: scores,
      spending_habits: "General spending analysis from budgets",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Personalized Card Recommendations
          </DialogTitle>
        </DialogHeader>

        {!generated ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Get AI-powered credit card recommendations based on your credit score and profile. We'll suggest cards across categories like cashback, travel, and balance transfer.
            </p>
            <Button onClick={handleGenerate} className="w-full gap-2">
              <CreditCard className="h-4 w-4" />
              Get Recommendations
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 max-h-[60vh]">
            <div className="pr-4">
              {isLoading && !response && (
                <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing your credit profile...
                </div>
              )}
              {error && (
                <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg">{error}</div>
              )}
              {response && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              )}
              {isLoading && response && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />}
            </div>
          </ScrollArea>
        )}

        {generated && !isLoading && (
          <Button variant="outline" onClick={handleGenerate} className="mt-2">
            Regenerate Recommendations
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
