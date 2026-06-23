import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  balance: number;
  is_manual: boolean;
}

interface ReconcileAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReconcileAccountsModal({ open, onOpenChange, onSuccess }: ReconcileAccountsModalProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reconcileValues, setReconcileValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchAccounts();
    }
  }, [open, user]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name, institution, balance, is_manual")
      .order("name");

    if (error) {
      toast.error("Failed to load accounts");
    } else {
      setAccounts(data || []);
      // Initialize reconcile values with current balances
      const initial: Record<string, string> = {};
      data?.forEach(acc => {
        initial[acc.id] = acc.balance.toString();
      });
      setReconcileValues(initial);
    }
    setLoading(false);
  };

  const getDifference = (accountId: string, currentBalance: number) => {
    const newValue = parseFloat(reconcileValues[accountId] || "0");
    return newValue - currentBalance;
  };

  const hasChanges = () => {
    return accounts.some(acc => {
      const newValue = parseFloat(reconcileValues[acc.id] || "0");
      return Math.abs(newValue - acc.balance) > 0.001;
    });
  };

  const handleReconcile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const updates = accounts
        .filter(acc => {
          const newValue = parseFloat(reconcileValues[acc.id] || "0");
          return Math.abs(newValue - acc.balance) > 0.001;
        })
        .map(acc => ({
          id: acc.id,
          balance: parseFloat(reconcileValues[acc.id] || "0"),
        }));

      for (const update of updates) {
        const { error } = await supabase
          .from("accounts")
          .update({ balance: update.balance, updated_at: new Date().toISOString() })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success(`Reconciled ${updates.length} account${updates.length !== 1 ? "s" : ""}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Reconciliation error:", error);
      toast.error("Failed to reconcile accounts");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-teal-500" />
            Reconcile Accounts
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update your account balances to match your actual statements
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No accounts to reconcile
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {accounts.map(account => {
                const diff = getDifference(account.id, account.balance);
                const hasDiff = Math.abs(diff) > 0.001;

                return (
                  <Card key={account.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{account.name}</p>
                        {account.institution && (
                          <p className="text-xs text-muted-foreground">{account.institution}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="text-sm font-medium">${account.balance.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Actual Balance</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            value={reconcileValues[account.id] || ""}
                            onChange={(e) => setReconcileValues(prev => ({
                              ...prev,
                              [account.id]: e.target.value
                            }))}
                            className="pl-7 h-9"
                          />
                        </div>
                      </div>

                      {hasDiff && (
                        <div className={`text-right min-w-[80px] ${diff > 0 ? "text-green-600" : "text-destructive"}`}>
                          <div className="flex items-center gap-1 justify-end">
                            {diff > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="text-xs font-medium">
                              {diff > 0 ? "+" : ""}${diff.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">difference</p>
                        </div>
                      )}
                    </div>

                    {account.is_manual && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                        <AlertTriangle className="h-3 w-3" />
                        Manual account - update regularly
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-teal-500 hover:bg-teal-600"
            onClick={handleReconcile}
            disabled={saving || !hasChanges()}
          >
            {saving ? "Saving..." : "Reconcile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}