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
import { DollarSign, Plus, Sparkles, Camera, X, Image } from "lucide-react";
import { toast } from "sonner";

interface ContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle: string;
  onSuccess?: () => void;
}

const quickAmounts = [25, 50, 100, 250, 500, 1000];

const ContributionModal = ({ open, onOpenChange, goalId, goalTitle, onSuccess }: ContributionModalProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount("");
    setNotes("");
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

  const uploadReceipt = async (contributionId: string): Promise<string | null> => {
    if (!receiptFile || !user) return null;

    const fileName = `${user.id}/goal-contributions/${contributionId}_${Date.now()}.jpg`;
    
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
      toast.error("Please sign in to add a contribution");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Add contribution (auto-approved for goal owner, pending for others)
      const { data: goalData } = await supabase
        .from("goals")
        .select("user_id")
        .eq("id", goalId)
        .single();

      const isOwner = goalData?.user_id === user.id;

      const { data: contribution, error: contributionError } = await supabase
        .from("goal_contributions")
        .insert({
          goal_id: goalId,
          user_id: user.id,
          amount: Number(amount),
          notes: notes.trim() || null,
          is_approved: isOwner,
          approved_at: isOwner ? new Date().toISOString() : null,
          approved_by: isOwner ? user.id : null,
        })
        .select()
        .single();

      if (contributionError) throw contributionError;

      // Upload receipt if provided
      if (receiptFile && contribution) {
        const receiptUrl = await uploadReceipt(contribution.id);
        if (receiptUrl) {
          await supabase
            .from("goal_contributions")
            .update({ receipt_url: receiptUrl })
            .eq("id", contribution.id);
        }
      }

      // If auto-approved, update goal's current amount
      if (isOwner) {
        const { data: currentGoal } = await supabase
          .from("goals")
          .select("current_amount")
          .eq("id", goalId)
          .single();

        if (currentGoal) {
          await supabase
            .from("goals")
            .update({ current_amount: Number(currentGoal.current_amount) + Number(amount) })
            .eq("id", goalId);
        }
      }

      // Log activity
      await supabase.from("goal_activity").insert({
        goal_id: goalId,
        user_id: user.id,
        activity_type: "contribution_added",
        description: isOwner 
          ? `Added $${Number(amount).toLocaleString()} to the goal`
          : `Submitted $${Number(amount).toLocaleString()} contribution (pending approval)`,
        metadata: { 
          amount: Number(amount), 
          notes: notes.trim() || null, 
          is_approved: isOwner,
          has_receipt: !!receiptFile 
        },
      });

      toast.success(
        isOwner 
          ? `Added $${Number(amount).toLocaleString()} to your goal!`
          : `Contribution submitted for approval!`
      );
      
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding contribution:", error);
      toast.error("Failed to add contribution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-500" />
            Add Contribution
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Adding funds to "{goalTitle}"
        </div>

        <div className="space-y-4">
          {/* Quick amounts */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant={amount === String(quickAmount) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(String(quickAmount))}
                  className={amount === String(quickAmount) ? "bg-green-500 hover:bg-green-600" : ""}
                >
                  ${quickAmount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 text-lg font-semibold"
                min="1"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a note about this contribution..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">
                  Contributing ${Number(amount).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                {receiptFile ? "Receipt attached for verification" : "Your contribution brings you closer to your goal!"}
              </p>
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
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
            >
              {loading ? "Adding..." : "Add Funds"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContributionModal;