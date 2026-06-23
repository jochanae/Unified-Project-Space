import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, CreditCard, Pencil, Info } from 'lucide-react';
import { Bill } from '@/hooks/useFinances';
import { AddBillDialog } from './AddBillDialog';
import { CollapsibleFinanceSection } from './CollapsibleFinanceSection';
import { BillsOverviewSummary } from './BillsOverviewSummary';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { NewBill, UpdateBill } from '@/hooks/useFinances';
import { cn } from '@/lib/utils';

const billCategoryLabels: Record<string, string> = {
  rent: '🏠 Rent',
  mortgage: '🏡 Mortgage',
  utilities: '⚡ Utilities',
  insurance: '🛡️ Insurance',
  subscriptions: '📱 Subscriptions',
  phone: '📞 Phone',
  internet: '🌐 Internet',
  car: '🚗 Car',
  loan: '🏦 Loan',
  credit_card: '💳 Credit Card',
  other: '📦 Other',
};

interface BillsTrackerProps {
  bills: Bill[];
  summary: { paidBills: number; unpaidBills: number; totalBills: number };
  addBill: UseMutationResult<void, Error, NewBill>;
  updateBill: UseMutationResult<void, Error, UpdateBill>;
  toggleBillPaid: UseMutationResult<void, Error, { id: string; isPaid: boolean }>;
  deleteBill: UseMutationResult<void, Error, string>;
  selectedMonth?: Date;
}

export function BillsTracker({ bills, summary, addBill, updateBill, toggleBillPaid, deleteBill, selectedMonth }: BillsTrackerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const today = new Date().getDate();

  const handleDelete = (bill: Bill) => {
    const billData = { ...bill };
    deleteBill.mutate(bill.id);
    toast(`"${billData.name}" deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          addBill.mutate({
            name: billData.name,
            amount: billData.amount,
            due_day: billData.due_day,
            category: billData.category,
            is_autopay: billData.is_autopay,
          });
        },
      },
      duration: 6000,
    });
  };

  return (
    <CollapsibleFinanceSection
      id="bills-tracker"
      title="Bills"
      icon={<CreditCard className="h-4 w-4 text-rose-500" />}
      badge={
        <div className="flex gap-2 text-[10px] font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">${summary.paidBills.toFixed(0)} paid</span>
          <span className="text-rose-600 dark:text-rose-400">${summary.unpaidBills.toFixed(0)} due</span>
        </div>
      }
      actionButton={
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3 w-3" /> Add Bill
        </Button>
      }
    >
      <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mb-2">
        <Info className="h-3 w-3 shrink-0" /> Fixed recurring obligations — rent, utilities, subscriptions, loans. Check them off as paid each month.
      </p>

      {/* Overview summary with progress bar */}
      <BillsOverviewSummary
        bills={bills}
        paidAmount={summary.paidBills}
        unpaidAmount={summary.unpaidBills}
        totalAmount={summary.totalBills}
      />

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No bills tracked yet. Add your monthly bills.
        </p>
      ) : (
        <div className="space-y-2">
          {bills.map(bill => (
            <BillRow
              key={bill.id}
              bill={bill}
              today={today}
              onTogglePaid={(checked) => {
                const isPaying = !!checked;
                if (isPaying) {
                  toast(`Mark "${bill.name}" as paid ($${Number(bill.amount).toFixed(2)})?`, {
                    action: {
                      label: 'Confirm',
                      onClick: () => toggleBillPaid.mutate({ id: bill.id, isPaid: true }),
                    },
                    cancel: {
                      label: 'Cancel',
                      onClick: () => {},
                    },
                    duration: 6000,
                  });
                } else {
                  toggleBillPaid.mutate({ id: bill.id, isPaid: false });
                }
              }}
              onEdit={() => setEditingBill(bill)}
              onDelete={() => handleDelete(bill)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <AddBillDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSubmit={(data) => {
          addBill.mutate(data);
          setShowAdd(false);
        }}
      />

      {/* Edit dialog */}
      <AddBillDialog
        open={!!editingBill}
        onOpenChange={(open) => !open && setEditingBill(null)}
        onSubmit={() => {}}
        editBill={editingBill}
        onUpdate={(data) => {
          updateBill.mutate(data);
          setEditingBill(null);
        }}
      />
    </CollapsibleFinanceSection>
  );
}

function BillRow({ bill, today, onTogglePaid, onEdit, onDelete }: {
  bill: Bill;
  today: number;
  onTogglePaid: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOverdue = !bill.is_paid_this_month && bill.due_day < today;

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors group border',
        bill.is_paid_this_month
          ? 'bg-emerald-500/8 border-emerald-500/20'
          : isOverdue
          ? 'bg-rose-500/8 border-rose-500/20'
          : 'bg-muted/20 border-border/30 hover:border-primary/20'
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={bill.is_paid_this_month}
          onCheckedChange={onTogglePaid}
        />
        <div className="cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {billCategoryLabels[bill.category]?.split(' ')[0] || '📦'} {bill.name}
            </span>
            {bill.is_autopay && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary/15 text-primary cursor-help">
                      Autopay
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    <p className="text-xs">This bill is set to autopay from your external bank or card — not a function of this app.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                Overdue
              </Badge>
            )}
            {bill.is_paid_this_month && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Paid
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Due on the {bill.due_day}{getOrdinalSuffix(bill.due_day)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'text-sm font-bold tabular-nums',
          bill.is_paid_this_month ? 'text-muted-foreground line-through' : ''
        )}>
          ${Number(bill.amount).toFixed(2)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
