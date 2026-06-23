import { useState, useEffect } from "react";
import { DollarSign, Link2, Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";

interface BloomBurst {
  id: string;
  name: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
  start_date: string;
  end_date: string;
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  transaction_date: string;
  merchant: string | null;
}

interface LinkExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  burst: BloomBurst | null;
  onExpenseLinked: () => void;
}

const categoryMapping: Record<string, string[]> = {
  food: ['food', 'dining', 'groceries', 'restaurants'],
  shopping: ['shopping', 'retail', 'clothing'],
  entertainment: ['entertainment', 'subscriptions', 'games'],
  transport: ['transport', 'transportation', 'gas', 'fuel', 'auto'],
  other: ['other', 'miscellaneous', 'general'],
};

export const LinkExpenseSheet = ({ 
  open, 
  onOpenChange, 
  burst, 
  onExpenseLinked 
}: LinkExpenseSheetProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (open && burst && user) {
      fetchUnlinkedTransactions();
    }
  }, [open, burst, user]);

  const fetchUnlinkedTransactions = async () => {
    if (!user || !burst) return;
    
    setIsLoading(true);
    try {
      // Get expense transactions within the burst's date range that are not linked
      const { data, error } = await supabase
        .from('transactions')
        .select('id, title, amount, category, transaction_date, merchant')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .is('bloom_burst_id', null)
        .gte('transaction_date', burst.start_date)
        .lte('transaction_date', burst.end_date)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter by matching categories
      const matchingCategories = categoryMapping[burst.category] || [burst.category];
      const filtered = (data || []).filter(t => 
        matchingCategories.some(cat => 
          t.category?.toLowerCase().includes(cat) || 
          t.title?.toLowerCase().includes(cat)
        )
      );

      // If no matching categories, show all unlinked expenses within the date range
      setTransactions(filtered.length > 0 ? filtered : (data || []));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkExpense = async (transactionId: string, amount: number) => {
    if (!burst) return;
    
    setLinkingId(transactionId);
    try {
      // Update transaction to link to bloom burst
      const { error: txError } = await supabase
        .from('transactions')
        .update({ bloom_burst_id: burst.id })
        .eq('id', transactionId);

      if (txError) throw txError;

      // Update bloom burst spent amount
      const { error: burstError } = await supabase
        .from('bloom_bursts')
        .update({ spent_amount: burst.spent_amount + amount })
        .eq('id', burst.id);

      if (burstError) throw burstError;

      toast.success('Expense linked!');
      
      // Remove from list
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      onExpenseLinked();
    } catch (error) {
      console.error('Error linking expense:', error);
      toast.error('Failed to link expense');
    } finally {
      setLinkingId(null);
    }
  };

  const handleAddNewClose = (open: boolean) => {
    setShowAddModal(open);
    if (!open) {
      // Refresh the list after adding
      fetchUnlinkedTransactions();
      onExpenseLinked();
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              Link Expense to {burst?.name}
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No unlinked expenses found</p>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-purple-700"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Expense
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[calc(80vh-180px)]">
                <div className="space-y-2 pr-4">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {tx.merchant || tx.title || 'Expense'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(tx.transaction_date), 'MMM d')}</span>
                          {tx.category && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{tx.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-red-500">
                          -${tx.amount.toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-600 hover:bg-purple-50"
                          onClick={() => handleLinkExpense(tx.id, tx.amount)}
                          disabled={linkingId === tx.id}
                        >
                          {linkingId === tx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="pt-4 border-t mt-4">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Expense
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddTransactionModal
        open={showAddModal}
        onOpenChange={handleAddNewClose}
        defaultType="expense"
      />
    </>
  );
};
