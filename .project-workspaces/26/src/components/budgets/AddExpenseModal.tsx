import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Receipt, Camera, X } from "lucide-react";
import { toast } from "sonner";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: {
    id: string;
    name: string;
    category: string;
    amount: number;
    spent: number;
  };
  onSuccess?: () => void;
}

const quickAmounts = [10, 25, 50, 100, 200];

const AddExpenseModal = ({ open, onOpenChange, budget, onSuccess }: AddExpenseModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setReceiptPreview(null);
    setReceiptFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadReceipt = async (transactionId: string): Promise<string | null> => {
    if (!receiptFile || !user) return null;

    const fileName = `${user.id}/budget-expenses/${transactionId}_${Date.now()}.jpg`;
    
    const { error } = await supabase.storage
      .from("receipts")
      .upload(fileName, receiptFile, {
        contentType: receiptFile.type,
        upsert: true
      });

    if (error) {
      console.error("Receipt upload error:", error);
      return null;
    }

    return fileName;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Add transaction
      const { data: transaction, error: txError } = await supabase
        .from("budget_transactions")
        .insert({
          budget_id: budget.id,
          user_id: user.id,
          amount: Number(amount),
          description: description.trim() || null,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Upload receipt if provided
      if (receiptFile && transaction) {
        const receiptUrl = await uploadReceipt(transaction.id);
        if (receiptUrl) {
          await supabase
            .from("budget_transactions")
            .update({ receipt_url: receiptUrl })
            .eq("id", transaction.id);
        }
      }

      // Update budget spent amount
      const newSpent = Number(budget.spent) + Number(amount);
      const { error: updateError } = await supabase
        .from("budgets")
        .update({ spent: newSpent })
        .eq("id", budget.id);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from("budget_activity").insert({
        budget_id: budget.id,
        user_id: user.id,
        activity_type: "expense_added",
        description: `Logged $${Number(amount).toLocaleString()} expense`,
        metadata: { 
          amount: Number(amount), 
          description: description.trim() || null,
          has_receipt: !!receiptFile 
        },
      });

      toast.success(`$${Number(amount).toLocaleString()} logged to ${budget.name}`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const remaining = Number(budget.amount) - Number(budget.spent);
  const newRemaining = remaining - (Number(amount) || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Log Expense
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-muted/50 mb-4">
          <p className="font-semibold">{budget.name}</p>
          <p className="text-sm text-muted-foreground">
            ${remaining.toLocaleString()} remaining of ${Number(budget.amount).toLocaleString()}
          </p>
        </div>

        <div className="space-y-4">
          {/* Quick amounts */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((qa) => (
                <Button
                  key={qa}
                  variant={amount === String(qa) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(String(qa))}
                >
                  ${qa}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 text-lg font-semibold"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What did you spend on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {receiptPreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img 
                  src={receiptPreview} 
                  alt="Receipt preview" 
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setReceiptPreview(null);
                    setReceiptFile(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 border-dashed flex flex-col gap-1"
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Attach receipt for accountability</span>
              </Button>
            )}
          </div>

          {/* Preview */}
          {amount && Number(amount) > 0 && (
            <div className={`p-3 rounded-lg border ${newRemaining < 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"}`}>
              <p className={`text-sm font-medium ${newRemaining < 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                {newRemaining < 0
                  ? `This will put you $${Math.abs(newRemaining).toLocaleString()} over budget`
                  : `$${newRemaining.toLocaleString()} will remain after this expense`}
              </p>
              {receiptFile && (
                <p className="text-xs text-muted-foreground mt-1">Receipt attached for verification</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !amount || Number(amount) <= 0}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {loading ? "Logging..." : "Log Expense"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;