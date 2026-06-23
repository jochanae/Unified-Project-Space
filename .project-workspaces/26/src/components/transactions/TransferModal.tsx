import { useState, useEffect } from "react";
import { 
  ArrowLeftRight, 
  DollarSign, 
  Calendar, 
  FileText, 
  StickyNote,
  X,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  balance: number;
}

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransferModal = ({ open, onOpenChange }: TransferModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Fetch accounts
  useEffect(() => {
    if (open && user) {
      supabase
        .from("accounts")
        .select("id, name, institution, balance")
        .eq("user_id", user.id)
        .order("name")
        .then(({ data }) => {
          if (data) setAccounts(data);
        });
    }
  }, [open, user]);

  const resetForm = () => {
    setAmount("");
    setFromAccountId("");
    setToAccountId("");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!fromAccountId) {
      toast.error("Please select a source account");
      return;
    }
    if (!toAccountId) {
      toast.error("Please select a destination account");
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error("Source and destination accounts must be different");
      return;
    }

    const fromAccount = accounts.find(a => a.id === fromAccountId);
    if (fromAccount && fromAccount.balance < numAmount) {
      toast.error("Insufficient balance in source account");
      return;
    }

    setLoading(true);
    try {
      // Record the transfer
      const { error: transferError } = await supabase.from("transfers").insert({
        user_id: user.id,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: numAmount,
        transfer_date: transferDate,
        description: description || null,
        notes: notes || null,
      });

      if (transferError) throw transferError;

      // Update account balances
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const toAccount = accounts.find(a => a.id === toAccountId);

      if (fromAccount) {
        await supabase
          .from("accounts")
          .update({ balance: fromAccount.balance - numAmount })
          .eq("id", fromAccountId);
      }

      if (toAccount) {
        await supabase
          .from("accounts")
          .update({ balance: toAccount.balance + numAmount })
          .eq("id", toAccountId);
      }

      toast.success("Transfer completed successfully!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error completing transfer:", error);
      toast.error("Failed to complete transfer");
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);

  return (
    <ResponsiveModal open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }} title="Transfer Money" desktopMaxWidth="max-w-lg">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          {/* Drag handle */}
          <div className="mx-auto w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-4" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Transfer Money</h2>
                <p className="text-xs text-muted-foreground">Move money between your accounts</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Breadcrumb to full page */}
          <button
            onClick={() => {
              onOpenChange(false);
              navigate("/accounts");
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLink className="h-3 w-3" />
            View all accounts
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <div className="space-y-4 py-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-primary">
                <DollarSign className="h-4 w-4" />
                Transfer Amount
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl h-12"
              />
            </div>

            {/* From Account */}
            <div className="space-y-1.5">
              <Label>From Account</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} disabled={acc.id === toAccountId}>
                      {acc.name}{acc.institution ? ` - ${acc.institution}` : ""} (${acc.balance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-primary/10">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* To Account */}
            <div className="space-y-1.5">
              <Label>To Account</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                      {acc.name}{acc.institution ? ` - ${acc.institution}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transfer Date */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Transfer Date
              </Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Description
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g., Moving savings to checking"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <StickyNote className="h-4 w-4" />
                Notes
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Textarea
                placeholder="Add any additional notes about this transfer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Transfer Preview */}
            {fromAccount && toAccount && amount && (
              <div className="rounded-xl border p-4 bg-muted/30 space-y-2">
                <p className="text-sm font-medium">Transfer Preview</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{fromAccount.name}</span>
                  <span className="text-red-500">-${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{toAccount.name}</span>
                  <span className="text-green-500">+${parseFloat(amount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t bg-background px-4 py-4 pb-[env(safe-area-inset-bottom,16px)]">
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount || !fromAccountId || !toAccountId}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {loading ? "Processing..." : "Complete Transfer"}
          </Button>
        </div>
    </ResponsiveModal>
  );
};
