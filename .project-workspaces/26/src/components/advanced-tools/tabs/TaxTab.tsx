import { useState, useEffect } from "react";
import { Info, Pencil, Plus, Upload, Sparkles, Shield, Heart, TrendingUp, FileUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EditDeductionsModal } from "../modals/EditDeductionsModal";
import { UploadTaxDocumentModal } from "../modals/UploadTaxDocumentModal";

interface TaxDeduction {
  id: string;
  tax_year: number;
  medical_expenses: number;
  mortgage_interest: number;
  state_local_taxes: number;
  education_expenses: number;
  retirement_contributions: number;
  hsa_contributions: number;
  other_deductions: number;
  gross_income: number;
  filing_status: string;
}

interface TaxDocument {
  id: string;
  name: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export const TaxTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tipsOpen, setTipsOpen] = useState(false);
  const [deductions, setDeductions] = useState<TaxDeduction | null>(null);
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      fetchDeductions();
      fetchDocuments();
    }
  }, [user]);

  const fetchDeductions = async () => {
    const { data, error } = await supabase
      .from("tax_deductions")
      .select("*")
      .eq("user_id", user!.id)
      .eq("tax_year", currentYear)
      .maybeSingle();

    if (!error && data) {
      setDeductions(data);
    }
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("tax_documents")
      .select("*")
      .eq("user_id", user!.id)
      .eq("tax_year", currentYear)
      .order("uploaded_at", { ascending: false });

    if (!error) {
      setDocuments(data || []);
    }
  };

  const totalDeductions = deductions
    ? Number(deductions.medical_expenses) +
      Number(deductions.mortgage_interest) +
      Number(deductions.state_local_taxes) +
      Number(deductions.education_expenses) +
      Number(deductions.other_deductions)
    : 0;

  const taxableIncome = deductions ? Math.max(0, Number(deductions.gross_income) - totalDeductions) : 0;
  
  // Simple tax calculation (2024 brackets for single filer)
  const calculateTax = (income: number) => {
    if (income <= 11600) return income * 0.10;
    if (income <= 47150) return 1160 + (income - 11600) * 0.12;
    if (income <= 100525) return 5426 + (income - 47150) * 0.22;
    if (income <= 191950) return 17168.50 + (income - 100525) * 0.24;
    return 39110.50 + (income - 191950) * 0.32;
  };

  const estimatedTax = calculateTax(taxableIncome);
  const effectiveRate = taxableIncome > 0 ? (estimatedTax / taxableIncome) * 100 : 0;

  const getTaxBracket = (income: number) => {
    if (income <= 11600) return "10%";
    if (income <= 47150) return "12%";
    if (income <= 100525) return "22%";
    if (income <= 191950) return "24%";
    return "32%";
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 hover:bg-blue-100/50 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-base font-medium">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Tax Planning Tips
                </div>
                <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Track throughout the year:</strong> Don't wait until tax season - recording deductions as they happen ensures nothing is missed</li>
                <li><strong className="text-foreground">Keep receipts organized:</strong> Upload photos of receipts immediately for medical expenses, charitable donations, and business expenses</li>
                <li><strong className="text-foreground">Review quarterly:</strong> Check your withholding every 3 months to avoid surprises and adjust if needed</li>
                <li><strong className="text-foreground">Maximize deductions:</strong> Consider bunching charitable donations or medical procedures in one year to exceed standard deduction</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Tax Strategy Planning</CardTitle>
          <p className="text-sm text-muted-foreground">Optimize your tax position with strategic planning and tracking</p>
        </CardHeader>
      </Card>

      {/* Desktop 2-col grid for main cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-1.5 bg-blue-100 rounded text-blue-600">💰</span>
            Deduction Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medical Expenses</span>
              <span className="font-medium">${(deductions?.medical_expenses || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Mortgage Interest</span>
              <span className="font-medium">${(deductions?.mortgage_interest || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">State & Local Taxes</span>
              <span className="font-medium">${(deductions?.state_local_taxes || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Education Expenses</span>
              <span className="font-medium">${(deductions?.education_expenses || 0).toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>Total Deductions</span>
              <span className="text-green-600">${totalDeductions.toLocaleString()}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4 border-purple-300 text-purple-600 hover:bg-purple-50" onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Deductions
          </Button>
        </CardContent>
      </Card>

      {/* Tax Scenarios */}
      <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Tax Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Tax</p>
              <p className="text-3xl font-bold text-green-600">${estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Effective Tax Rate</p>
              <p className="text-xl font-bold">{effectiveRate.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax Bracket</p>
              <p className="text-xl font-bold">{getTaxBracket(taxableIncome)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>

      {/* Tax Optimization */}
      <Card className="border-2 border-purple-300 bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Tax Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start border-purple-300 text-purple-600 hover:bg-purple-50">
            <Shield className="h-4 w-4 mr-2" />
            Retirement Contributions
          </Button>
          <Button variant="outline" className="w-full justify-start border-purple-300 text-purple-600 hover:bg-purple-50">
            <Heart className="h-4 w-4 mr-2 text-pink-500" />
            HSA Contributions
          </Button>
        </CardContent>
      </Card>

      {/* Tax Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Tax Documents ({currentYear})</CardTitle>
          <p className="text-sm text-muted-foreground">Store and organize your tax-related documents</p>
        </CardHeader>
        <CardContent>
          <Button 
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600" 
            onClick={() => setUploadModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Upload Document
          </Button>

          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No tax documents uploaded yet</p>
              <p className="text-sm text-muted-foreground">Upload your W-2s, 1099s, and other tax documents to keep them organized</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{doc.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">({doc.document_type})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditDeductionsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        deductions={deductions}
        onSuccess={fetchDeductions}
      />
      <UploadTaxDocumentModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={fetchDocuments}
      />
    </div>
  );
};
