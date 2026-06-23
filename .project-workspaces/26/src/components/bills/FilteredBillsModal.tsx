import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, TrendingDown, Calendar } from "lucide-react";
import BillCard from "./BillCard";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  frequency: string;
  is_recurring: boolean;
  is_autopay: boolean;
  is_variable_amount: boolean;
  reminder_enabled: boolean;
  reminder_days_before: number;
  status: string;
  notes: string | null;
  last_paid_date: string | null;
  autopay_source: 'internal' | 'external' | null;
  end_date: string | null;
  total_payments: number | null;
  is_projected?: boolean;
}

type FilterType = 'recurring' | 'one_time' | 'variable';

interface FilteredBillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterType: FilterType;
  bills: Bill[];
  onPay: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => void;
  onQuickPay?: (bill: Bill) => void;
  isFutureMonth?: boolean;
}

const filterConfig: Record<FilterType, { label: string; icon: typeof RefreshCw; description: string }> = {
  recurring: { label: 'Recurring Bills', icon: RefreshCw, description: 'Bills that repeat on a schedule' },
  variable: { label: 'Variable Bills', icon: TrendingDown, description: 'Bills where the amount changes each period' },
  one_time: { label: 'One-time Bills', icon: Calendar, description: 'Bills that only occur once' },
};

const FilteredBillsModal = ({ open, onOpenChange, filterType, bills, onPay, onEdit, onDelete, onQuickPay, isFutureMonth }: FilteredBillsModalProps) => {
  const config = filterConfig[filterType];
  const Icon = config.icon;

  const filteredBills = bills.filter(bill => {
    if (filterType === 'recurring') return bill.is_recurring;
    if (filterType === 'one_time') return !bill.is_recurring;
    if (filterType === 'variable') return bill.is_variable_amount;
    return true;
  });

  const unpaid = filteredBills.filter(b => b.status !== 'paid');
  const paid = filteredBills.filter(b => b.status === 'paid');
  const totalAmount = filteredBills.reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {config.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </DialogHeader>

        {/* Summary */}
        <div className="flex gap-3 mb-2">
          <div className="flex-1 bg-primary/10 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-base font-bold text-primary">{filteredBills.length} bills</p>
          </div>
          <div className="flex-1 bg-muted rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-base font-bold text-foreground">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="text-center py-8">
            <Icon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {config.label.toLowerCase()} found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unpaid.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unpaid ({unpaid.length})</h4>
                {unpaid.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    variant="default"
                    isFutureMonth={isFutureMonth}
                    onPay={() => onPay(bill)}
                    onQuickPay={onQuickPay ? () => onQuickPay(bill) : undefined}
                    onEdit={() => onEdit(bill)}
                    onDelete={() => onDelete(bill.id)}
                  />
                ))}
              </div>
            )}
            {paid.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid ({paid.length})</h4>
                {paid.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    variant="paid"
                    isFutureMonth={isFutureMonth}
                    onPay={() => onPay(bill)}
                    onQuickPay={onQuickPay ? () => onQuickPay(bill) : undefined}
                    onEdit={() => onEdit(bill)}
                    onDelete={() => onDelete(bill.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FilteredBillsModal;
