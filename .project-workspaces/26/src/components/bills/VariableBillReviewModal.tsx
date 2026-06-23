import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { TrendingDown, Check, DollarSign, Calendar, Info } from "lucide-react";

interface VariableBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  last_paid_date?: string | null;
  is_variable_amount?: boolean;
  status?: string;
  is_projected?: boolean;
}

interface VariableBillReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  selectedMonth?: Date;
  bills?: VariableBill[];
}

const VariableBillReviewModal = ({ open, onOpenChange, onSuccess, selectedMonth, bills: parentBills }: VariableBillReviewModalProps) => {
  const { user } = useAuth();
  const [updatedAmounts, setUpdatedAmounts] = useState<Record<string, string>>({});
  const [confirmedBills, setConfirmedBills] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Filter variable, unpaid bills from parent-provided bills
  const bills = useMemo(() => {
    if (!parentBills) return [];
    return parentBills.filter(b => b.is_variable_amount && b.status !== 'paid');
  }, [parentBills]);

  // Reset state when bills change
  useEffect(() => {
    if (open && bills.length > 0) {
      const amounts: Record<string, string> = {};
      const confirmed: Record<string, boolean> = {};
      bills.forEach(bill => {
        amounts[bill.id] = bill.amount.toString();
        confirmed[bill.id] = false;
      });
      setUpdatedAmounts(amounts);
      setConfirmedBills(confirmed);
    }
  }, [open, bills]);

  const handleAmountChange = (billId: string, value: string) => {
    setUpdatedAmounts(prev => ({ ...prev, [billId]: value }));
  };

  const handleConfirmToggle = (billId: string) => {
    setConfirmedBills(prev => ({ ...prev, [billId]: !prev[billId] }));
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Only update real (non-projected) bills in the DB
      const realBills = bills.filter(b => !b.is_projected);
      const updates = realBills.map(bill => {
        const newAmount = parseFloat(updatedAmounts[bill.id]) || bill.amount;
        return supabase
          .from('bills')
          .update({ amount: newAmount })
          .eq('id', bill.id)
          .eq('user_id', user.id);
      });

      await Promise.all(updates);
      toast.success(`Updated ${realBills.length} variable bill amounts`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bills:', error);
      toast.error('Failed to update some bills');
    } finally {
      setSaving(false);
    }
  };

  const totalEstimated = bills.reduce((sum, bill) => {
    const amount = parseFloat(updatedAmounts[bill.id]) || bill.amount;
    return sum + amount;
  }, 0);

  const allConfirmed = bills.length > 0 && bills.every(bill => confirmedBills[bill.id]);
  const confirmedCount = bills.filter(bill => confirmedBills[bill.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Review Variable Bills {selectedMonth ? `— ${format(selectedMonth, 'MMMM yyyy')}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Info Box */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-sm">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-orange-800 dark:text-orange-200">
              <p className="font-medium mb-1">Why review these?</p>
              <p className="text-orange-700 dark:text-orange-300">
                Variable bills (utilities, credit cards) change monthly. Update amounts from your latest statements, then check each one off to confirm.
              </p>
            </div>
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="py-8 text-center">
            <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              No variable bills due {selectedMonth ? `for ${format(selectedMonth, 'MMMM yyyy')}` : 'this month'}.
            </p>
          </div>
        ) : (
          <>
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{confirmedCount} of {bills.length} confirmed</span>
              {allConfirmed && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                  ✓ All verified
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {bills.map(bill => {
                const dueDate = new Date(bill.due_date + 'T00:00:00');
                const isConfirmed = confirmedBills[bill.id] || false;
                const hasChange = parseFloat(updatedAmounts[bill.id]) !== bill.amount;

                return (
                  <div 
                    key={bill.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isConfirmed 
                        ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' 
                        : hasChange 
                          ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-900/10' 
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isConfirmed}
                        onCheckedChange={() => handleConfirmToggle(bill.id)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${isConfirmed ? 'line-through text-muted-foreground' : ''}`}>
                            {bill.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {bill.category}
                          </Badge>
                          {bill.is_projected && (
                            <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300">
                              projected
                            </Badge>
                          )}
                          {isConfirmed && (
                            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due {format(dueDate, 'MMM d')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          value={updatedAmounts[bill.id] || ''}
                          onChange={(e) => handleAmountChange(bill.id, e.target.value)}
                          className="w-24 h-8 text-right"
                          placeholder={bill.amount.toString()}
                        />
                      </div>
                    </div>
                    {bill.last_paid_date && (
                      <p className="text-[10px] text-muted-foreground mt-1 ml-9">
                        Last paid: {format(new Date(bill.last_paid_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Estimated Total</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                ${totalEstimated.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {bills.length} variable bill{bills.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAll}
                disabled={saving || !allConfirmed}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {saving ? 'Saving...' : allConfirmed ? 'Save Updates' : `Confirm All (${confirmedCount}/${bills.length})`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VariableBillReviewModal;
