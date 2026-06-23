import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; deductions: any; onSuccess: () => void; }

export const EditDeductionsModal = ({ open, onOpenChange, deductions, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ gross_income: 0, medical_expenses: 0, mortgage_interest: 0, state_local_taxes: 0, education_expenses: 0, retirement_contributions: 0, hsa_contributions: 0, other_deductions: 0 });

  useEffect(() => {
    if (deductions) setForm({ gross_income: deductions.gross_income, medical_expenses: deductions.medical_expenses, mortgage_interest: deductions.mortgage_interest, state_local_taxes: deductions.state_local_taxes, education_expenses: deductions.education_expenses, retirement_contributions: deductions.retirement_contributions, hsa_contributions: deductions.hsa_contributions, other_deductions: deductions.other_deductions });
  }, [deductions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const year = new Date().getFullYear();
    const { error } = deductions
      ? await supabase.from("tax_deductions").update(form).eq("id", deductions.id)
      : await supabase.from("tax_deductions").insert({ user_id: user!.id, tax_year: year, ...form });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved", description: "Deductions updated" });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Edit Deductions</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>Gross Income</Label><Input type="number" value={form.gross_income} onChange={(e) => setForm({ ...form, gross_income: Number(e.target.value) })} /></div>
          <div><Label>Medical Expenses</Label><Input type="number" value={form.medical_expenses} onChange={(e) => setForm({ ...form, medical_expenses: Number(e.target.value) })} /></div>
          <div><Label>Mortgage Interest</Label><Input type="number" value={form.mortgage_interest} onChange={(e) => setForm({ ...form, mortgage_interest: Number(e.target.value) })} /></div>
          <div><Label>State & Local Taxes</Label><Input type="number" value={form.state_local_taxes} onChange={(e) => setForm({ ...form, state_local_taxes: Number(e.target.value) })} /></div>
          <div><Label>Education Expenses</Label><Input type="number" value={form.education_expenses} onChange={(e) => setForm({ ...form, education_expenses: Number(e.target.value) })} /></div>
          <div><Label>Retirement Contributions</Label><Input type="number" value={form.retirement_contributions} onChange={(e) => setForm({ ...form, retirement_contributions: Number(e.target.value) })} /></div>
          <div><Label>HSA Contributions</Label><Input type="number" value={form.hsa_contributions} onChange={(e) => setForm({ ...form, hsa_contributions: Number(e.target.value) })} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
