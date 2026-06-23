import { useState } from "react";
import { Plus, FileText, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { TransferModal } from "@/components/transactions/TransferModal";
import CreateBillModal from "@/components/bills/CreateBillModal";

export function DashboardQuickActions() {
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  const actions = [
    { label: "Transaction", icon: Plus, onClick: () => setTransactionOpen(true), color: "text-emerald-600 dark:text-emerald-400", borderColor: "border-emerald-300 dark:border-emerald-700" },
    { label: "Add Bill", icon: FileText, onClick: () => setBillOpen(true), color: "text-blue-600 dark:text-blue-400", borderColor: "border-blue-300 dark:border-blue-700" },
    { label: "Transfer", icon: ArrowLeftRight, onClick: () => setTransferOpen(true), color: "text-violet-600 dark:text-violet-400", borderColor: "border-violet-300 dark:border-violet-700" },
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className={`flex-1 h-auto py-2.5 gap-2 hover:bg-muted/50 rounded-xl shadow-sm ${action.borderColor}`}
            onClick={action.onClick}
          >
            <action.icon className={`h-4 w-4 ${action.color}`} />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      <AddTransactionModal open={transactionOpen} onOpenChange={setTransactionOpen} defaultType="income" />
      <TransferModal open={transferOpen} onOpenChange={setTransferOpen} />
      <CreateBillModal open={billOpen} onOpenChange={setBillOpen} bill={null} onSuccess={() => {}} />
    </>
  );
}
