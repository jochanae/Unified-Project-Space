import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CreditCard, Landmark, Loader2, CheckCircle, Zap, Sparkles, Crown } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { LinkedRecordPrompt } from "@/components/shared/LinkedRecordPrompt";
import { AssetLiabilityPrompt, ASSET_LIABILITY_MAP, type AssetLiabilityData } from "@/components/accounts/AssetLiabilityPrompt";
import {
  accountTypeToDebtType,
  debtTypeToBillCategory,
  createLinkedDebt,
  createLinkedBill,
  findLinkedDebt,
  findExistingLiabilityAccount,
} from "@/utils/linkedRecordHelpers";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ASSET_TYPES = [
  { value: "cash", label: "Cash on Hand" },
  { value: "checking", label: "Checking Account" },
  { value: "savings", label: "Savings Account" },
  { value: "money_market", label: "Money Market" },
  { value: "cd", label: "Certificate of Deposit" },
  { value: "investment", label: "Investment Account" },
  { value: "brokerage", label: "Brokerage" },
  { value: "retirement_401k", label: "401(k)" },
  { value: "retirement_ira", label: "Traditional IRA" },
  { value: "retirement_roth", label: "Roth IRA" },
  { value: "real_estate", label: "Real Estate" },
  { value: "vehicle", label: "Vehicle" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "other", label: "Other Asset" },
];

const LIABILITY_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "line_of_credit", label: "Line of Credit" },
  { value: "mortgage", label: "Mortgage" },
  { value: "heloc", label: "HELOC" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "other", label: "Other Liability" },
];

