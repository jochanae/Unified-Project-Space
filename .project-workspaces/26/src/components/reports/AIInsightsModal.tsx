import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AIInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financialData: {
    income: number;
    expenses: number;
    netCashFlow: number;
    savingsRate: number;
    budgetHealth: number;
    categories: { name: string; value: number }[];
    budgetStats: { onTrack: number; warning: number; overBudget: number };
    trendData: { month: string; income: number; expenses: number }[];
    goalsData: { current: number; target: number };
    goalsProgress: number;
  };
}

const AIInsightsModal = ({ open, onOpenChange, financialData }: AIInsightsModalProps) => {
  const [insights, setInsights] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    setInsights("");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Please sign in to use AI Insights");
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ financialData }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          toast.error("Payment required. Please add funds to continue.");
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to get insights");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setInsights(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("AI insights error:", error);
      toast.error("Failed to generate insights. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(insights);
    setCopied(true);
    toast.success("Insights copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-fetch when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen && !insights && !isLoading) {
      fetchInsights();
    }
  };

  // Format markdown-like text to JSX
  const formatInsights = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <h3 key={index} className="font-bold text-lg mt-4 mb-2 text-primary">
            {line.replace(/\*\*/g, "")}
          </h3>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={index} className="ml-4 mb-1">
            {line.substring(2)}
          </li>
        );
      }
      if (line.trim() === "") {
        return <br key={index} />;
      }
      return (
        <p key={index} className="mb-2">
          {line.replace(/\*\*(.*?)\*\*/g, (_, text) => text)}
        </p>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Financial Insights
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "Analyzing..." : "Refresh"}
          </Button>
          {insights && (
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading && !insights && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
              </div>
              <p className="mt-4 text-muted-foreground">Analyzing your financial data...</p>
            </div>
          )}

          {insights && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {formatInsights(insights)}
            </div>
          )}

          {!isLoading && !insights && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click "Refresh" to generate AI insights based on your financial data.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIInsightsModal;
