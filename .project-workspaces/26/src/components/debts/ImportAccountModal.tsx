import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CreditCard, Building } from "lucide-react";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  balance: number;
  account_type: string;
  category: string;
}

interface ImportAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportAccountModal({ open, onOpenChange, onSuccess }: ImportAccountModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    interest_rate: "",
    minimum_payment: "",
    original_balance: "",
  });

  useEffect(() => {
    if (open && user) {
      fetchLiabilityAccounts();
    }
  }, [open, user]);

  const fetchLiabilityAccounts = async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("category", "liability");

    if (error) {
      console.error("Error fetching accounts:", error);
    } else {
      setAccounts(data || []);
    }
  };

  const handleImport = async () => {
    if (!user || !selectedAccount) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      name: selectedAccount.name,
      creditor: selectedAccount.institution,
      linked_account_id: selectedAccount.id,
      debt_type: selectedAccount.account_type,
      current_balance: selectedAccount.balance,
      original_balance: parseFloat(formData.original_balance) || selectedAccount.balance,
      interest_rate: parseFloat(formData.interest_rate) || 0,
      minimum_payment: parseFloat(formData.minimum_payment) || 0,
      status: "active",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Error importing account:", error);
      toast.error("Failed to import account");
    } else {
      toast.success("Account imported as debt");
      setSelectedAccount(null);
      setFormData({ interest_rate: "", minimum_payment: "", original_balance: "" });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Import Liability Account</DialogTitle>
          <DialogDescription>
            Select a liability account from your Accounts page to import as a debt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {accounts.length === 0 ? (
            <div className="text-center py-6">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                No liability accounts found. Add credit cards or loans in the Accounts page first.
              </p>
            </div>
          ) : !selectedAccount ? (
            <div className="space-y-2">
              <Label>Select Account</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccount(account)}
                    className="w-full p-3 text-left rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{account.name}</p>
                        {account.institution && (
                          <p className="text-sm text-muted-foreground">{account.institution}</p>
                        )}
                      </div>
                      <span className="font-semibold text-destructive">
                        ${Number(account.balance).toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedAccount.name}</p>
                    {selectedAccount.institution && (
                      <p className="text-sm text-muted-foreground">{selectedAccount.institution}</p>
                    )}
                  </div>
                  <span className="font-semibold text-destructive">
                    ${Number(selectedAccount.balance).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="18.99"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_payment">Minimum Payment</Label>
                <Input
                  id="minimum_payment"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="75"
                  value={formData.minimum_payment}
                  onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_balance">Original Balance (optional)</Label>
                <Input
                  id="original_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={selectedAccount.balance.toString()}
                  value={formData.original_balance}
                  onChange={(e) => setFormData({ ...formData, original_balance: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Used to track your payoff progress
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {selectedAccount ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedAccount(null)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleImport} disabled={isSubmitting} className="flex-1">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import Debt
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
