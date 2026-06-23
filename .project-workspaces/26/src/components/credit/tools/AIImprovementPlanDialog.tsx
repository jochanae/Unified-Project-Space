import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";
import { useStreamAI } from "./useStreamAI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIImprovementPlanDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { response, isLoading, error: aiError, generate } = useStreamAI();
  const [generated, setGenerated] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError || aiError;

  const handleGenerate = async () => {
    if (!user) return;

    // Fetch user's credit data
    const [scoresRes, accountsRes, debtsRes] = await Promise.all([
      supabase.from("credit_scores").select("score, bureau, score_date").eq("user_id", user.id).order("score_date", { ascending: false }).limit(5),
      supabase.from("credit_accounts").select("name, current_balance, credit_limit").eq("user_id", user.id),
      supabase.from("debts").select("name, current_balance, interest_rate, minimum_payment, debt_type").eq("user_id", user.id).eq("status", "active"),
    ]);

    const scores = scoresRes.data || [];
    const accounts = accountsRes.data || [];
    const debts = debtsRes.data || [];

    if (scores.length === 0 && accounts.length === 0 && debts.length === 0) {
      setLocalError("Please add at least one credit score, credit account, or debt before generating a plan. Go to the Credit page to add your data.");
      setGenerated(true);
      return;
    }

    setGenerated(true);
    await generate("improvement-plan", { scores, accounts, debts });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI-Powered Improvement Plan
          </DialogTitle>
        </DialogHeader>

        {!generated ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Generate a personalized credit improvement plan based on your credit scores, accounts, and debts. The AI will analyze your data and provide actionable steps with timelines.
            </p>
            <Button onClick={handleGenerate} className="w-full gap-2">
              <Brain className="h-4 w-4" />
              Generate My Plan
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
                <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                  {error}
                </div>
              )}
              {response && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              )}
              {isLoading && response && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />
              )}
            </div>
          </ScrollArea>
        )}

        {generated && !isLoading && (
          <Button variant="outline" onClick={handleGenerate} className="mt-2">
            Regenerate Plan
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
