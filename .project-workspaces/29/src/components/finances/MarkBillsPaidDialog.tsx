import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Bill } from '@/hooks/useFinances';
import type { UseMutationResult } from '@tanstack/react-query';

const billCategoryEmojis: Record<string, string> = {
  rent: '🏠', mortgage: '🏡', utilities: '⚡', insurance: '🛡️',
  subscriptions: '📱', phone: '📞', internet: '🌐', car: '🚗',
  loan: '🏦', credit_card: '💳', other: '📦',
};

interface MarkBillsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  toggleBillPaid: UseMutationResult<void, Error, { id: string; isPaid: boolean }>;
}

export function MarkBillsPaidDialog({ open, onOpenChange, bills, toggleBillPaid }: MarkBillsPaidDialogProps) {
  const unpaidBills = bills.filter(b => !b.is_paid_this_month);
  const paidBills = bills.filter(b => b.is_paid_this_month);
  const today = new Date().getDate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark Bills Paid</DialogTitle>
          <DialogDescription>
            Toggle bills you've paid this month.
          </DialogDescription>
        </DialogHeader>

        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No bills to show. Add some bills first.
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Unpaid bills first */}
            {unpaidBills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Unpaid ({unpaidBills.length})
                </p>
                {unpaidBills.map(bill => {
                  const isOverdue = bill.due_day < today;
                  return (
                    <button
                      key={bill.id}
                      onClick={() => toggleBillPaid.mutate({ id: bill.id, isPaid: true })}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                        isOverdue
                          ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                          : 'bg-muted/30 border-border/40 hover:bg-muted/60'
                      )}
                    >
                      <Checkbox checked={false} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {billCategoryEmojis[bill.category] || '📦'} {bill.name}
                          </span>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">Overdue</Badge>
                          )}
                          {bill.is_autopay && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">Autopay</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Due {bill.due_day}th</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">${Number(bill.amount).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Already paid */}
            {paidBills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Paid ({paidBills.length})
                </p>
                {paidBills.map(bill => (
                  <button
                    key={bill.id}
                    onClick={() => toggleBillPaid.mutate({ id: bill.id, isPaid: false })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors text-left"
                  >
                    <Checkbox checked={true} className="pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground line-through truncate">
                        {billCategoryEmojis[bill.category] || '📦'} {bill.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-muted-foreground line-through">
                      ${Number(bill.amount).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
