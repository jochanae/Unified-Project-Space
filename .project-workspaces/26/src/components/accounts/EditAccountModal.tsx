import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Pencil, X, Link2, ExternalLink } from "lucide-react";
import { ASSET_LIABILITY_MAP } from "./AssetLiabilityPrompt";
import { LinkLiabilityModal } from "./LinkLiabilityModal";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  account_number_masked: string | null;
  account_type: string;
  category: "asset" | "liability";
  balance: number;
  is_manual: boolean;
  notes?: string | null;
}

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
  onSuccess: () => void;
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking", category: "asset" },
  { value: "savings", label: "Savings", category: "asset" },
  { value: "money_market", label: "Money Market", category: "asset" },
  { value: "cd", label: "CD", category: "asset" },
  { value: "investment", label: "Investment", category: "asset" },
  { value: "brokerage", label: "Brokerage", category: "asset" },
  { value: "retirement_401k", label: "401(k)", category: "asset" },
  { value: "retirement_ira", label: "IRA", category: "asset" },
  { value: "retirement_roth", label: "Roth IRA", category: "asset" },
  { value: "real_estate", label: "Real Estate", category: "asset" },
  { value: "vehicle", label: "Vehicle", category: "asset" },
  { value: "crypto", label: "Cryptocurrency", category: "asset" },
  { value: "insurance", label: "Insurance", category: "asset" },
  { value: "annuity", label: "Annuity", category: "asset" },
  { value: "credit_card", label: "Credit Card", category: "liability" },
  { value: "line_of_credit", label: "Line of Credit", category: "liability" },
  { value: "mortgage", label: "Mortgage", category: "liability" },
  { value: "heloc", label: "HELOC", category: "liability" },
  { value: "auto_loan", label: "Auto Loan", category: "liability" },
  { value: "student_loan", label: "Student Loan", category: "liability" },
  { value: "personal_loan", label: "Personal Loan", category: "liability" },
  { value: "other", label: "Other", category: "asset" },
];

export function EditAccountModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: EditAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkLiabilityOpen, setLinkLiabilityOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    institution: "",
    account_number_masked: "",
    account_type: "",
    balance: "",
    notes: "",
    payment_url: "",
  });
  const canLinkLiability = account.category === "asset" && !!ASSET_LIABILITY_MAP[formData.account_type || account.account_type];

  useEffect(() => {
    if (account && open) {
      setFormData({
        name: account.name || "",
        institution: account.institution || "",
        account_number_masked: account.account_number_masked || "",
        account_type: account.account_type || "",
        balance: String(account.balance) || "",
        notes: account.notes || "",
        payment_url: (account as any).payment_url || "",
      });
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedType = ACCOUNT_TYPES.find((t) => t.value === formData.account_type);
    const category = selectedType?.category || "asset";

    const { error } = await supabase
      .from("accounts")
      .update({
        name: formData.name,
        institution: formData.institution || null,
        account_number_masked: formData.account_number_masked || null,
        account_type: formData.account_type as any,
        category: category as "asset" | "liability",
        balance: parseFloat(formData.balance) || 0,
        notes: formData.notes || null,
        payment_url: formData.payment_url || null,
      })
      .eq("id", account.id);

    setIsSubmitting(false);

    if (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    } else {
      toast.success("Account updated successfully");
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col rounded-t-3xl">
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-4 px-4">
          <div className="mx-auto w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-4" />
        </div>

        <DrawerHeader className="flex-shrink-0 px-4 pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Account
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                placeholder="e.g., Chase, Bank of America"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number_masked">Account Number (last 4 digits)</Label>
              <Input
                id="account_number_masked"
                placeholder="1234"
                maxLength={4}
                value={formData.account_number_masked}
                onChange={(e) => setFormData({ ...formData, account_number_masked: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Account Type *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Assets</div>
                  {ACCOUNT_TYPES.filter((t) => t.category === "asset").map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Liabilities</div>
                  {ACCOUNT_TYPES.filter((t) => t.category === "liability").map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">
                {ACCOUNT_TYPES.find(t => t.value === formData.account_type)?.category === "liability" 
                  ? "Amount Owed *" 
                  : "Current Value *"}
              </Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_url" className="flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="payment_url"
                type="url"
                placeholder="https://www.lender.com/pay"
                value={formData.payment_url}
                onChange={(e) => setFormData({ ...formData, payment_url: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Link to the website for this account</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this account..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Link Liability Option */}
            {canLinkLiability && (
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Link a Liability</p>
                    <p className="text-xs text-muted-foreground">
                      Add a mortgage or loan associated with this asset
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLinkLiabilityOpen(true)}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t bg-background px-4 py-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="flex-1 h-11"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DrawerContent>

      {/* Link Liability Modal */}
      {canLinkLiability && (
        <LinkLiabilityModal
          open={linkLiabilityOpen}
          onOpenChange={setLinkLiabilityOpen}
          account={account}
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
        />
      )}
    </Drawer>
  );
}
