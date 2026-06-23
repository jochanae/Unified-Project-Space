import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Image, X } from "lucide-react";
import { ReceiptImage } from "@/components/ui/ReceiptImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useReceiptUpload } from "@/hooks/useReceiptUpload";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }
const TYPES = ["cash", "check", "credit_card", "stock", "property", "goods", "other"];

export const AddDonationModal = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectReceipt, isUploading } = useReceiptUpload();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ donation_date: new Date().toISOString().split("T")[0], organization: "", donation_type: "cash", amount: "", is_tax_eligible: true, receipt_url: "" });

  const handleUploadReceipt = async () => {
    const url = await selectReceipt();
    if (url) setForm({ ...form, receipt_url: url });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("charitable_donations").insert({ 
      user_id: user!.id, 
      ...form, 
      amount: Number(form.amount),
      receipt_url: form.receipt_url || null 
    });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Success", description: "Donation added" });
    setForm({ donation_date: new Date().toISOString().split("T")[0], organization: "", donation_type: "cash", amount: "", is_tax_eligible: true, receipt_url: "" });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Donation</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.donation_date} onChange={(e) => setForm({ ...form, donation_date: e.target.value })} required /></div>
          <div><Label>Organization</Label><Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} required /></div>
          <div><Label>Type</Label><Select value={form.donation_type} onValueChange={(v) => setForm({ ...form, donation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="bg-background">{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
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
          
          <div className="flex items-center gap-2"><Checkbox checked={form.is_tax_eligible} onCheckedChange={(c) => setForm({ ...form, is_tax_eligible: !!c })} /><Label>Tax Eligible</Label></div>
          <Button type="submit" className="w-full" disabled={loading || isUploading}>{loading ? "Saving..." : "Add Donation"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
