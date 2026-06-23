import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, Crown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { supabase } from '@/integrations/supabase/client';
import { Trade } from '@/hooks/useTrades';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface TradeAnalysisCardProps {
  trades: Trade[];
}

export function TradeAnalysisCard({ trades }: TradeAnalysisCardProps) {
  const { session } = useAuth();
  const { checkAccess } = useFeatureAccess();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState('overview');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = checkAccess('advancedAnalytics');
  const closedTrades = trades.filter(t => t.status === 'closed');

  const handleAnalyze = async () => {
    if (!hasAccess) {
      setShowUpgrade(true);
      return;
    }

    if (!session?.access_token) {
      toast.error('Please log in to use AI analysis');
      return;
    }

    if (closedTrades.length === 0) {
      toast.error('You need closed trades to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-trades', {
        body: { trades: closedTrades, analysisType },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze trades');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-br from-chart-3/5 to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-chart-3" />
              AI Trade Analysis
              {!hasAccess && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-600">
                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                  Pro
                </Badge>
              )}
            </CardTitle>
            {analysis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!analysis ? (
            <>
              <p className="text-sm text-muted-foreground">
                Get personalized insights on your trading patterns, strengths, and areas for improvement.
              </p>
              <div className="flex items-center gap-2">
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Full Overview</SelectItem>
                    <SelectItem value="patterns">Pattern Analysis</SelectItem>
                    <SelectItem value="improvement">Improvement Areas</SelectItem>
                    <SelectItem value="risk">Risk Management</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || closedTrades.length === 0}
                  className="bg-gradient-to-r from-chart-3 to-primary hover:opacity-90"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
              {closedTrades.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Close some trades to unlock AI analysis.
                </p>
              )}
            </>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2">{children}</h3>,
                  h2: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-1.5">{children}</h4>,
                  h3: ({ children }) => <h5 className="text-sm font-medium mt-2 mb-1">{children}</h5>,
                  p: ({ children }) => <p className="text-sm text-muted-foreground mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="text-sm space-y-1 mb-2 ml-4">{children}</ul>,
                  li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                  strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="AI Trade Analysis"
        requiredTier="pro"
        description="Get personalized AI feedback on your trading patterns and performance with the Pro plan."
      />
    </>
  );
}
