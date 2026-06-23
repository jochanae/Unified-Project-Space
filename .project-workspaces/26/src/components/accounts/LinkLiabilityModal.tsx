import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AssetLiabilityPrompt,
  type AssetLiabilityData,
} from "./AssetLiabilityPrompt";
import {
  accountTypeToDebtType,
  debtTypeToBillCategory,
  createLinkedDebt,
  createLinkedBill,
  findExistingLiabilityAccount,
} from "@/utils/linkedRecordHelpers";

interface LinkLiabilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    name: string;
    account_type: string;
    institution: string | null;
    payment_url?: string | null;
  };
  onSuccess: () => void;
}

export function LinkLiabilityModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: LinkLiabilityModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateLiability = async (data: AssetLiabilityData) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const liabilityName = `${account.name} - ${data.liabilityType === "mortgage" ? "Mortgage" : data.liabilityType === "auto_loan" ? "Auto Loan" : "Loan"}`;

      const existingAccount = await findExistingLiabilityAccount(user.id, liabilityName);
      let liabilityAccountId: string;

      if (existingAccount) {
        liabilityAccountId = existingAccount.id;
        toast.info("Liability account already exists");
      } else {
        const { data: newAccount, error } = await supabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: liabilityName,
            institution: data.lender || account.institution || null,
            account_type: data.liabilityType as any,
            category: "liability" as const,
            balance: parseFloat(data.loanBalance) || 0,
            is_manual: true,
          })
          .select("id")
          .single();

        if (error) throw error;
        liabilityAccountId = newAccount.id;
      }

      const debtResult = await createLinkedDebt({
        userId: user.id,
        accountId: liabilityAccountId,
        name: liabilityName,
        creditor: data.lender || account.institution || "",
        debtType: accountTypeToDebtType(data.liabilityType),
        currentBalance: parseFloat(data.loanBalance) || 0,
        interestRate: parseFloat(data.interestRate) || 0,
        minimumPayment: parseFloat(data.minimumPayment) || 0,
        dueDay: data.dueDay ? parseInt(data.dueDay) : null,
        paymentUrl: account.payment_url || null,
      });

      const debtType = accountTypeToDebtType(data.liabilityType);
      await createLinkedBill({
        userId: user.id,
        name: liabilityName,
        amount: parseFloat(data.minimumPayment) || parseFloat(data.loanBalance) || 0,
        category: debtTypeToBillCategory(debtType),
        dueDay: data.dueDay ? parseInt(data.dueDay) : null,
        linkedAccountId: liabilityAccountId,
        linkedDebtId: debtResult.data?.id || null,
        paymentUrl: account.payment_url || null,
      });

      toast.success("Liability, debt tracker & bill created!");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating linked liability:", err);
      toast.error("Failed to create linked liability");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Link Liability</DialogTitle>
        </DialogHeader>
        <AssetLiabilityPrompt
          assetName={account.name}
          assetType={account.account_type}
          onCreateLiability={handleCreateLiability}
          onSkip={() => onOpenChange(false)}
          onPaidOff={() => {
            toast.success("Great — no liability needed!");
            onOpenChange(false);
          }}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
