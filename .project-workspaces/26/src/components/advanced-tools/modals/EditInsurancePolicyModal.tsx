import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InsurancePolicy {
  id: string;
  name: string;
  policy_type: string;
  provider: string | null;
  policy_number: string | null;
  premium_amount: number;
  premium_frequency: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: InsurancePolicy | null;
  onSuccess: () => void;
}

const POLICY_TYPES = ["auto", "home", "life", "health", "disability", "umbrella", "renters", "other"];
const FREQUENCIES = ["monthly", "quarterly", "semi_annual", "annual"];

export const EditInsurancePolicyModal = ({ open, onOpenChange, policy, onSuccess }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    policy_type: "auto",
    provider: "",
    policy_number: "",
    premium_amount: "",
    premium_frequency: "monthly"
  });

  useEffect(() => {
    if (policy) {
      setForm({
        name: policy.name,
        policy_type: policy.policy_type,
        provider: policy.provider || "",
        policy_number: policy.policy_number || "",
        premium_amount: String(policy.premium_amount),
        premium_frequency: policy.premium_frequency
      });
    }
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    setLoading(true);
    const { error } = await supabase
      .from("insurance_policies")
      .update({
        name: form.name,
        policy_type: form.policy_type,
        provider: form.provider || null,
        policy_number: form.policy_number || null,
        premium_amount: Number(form.premium_amount),
        premium_frequency: form.premium_frequency
      })
      .eq("id", policy.id);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Updated", description: "Policy updated successfully" });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Insurance Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Policy Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background">
                {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Provider</Label>
            <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div>
            <Label>Policy Number</Label>
            <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Premium</Label>
              <Input type="number" value={form.premium_amount} onChange={(e) => setForm({ ...form, premium_amount: e.target.value })} required />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.premium_frequency} onValueChange={(v) => setForm({ ...form, premium_frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background">
                  {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Update Policy"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