type FlowStep = "form" | "prompt-debt" | "prompt-bill" | "prompt-asset-liability" | "done";

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<"asset" | "liability">("asset");
  const [useBankConnection, setUseBankConnection] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [plaidStatus, setPlaidStatus] = useState<"idle" | "loading" | "ready" | "linking" | "success" | "error">("idle");
  const [form, setForm] = useState({
    name: "",
    institution: "",
    account_number_masked: "",
    account_type: "checking",
    balance: "",
    bankWebsite: "",
    enableAlerts: false,
  });

  // Linked record flow state
  const [flowStep, setFlowStep] = useState<FlowStep>("form");
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [createdDebtId, setCreatedDebtId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  const accountTypes = category === "asset" ? ASSET_TYPES : LIABILITY_TYPES;

  // Plaid Link setup
  const createLinkToken = async () => {
    setPlaidStatus("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to link your bank");
        setPlaidStatus("idle");
        return;
      }

      const response = await supabase.functions.invoke("plaid", {
        body: { action: "create_link_token" },
      });

      if (response.error) throw new Error(response.error.message);

      if (response.data?.link_token) {
        setLinkToken(response.data.link_token);
        setPlaidStatus("ready");
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error creating link token:", error);
      toast.error("Failed to initialize bank connection");
      setPlaidStatus("error");
    }
  };

  const onPlaidSuccess = async (publicToken: string) => {
    setPlaidStatus("linking");
    try {
      const response = await supabase.functions.invoke("plaid", {
        body: { action: "exchange_token", public_token: publicToken },
      });

      if (response.error) throw new Error(response.error.message);

      if (response.data?.success) {
        setPlaidStatus("success");
        toast.success(`Successfully linked ${response.data.accounts_linked} accounts from ${response.data.institution}`);
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
          resetForm();
        }, 1500);
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error exchanging token:", error);
      setPlaidStatus("error");
      toast.error("Failed to link bank accounts");
    }
  };

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      if (plaidStatus === "ready") setPlaidStatus("ready");
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      institution: "",
      account_number_masked: "",
      account_type: "checking",
      balance: "",
      bankWebsite: "",
      enableAlerts: false,
    });
    setCategory("asset");
    setUseBankConnection(false);
    setLinkToken(null);
    setPlaidStatus("idle");
    setFlowStep("form");
    setCreatedAccountId(null);
    setCreatedDebtId(null);
  };

  const handleBankConnectionToggle = (checked: boolean) => {
    setUseBankConnection(checked);
    if (checked && plaidStatus === "idle") {
      createLinkToken();
    }
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: form.name,
      institution: form.institution || null,
      account_number_masked: form.account_number_masked || null,
      account_type: form.account_type as any,
      category: category,
      balance: parseFloat(form.balance) || 0,
      is_manual: true,
      payment_url: form.bankWebsite?.trim() || null,
    }).select("id").single();

    setLoading(false);

    if (error) {
      toast.error("Failed to add account");
      return;
    }

    toast.success("Account added!");
    onSuccess?.();

    // For liabilities, show the linked record prompts instead of closing
    if (category === "liability" && data) {
      setCreatedAccountId(data.id);
      // Check if a debt already exists for this account
      const existingDebt = await findLinkedDebt(data.id);
      if (existingDebt) {
        setCreatedDebtId(existingDebt.id);
        setFlowStep("prompt-bill");
      } else {
        setFlowStep("prompt-debt");
      }
    } else if (category === "asset" && data && ASSET_LIABILITY_MAP[form.account_type]) {
      // For assets that commonly have liabilities (real_estate, vehicle)
      setCreatedAccountId(data.id);
      setFlowStep("prompt-asset-liability");
    } else if (addAnother) {
      resetForm();
    } else {
      onOpenChange(false);
      resetForm();
    }
  };

  const handleCreateDebt = async (debtData: { interestRate: string; minimumPayment: string; dueDay: string }) => {
    if (!user || !createdAccountId) return;
    setLinkLoading(true);

    try {
      const result = await createLinkedDebt({
        userId: user.id,
        accountId: createdAccountId,
        name: form.name,
        creditor: form.institution,
        debtType: accountTypeToDebtType(form.account_type),
        currentBalance: parseFloat(form.balance) || 0,
        interestRate: parseFloat(debtData.interestRate) || 0,
        minimumPayment: parseFloat(debtData.minimumPayment) || 0,
        dueDay: debtData.dueDay ? parseInt(debtData.dueDay) : null,
        paymentUrl: form.bankWebsite?.trim() || null,
      });

      if (result.alreadyExisted) {
        toast.info("Debt entry already exists for this account");
      } else {
        toast.success("Added to Debt Tracker!");
      }

      setCreatedDebtId(result.data!.id);
      onSuccess?.();
      setFlowStep("prompt-bill");
    } catch (err) {
      console.error("Error creating linked debt:", err);
      toast.error("Failed to create debt entry");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCreateBill = async () => {
    if (!user) return;
    setLinkLoading(true);

    try {
      const debtType = accountTypeToDebtType(form.account_type);
      const result = await createLinkedBill({
        userId: user.id,
        name: form.name,
        amount: parseFloat(form.balance) || 0,
        category: debtTypeToBillCategory(debtType),
        dueDay: null,
        linkedAccountId: createdAccountId,
        linkedDebtId: createdDebtId,
        paymentUrl: form.bankWebsite?.trim() || null,
      });

      if (result.alreadyExisted) {
        toast.info("Bill already exists for this account");
      } else {
        toast.success("Added to Bills!");
      }

      onSuccess?.();
    } catch (err) {
      console.error("Error creating linked bill:", err);
      toast.error("Failed to create bill entry");
    } finally {
      setLinkLoading(false);
      onOpenChange(false);
      resetForm();
    }
  };

  const handleSkipPrompt = () => {
    if (flowStep === "prompt-debt") {
      setFlowStep("prompt-bill");
    } else {
      onOpenChange(false);
      resetForm();
    }
  };

  const handleCreateAssetLiability = async (data: AssetLiabilityData) => {
    if (!user || !createdAccountId) return;
    setLinkLoading(true);

    try {
      // 1. Create the liability account
      const liabilityName = `${form.name} - ${data.liabilityType === "mortgage" ? "Mortgage" : data.liabilityType === "auto_loan" ? "Auto Loan" : "Loan"}`;
      
      // Check if liability account already exists
      const existingAccount = await findExistingLiabilityAccount(user.id, liabilityName);
      let liabilityAccountId: string;

      if (existingAccount) {
        liabilityAccountId = existingAccount.id;
        toast.info("Liability account already exists");
      } else {
        const { data: newAccount, error: accountError } = await supabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: liabilityName,
            institution: data.lender || form.institution || null,
            account_type: data.liabilityType as any,
            category: "liability" as const,
            balance: parseFloat(data.loanBalance) || 0,
            is_manual: true,
          })
          .select("id")
          .single();

        if (accountError) throw accountError;
        liabilityAccountId = newAccount.id;
      }

      // 2. Create linked debt
      const debtResult = await createLinkedDebt({
        userId: user.id,
        accountId: liabilityAccountId,
        name: liabilityName,
        creditor: data.lender || form.institution || "",
        debtType: accountTypeToDebtType(data.liabilityType),
        currentBalance: parseFloat(data.loanBalance) || 0,
        interestRate: parseFloat(data.interestRate) || 0,
        minimumPayment: parseFloat(data.minimumPayment) || 0,
        dueDay: data.dueDay ? parseInt(data.dueDay) : null,
        paymentUrl: form.bankWebsite?.trim() || null,
      });

      // 3. Create linked bill
      const debtType = accountTypeToDebtType(data.liabilityType);
      await createLinkedBill({
        userId: user.id,
        name: liabilityName,
        amount: parseFloat(data.minimumPayment) || parseFloat(data.loanBalance) || 0,
        category: debtTypeToBillCategory(debtType),
        dueDay: data.dueDay ? parseInt(data.dueDay) : null,
        linkedAccountId: liabilityAccountId,
        linkedDebtId: debtResult.data?.id || null,
        paymentUrl: form.bankWebsite?.trim() || null,
      });

      toast.success("Liability, debt tracker & bill created!");
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error("Error creating asset liability:", err);
      toast.error("Failed to create linked liability");
    } finally {
      setLinkLoading(false);
    }
  };

  const isFormStep = flowStep === "form";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center text-xl">
            {isFormStep ? "Add New Account" : ""}
          </DialogTitle>
        </DialogHeader>

        {isFormStep ? (
          <>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Assets / Liabilities Toggle */}
              <div className="flex rounded-full bg-muted p-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("asset");
                    setForm({ ...form, account_type: "checking" });
                  }}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                    category === "asset"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Assets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("liability");
                    setForm({ ...form, account_type: "credit_card" });
                  }}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                    category === "liability"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Liabilities
                </button>
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {category === "asset" ? "Asset Type" : "Liability Type"}
                </Label>
                <Select
                  value={form.account_type}
                  onValueChange={(value) => setForm({ ...form, account_type: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Name */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Account Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Chase Checking, Fidelity 401k"
                  className="h-12"
                  required
                />
              </div>

              {/* Institution Name */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Institution Name</Label>
                <Input
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  placeholder="e.g., Chase Bank, Fidelity"
                  className="h-12"
                />
              </div>

              {/* Account Number (Last 4) */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Account Number (Last 4)</Label>
                <Input
                  value={form.account_number_masked}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setForm({ ...form, account_number_masked: value });
                  }}
                  placeholder="1234"
                  className="h-12"
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground">For identification purposes only</p>
              </div>

              {/* Current Balance */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Current Balance</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    placeholder="0"
                    className="h-12 pl-7"
                    required
                  />
                </div>
              </div>

              {/* Bank Connection Toggle - RECOMMENDED */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-4 space-y-3 border-2 border-orange-300 dark:border-orange-700 relative">
                <div className="absolute -top-2.5 left-4 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    RECOMMENDED
                  </span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    PREMIUM
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-orange-600" />
                    <div>
                      <span className="font-semibold">Smart Bank Connection</span>
                      <p className="text-xs text-muted-foreground">Auto-sync balances, transactions & bill detection</p>
                    </div>
                  </div>
                  <Switch 
                    checked={useBankConnection}
                    onCheckedChange={handleBankConnectionToggle}
                  />
                </div>
                
                {!useBankConnection && (
                  <div className="mt-2 p-2 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Link your bank to auto-detect bills from transaction patterns!</span>
                    </p>
                  </div>
                )}
                {useBankConnection && (
                  <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                    {plaidStatus === "loading" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Initializing secure connection...
                      </div>
                    )}
                    {plaidStatus === "ready" && (
                      <Button
                        type="button"
                        onClick={() => plaidReady && openPlaid()}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={!plaidReady}
                      >
                        <Landmark className="h-4 w-4 mr-2" />
                        Connect Your Bank
                      </Button>
                    )}
                    {plaidStatus === "linking" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Linking your accounts...
                      </div>
                    )}
                    {plaidStatus === "success" && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Accounts linked successfully!
                      </div>
                    )}
                    {plaidStatus === "error" && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Bank connection isn't available right now. You can still add your account manually below — just fill in the details and save!
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUseBankConnection(false);
                            setPlaidStatus("idle");
                          }}
                        >
                          Continue Manually
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bank Website */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Bank Website (Optional)</Label>
                <Input
                  value={form.bankWebsite}
                  onChange={(e) => setForm({ ...form, bankWebsite: e.target.value })}
                  placeholder="https://www.chase.com"
                  className="h-12"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">Quick link to access your account online</p>
              </div>

              {/* Low Balance Alerts */}
              <div className="bg-sky-50 dark:bg-sky-950/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-sky-600" />
                  <span className="font-semibold">Low Balance Alerts</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when balance falls below threshold</p>
                  </div>
                  <Switch
                    checked={form.enableAlerts}
                    onCheckedChange={(checked) => setForm({ ...form, enableAlerts: checked })}
                  />
                </div>
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="flex flex-col gap-2 pt-4 flex-shrink-0 border-t mt-4 px-1">
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-12 border-primary text-primary hover:bg-primary/10" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={(e) => handleSubmit(e, false)}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-purple-600" 
                  disabled={loading || !form.name || !form.balance}
                >
                  {loading ? "Adding..." : "Add Account"}
                </Button>
              </div>
              <Button 
                variant="secondary"
                onClick={(e) => handleSubmit(e, true)}
                className="w-full h-12" 
                disabled={loading || !form.name || !form.balance}
              >
                {loading ? "Adding..." : "Save & Add Another"}
              </Button>
            </div>
          </>
        ) : flowStep === "prompt-asset-liability" ? (
          <div className="py-2">
            <AssetLiabilityPrompt
              assetName={form.name}
              assetType={form.account_type}
              onCreateLiability={handleCreateAssetLiability}
              onSkip={() => { onOpenChange(false); resetForm(); }}
              onPaidOff={() => { 
                toast.success("Great — no liability needed!");
                onOpenChange(false); 
                resetForm(); 
              }}
              isLoading={linkLoading}
            />
          </div>
        ) : (
          <div className="py-2">
            <LinkedRecordPrompt
              createdType="account"
              createdName={form.name}
              promptType="both"
              currentStep={flowStep === "prompt-debt" ? "debt" : "bill"}
              onCreateDebt={handleCreateDebt}
              onCreateBill={handleCreateBill}
              onSkip={handleSkipPrompt}
              isLoading={linkLoading}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
