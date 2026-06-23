import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CreditCard,
  DollarSign,
  History,
  Edit2,
  Trash2,
  Clock,
  ChevronDown,
  Link2,
  ExternalLink,
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { toast } from "sonner";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { EditDebtModal } from "./EditDebtModal";

interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  linked_account_id: string | null;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_day: number | null;
  debt_type: string;
  status: string;
  priority_order: number | null;
  notes: string | null;
  created_at: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
}

interface DebtCardProps {
  debt: Debt;
  payments: DebtPayment[];
  onUpdate: () => void;
}

export function DebtCard({ debt, payments, onUpdate }: DebtCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const progress = debt.original_balance > 0 
    ? ((debt.original_balance - debt.current_balance) / debt.original_balance) * 100 
    : 0;

  const calculatePayoffMonths = () => {
    const balance = Number(debt.current_balance);
    const payment = Number(debt.minimum_payment);
    const rate = Number(debt.interest_rate) / 100 / 12;
    if (balance <= 0 || payment <= 0) return 0;
    if (rate === 0) return Math.ceil(balance / payment);
    const monthlyInterest = balance * rate;
    if (payment <= monthlyInterest) return Infinity;
    const months = Math.log(payment / (payment - balance * rate)) / Math.log(1 + rate);
    return Math.ceil(isFinite(months) ? months : balance / payment);
  };

  const payoffMonths = calculatePayoffMonths();
  const payoffYears = Math.floor(payoffMonths / 12);
  const remainingMonths = payoffMonths % 12;
  const payoffDate = addMonths(new Date(), payoffMonths);
  const futureInterest = payoffMonths * Number(debt.current_balance) * (Number(debt.interest_rate) / 100 / 12);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this debt?")) return;
    const { error } = await supabase.from("debts").delete().eq("id", debt.id);
    if (error) {
      toast.error("Failed to delete debt");
    } else {
      toast.success("Debt deleted");
      onUpdate();
    }
  };

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        {/* Compact Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{debt.name}</h3>
                    {debt.linked_account_id && (
                      <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium text-destructive">
                      ${Number(debt.current_balance).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                    </span>
                    <span>{Number(debt.interest_rate).toFixed(1)}% APR</span>
                    <span className="hidden sm:inline">${Number(debt.minimum_payment)}/mo</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground hidden sm:block">
                  {progress.toFixed(0)}%
                </span>
                <div className="w-16 h-2 rounded-full bg-muted overflow-hidden hidden sm:block">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
              </div>
            </div>
            {/* Mobile-only compact progress bar */}
            <div className="mt-2 sm:hidden">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{progress.toFixed(0)}% paid</span>
                <span>${Number(debt.minimum_payment)}/mo</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        {/* Expanded Details */}
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t">
            {/* Website Link */}
            {(debt as any).payment_url && (
              <Button 
                variant="outline" size="sm"
                className="w-full h-8 text-xs gap-1.5 mt-3 text-primary border-primary/30 hover:bg-primary/5"
                onClick={(e) => { e.stopPropagation(); window.open((debt as any).payment_url, '_blank', 'noopener,noreferrer'); }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit Website
              </Button>
            )}
            {/* Action Buttons */}
            <div className="flex gap-1 pt-1 justify-end">
              <Button 
                variant="ghost" size="icon" 
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => { e.stopPropagation(); setPaymentModalOpen(true); }}
                title="Record Payment"
              >
                <DollarSign className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); setEditModalOpen(true); }}
                title="Edit Debt"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Balance Details */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Current Balance</span>
                <span className="font-bold text-destructive">
                  ${Number(debt.current_balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {debt.creditor && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Creditor</span>
                  <span className="text-sm">{debt.creditor}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Interest Rate</span>
                <span className="font-semibold text-sm">{Number(debt.interest_rate).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Min Payment</span>
                <span className="font-semibold text-sm">${Number(debt.minimum_payment)}</span>
              </div>
            </div>

            {/* Payoff Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4" />
                  Time to Payoff
                </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
                  {payoffYears > 0 ? `${payoffYears}y ` : ""}{remainingMonths}m
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payoff Date</span>
                <span>{format(payoffDate, "MMM yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Future Interest</span>
                <span className="text-destructive">${Math.round(futureInterest).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment History */}
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-center gap-2 border-primary text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <History className="h-4 w-4" />
                  Payment History ({payments.length})
                  <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                {payments.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    No payments recorded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-sm font-medium">${Number(payment.amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{payment.payment_type} payment</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        debt={{ id: debt.id, name: debt.name, current_balance: Number(debt.current_balance) }}
        onSuccess={onUpdate}
      />
      <EditDebtModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        debt={{
          id: debt.id, name: debt.name, creditor: debt.creditor,
          original_balance: Number(debt.original_balance), current_balance: Number(debt.current_balance),
          interest_rate: Number(debt.interest_rate), minimum_payment: Number(debt.minimum_payment),
          due_day: debt.due_day, debt_type: debt.debt_type, status: debt.status, notes: debt.notes,
        }}
        onSuccess={onUpdate}
      />
    </Card>
  );
}
