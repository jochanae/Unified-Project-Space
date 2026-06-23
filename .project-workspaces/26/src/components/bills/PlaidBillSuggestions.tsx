import { useState, useEffect } from "react";
import { Sparkles, Check, X, Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";

interface RecurringSuggestion {
  merchant: string;
  amount: number;
  category: string;
  frequency: "monthly" | "weekly" | "annual";
  lastDate: string;
  occurrences: number;
  confidence: number;
}

interface PlaidBillSuggestionsProps {
  onBillAdded?: () => void;
}

// Map transaction categories to valid bill_category enum values
const categoryMapping: Record<string, string> = {
  "subscriptions": "subscriptions",
  "entertainment": "streaming",
  "streaming": "streaming",
  "utilities": "utilities",
  "electric": "utilities",
  "gas": "utilities",
  "water": "utilities",
  "internet": "internet",
  "phone": "phone",
  "insurance": "insurance",
  "rent": "rent",
  "mortgage": "mortgage",
  "housing": "rent",
  "gym": "gym",
  "membership": "gym",
  "software": "subscriptions",
  "transportation": "transportation",
  "medical": "medical",
  "healthcare": "medical",
  "loans": "loans",
  "credit_card": "credit_card",
};

export const PlaidBillSuggestions = ({ onBillAdded }: PlaidBillSuggestionsProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);
  const [dismissedMerchants, setDismissedMerchants] = useState<string[]>([]);
  const [hasPlaidConnection, setHasPlaidConnection] = useState(false);

  useEffect(() => {
    if (user) {
      checkPlaidConnection();
      loadDismissedMerchants();
    }
  }, [user]);

  const checkPlaidConnection = async () => {
    const { data } = await supabase
      .from('plaid_items')
      .select('id')
      .eq('user_id', user!.id)
      .limit(1);
    
    setHasPlaidConnection((data?.length || 0) > 0);
  };

  const loadDismissedMerchants = async () => {
    const stored = localStorage.getItem(`dismissed_bill_suggestions_${user!.id}`);
    if (stored) {
      setDismissedMerchants(JSON.parse(stored));
    }
  };

  const saveDismissedMerchant = (merchant: string) => {
    const updated = [...dismissedMerchants, merchant];
    setDismissedMerchants(updated);
    localStorage.setItem(`dismissed_bill_suggestions_${user!.id}`, JSON.stringify(updated));
  };

  const scanForRecurring = async () => {
    setIsScanning(true);
    try {
      // Fetch transactions from the last 90 days
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('merchant, amount, category, transaction_date, title')
        .eq('user_id', user!.id)
        .eq('type', 'expense')
        .gte('transaction_date', threeMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Get existing bills to avoid duplicates
      const { data: existingBills } = await supabase
        .from('bills')
        .select('name')
        .eq('user_id', user!.id);

      const existingBillNames = new Set(
        (existingBills || []).map(b => b.name.toLowerCase())
      );

      // Group transactions by merchant/title
      const merchantGroups: Record<string, { amounts: number[]; dates: string[]; category: string }> = {};

      transactions?.forEach(tx => {
        const key = (tx.merchant || tx.title || '').toLowerCase().trim();
        if (!key || key.length < 3) return;

        if (!merchantGroups[key]) {
          merchantGroups[key] = { amounts: [], dates: [], category: tx.category || 'other' };
        }
        merchantGroups[key].amounts.push(Number(tx.amount));
        merchantGroups[key].dates.push(tx.transaction_date);
      });

      // Find recurring patterns (at least 2 occurrences with similar amounts)
      const detected: RecurringSuggestion[] = [];

      for (const [merchant, data] of Object.entries(merchantGroups)) {
        // Skip if already a bill or dismissed
        if (existingBillNames.has(merchant)) continue;
        if (dismissedMerchants.includes(merchant)) continue;

        // Need at least 2 occurrences
        if (data.amounts.length < 2) continue;

        // Check if amounts are consistent (within 20% variance)
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
        const variance = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.2);

        if (!variance && data.amounts.length < 3) continue;

        // Determine frequency based on date gaps
        const sortedDates = data.dates.sort();
        let frequency: "monthly" | "weekly" | "annual" = "monthly";
        
        if (sortedDates.length >= 2) {
          const firstDate = new Date(sortedDates[0]);
          const lastDate = new Date(sortedDates[sortedDates.length - 1]);
          const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
          const avgGap = daysBetween / (sortedDates.length - 1);

          if (avgGap < 10) frequency = "weekly";
          else if (avgGap > 300) frequency = "annual";
          else frequency = "monthly";
        }

        // Calculate confidence
        let confidence = 0.5;
        if (data.amounts.length >= 3) confidence += 0.2;
        if (variance) confidence += 0.2;
        if (avgAmount > 10) confidence += 0.1;

        detected.push({
          merchant: merchant.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          amount: Math.round(avgAmount * 100) / 100,
          category: categoryMapping[data.category.toLowerCase()] || 'other',
          frequency,
          lastDate: sortedDates[sortedDates.length - 1],
          occurrences: data.amounts.length,
          confidence: Math.min(confidence, 1)
        });
      }

      // Sort by confidence and limit to top 5
      detected.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(detected.slice(0, 5));

      if (detected.length === 0) {
        toast.info("No new recurring payments detected");
      } else {
        toast.success(`Found ${detected.length} potential recurring bill${detected.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error scanning transactions:', error);
      toast.error('Failed to scan transactions');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = async (suggestion: RecurringSuggestion) => {
    setIsLoading(true);
    try {
      // Calculate next due date based on last transaction
      const lastDate = new Date(suggestion.lastDate);
      let nextDue: Date;

      switch (suggestion.frequency) {
        case 'weekly':
          nextDue = new Date(lastDate);
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'annual':
          nextDue = new Date(lastDate);
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
        default:
          nextDue = addMonths(lastDate, 1);
      }

      // If next due is in the past, advance it
      while (nextDue < new Date()) {
        switch (suggestion.frequency) {
          case 'weekly':
            nextDue.setDate(nextDue.getDate() + 7);
            break;
          case 'annual':
            nextDue.setFullYear(nextDue.getFullYear() + 1);
            break;
          default:
            nextDue = addMonths(nextDue, 1);
        }
      }

      const billCategory = (categoryMapping[suggestion.category.toLowerCase()] || 'other') as 
        "utilities" | "subscriptions" | "insurance" | "rent" | "phone" | "internet" | 
        "streaming" | "gym" | "transportation" | "loans" | "credit_card" | "other" | 
        "mortgage" | "property_tax" | "student_loan" | "medical";

      const { error } = await supabase.from('bills').insert({
        user_id: user!.id,
        name: suggestion.merchant,
        amount: suggestion.amount,
        category: billCategory,
        due_date: nextDue.toISOString().split('T')[0],
        frequency: suggestion.frequency,
        is_recurring: true,
        reminder_enabled: true,
        reminder_days_before: 3,
        notes: `Auto-detected from ${suggestion.occurrences} transactions`
      });

      if (error) throw error;

      toast.success(`${suggestion.merchant} added to your bills`);
      setSuggestions(prev => prev.filter(s => s.merchant !== suggestion.merchant));
      onBillAdded?.();
    } catch (error) {
      console.error('Error adding bill:', error);
      toast.error('Failed to add bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (merchant: string) => {
    saveDismissedMerchant(merchant.toLowerCase());
    setSuggestions(prev => prev.filter(s => s.merchant !== merchant));
    toast.success('Suggestion dismissed');
  };

  // Don't show if no Plaid connection
  if (!hasPlaidConnection) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Smart Bill Detection
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={scanForRecurring}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Transactions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Scan Transactions" to detect recurring payments from your bank transactions
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map(suggestion => (
              <div
                key={suggestion.merchant}
                className="p-3 rounded-lg border bg-muted/30 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {suggestion.merchant}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Detected {suggestion.occurrences} payments
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="font-medium">${suggestion.amount.toFixed(2)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground capitalize">{suggestion.frequency}</span>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline" className="capitalize">{suggestion.category}</Badge>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(suggestion)}
                    disabled={isLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4 mr-1" /> Add Bill
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(suggestion.merchant)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" /> Not a Bill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
