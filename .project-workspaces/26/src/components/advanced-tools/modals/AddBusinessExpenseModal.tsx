import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Image, X } from "lucide-react";
import { ReceiptImage } from "@/components/ui/ReceiptImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useReceiptUpload } from "@/hooks/useReceiptUpload";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }
const CATEGORIES = ["office_supplies", "travel", "meals", "equipment", "software", "advertising", "professional_services", "utilities", "insurance", "rent", "other"];

export const AddBusinessExpenseModal = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectReceipt, isUploading } = useReceiptUpload();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split("T")[0], description: "", category: "other", amount: "", is_deductible: true, receipt_url: "" });

  const handleUploadReceipt = async () => {
    const url = await selectReceipt();
    if (url) setForm({ ...form, receipt_url: url });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("business_expenses").insert({ 
      user_id: user!.id, 
      ...form, 
      amount: Number(form.amount),
      receipt_url: form.receipt_url || null 
    });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Success", description: "Expense added" });
    setForm({ expense_date: new Date().toISOString().split("T")[0], description: "", category: "other", amount: "", is_deductible: true, receipt_url: "" });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Business Expense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
          <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="bg-background">{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          
          {/* Receipt Upload */}
          <div>
            <Label>Receipt (Optional)</Label>
            {form.receipt_url ? (
              <div className="mt-2 relative">
                <ReceiptImage src={form.receipt_url} />
                <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={() => setForm({ ...form, receipt_url: "" })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full mt-2 gap-2" onClick={handleUploadReceipt} disabled={isUploading}>
                <Image className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Receipt"}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2"><Checkbox checked={form.is_deductible} onCheckedChange={(c) => setForm({ ...form, is_deductible: !!c })} /><Label>Tax Deductible</Label></div>
          <Button type="submit" className="w-full" disabled={loading || isUploading}>{loading ? "Saving..." : "Add Expense"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
