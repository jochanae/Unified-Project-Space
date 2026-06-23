import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TrendingDown, RefreshCw, DollarSign, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  is_recurring: boolean;
}

interface BillOptimizerProps {
  bills: Bill[];
}

const BillOptimizer = ({ bills }: BillOptimizerProps) => {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ totalMonthly: number; billCount: number; categories: string[] } | null>(null);

  const analyzeBills = async () => {
    if (bills.length === 0) {
      toast.error("Add some bills first to get optimization suggestions");
      return;
    }

    setIsLoading(true);
    setSuggestions(null);

    try {
      const { data, error } = await supabase.functions.invoke('bill-optimizer', {
        body: { bills },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data.suggestions);
      setStats({
        totalMonthly: data.totalMonthly,
        billCount: data.billCount,
        categories: data.categories,
      });
    } catch (error: any) {
      console.error("Error analyzing bills:", error);
      toast.error(error.message || "Failed to analyze bills");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSuggestions = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('##') || line.startsWith('**')) {
        return (
          <h3 key={index} className="font-semibold text-lg mt-4 mb-2 text-primary">
            {line.replace(/[#*]/g, '').trim()}
          </h3>
        );
      }
      if (line.startsWith('-') || line.startsWith('•')) {
        return (
          <li key={index} className="ml-4 mb-1 list-disc">
            {line.replace(/^[-•]\s*/, '')}
          </li>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <li key={index} className="ml-4 mb-2 list-decimal">
            {line.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      if (line.trim()) {
        return <p key={index} className="mb-2">{line}</p>;
      }
      return null;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Bill Optimizer</h2>
              <p className="text-white/80 text-sm">Get personalized suggestions to reduce your bills</p>
            </div>
          </div>
          
          <Button 
            onClick={analyzeBills}
            disabled={isLoading || bills.length === 0}
            className="w-full bg-white text-emerald-600 hover:bg-white/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing your bills...
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 mr-2" />
                Analyze Bills & Find Savings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-lg font-bold">${stats.totalMonthly.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Monthly Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <RefreshCw className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold">{stats.billCount}</p>
              <p className="text-xs text-muted-foreground">Bills Analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Lightbulb className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold">{stats.categories.length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Optimization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            {formatSuggestions(suggestions)}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!suggestions && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Ready to Save Money?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Click the button above to analyze your bills and get AI-powered suggestions 
              for reducing your monthly expenses.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Negotiate cable & internet</p>
              <p>✓ Find redundant subscriptions</p>
              <p>✓ Discover bundle deals</p>
              <p>✓ Compare to average costs</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillOptimizer;
