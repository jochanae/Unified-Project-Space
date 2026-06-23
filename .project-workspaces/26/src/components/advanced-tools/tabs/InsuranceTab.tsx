import { useState, useEffect, useRef } from "react";
import { Info, Download, Upload, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AddInsurancePolicyModal } from "../modals/AddInsurancePolicyModal";
import { EditInsurancePolicyModal } from "../modals/EditInsurancePolicyModal";
import { parseCSVImport } from "@/lib/advancedToolsExport";

interface InsurancePolicy {
  id: string;
  name: string;
  policy_type: string;
  provider: string | null;
  policy_number: string | null;
  premium_amount: number;
  premium_frequency: string;
}

const POLICY_TYPES = ["auto", "home", "life", "health", "disability", "umbrella", "renters", "other"];
const FREQUENCIES = ["monthly", "quarterly", "semi_annual", "annual"];

export const InsuranceTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);

  useEffect(() => {
    if (user) fetchPolicies();
  }, [user]);

  const fetchPolicies = async () => {
    const { data, error } = await supabase
      .from("insurance_policies")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load policies", variant: "destructive" });
    } else {
      setPolicies(data || []);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("insurance_policies").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete policy", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Policy removed" });
      fetchPolicies();
    }
  };

  const handleEdit = (policy: InsurancePolicy) => {
    setEditingPolicy(policy);
    setEditModalOpen(true);
  };

  const exportCSV = () => {
    const headers = ["Name", "Type", "Provider", "Policy #", "Premium", "Frequency"];
    const rows = policies.map(p => [
      p.name, p.policy_type, p.provider || "", p.policy_number || "", p.premium_amount, p.premium_frequency
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "insurance_policies.csv";
    a.click();
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const records = parseCSVImport(text);
    
    if (records.length === 0) {
      toast({ title: "Error", description: "No valid records found in CSV", variant: "destructive" });
      return;
    }

    let imported = 0;
    for (const record of records) {
      const { error } = await supabase.from("insurance_policies").insert({
        user_id: user!.id,
        name: record.name || "Imported policy",
        policy_type: POLICY_TYPES.includes(record.type?.toLowerCase()) ? record.type.toLowerCase() : "other",
        provider: record.provider || null,
        policy_number: record.policy_number || record["policy_#"] || null,
        premium_amount: Number(record.premium) || 0,
        premium_frequency: FREQUENCIES.includes(record.frequency?.toLowerCase()) ? record.frequency.toLowerCase() : "monthly"
      });
      if (!error) imported++;
    }

    toast({ title: "Import Complete", description: `Imported ${imported} of ${records.length} records` });
    fetchPolicies();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
      
      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
        <Card className="border-2 border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-800/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-base font-medium">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-600" />
                  Insurance Management Tips
                </div>
                <ChevronDown className={`h-4 w-4 text-emerald-600 transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Review annually:</strong> Check your coverage each year during open enrollment or policy renewal - life changes may require adjustments to coverage limits</li>
                <li><strong className="text-foreground">Bundle policies:</strong> Combine auto, home, and life insurance with the same provider to qualify for multi-policy discounts and simplified billing</li>
                <li><strong className="text-foreground">Update beneficiaries:</strong> Review and update beneficiaries after major life events (marriage, divorce, birth) to ensure your coverage protects who matters most</li>
                <li><strong className="text-foreground">Understand exclusions:</strong> Read policy documents carefully to know what's NOT covered - gaps in coverage can lead to unexpected out-of-pocket costs</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Insurance Policies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Store and manage your insurance coverage, track premium costs, and organize policy details
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Policy
            </Button>
          </div>

          {policies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No insurance policies yet. Add your first policy!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">
                          {policy.policy_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{policy.provider || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{policy.policy_number || "-"}</TableCell>
                      <TableCell>
                        ${policy.premium_amount.toLocaleString()}
                        <span className="text-xs text-muted-foreground">/{policy.premium_frequency}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(policy)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(policy.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddInsurancePolicyModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchPolicies} />
      <EditInsurancePolicyModal open={editModalOpen} onOpenChange={setEditModalOpen} policy={editingPolicy} onSuccess={fetchPolicies} />
    </div>
  );
};
