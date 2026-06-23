import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Bill } from '@/hooks/useFinances';

interface BillsOverviewSummaryProps {
  bills: Bill[];
  paidAmount: number;
  unpaidAmount: number;
  totalAmount: number;
}

export function BillsOverviewSummary({ bills, paidAmount, unpaidAmount, totalAmount }: BillsOverviewSummaryProps) {
  const today = new Date().getDate();
  const paidCount = bills.filter(b => b.is_paid_this_month).length;

  const overdue = bills.filter(b => !b.is_paid_this_month && b.due_day < today);
  const dueSoon = bills.filter(b => !b.is_paid_this_month && b.due_day >= today && b.due_day <= today + 7);
  const later = bills.filter(b => !b.is_paid_this_month && b.due_day > today + 7);

  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  if (bills.length === 0) return null;

  return (
    <div className="space-y-3 mb-3">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{paidCount} of {bills.length} paid</span>
          <span className="text-orange-500 font-medium">${unpaidAmount.toFixed(0)} remaining</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Due soon breakdown */}
      <div className="flex gap-3 text-xs">
        {overdue.length > 0 && (
          <span className="flex items-center gap-1 text-destructive font-medium">
            <AlertTriangle className="h-3 w-3" />
            {overdue.length} overdue
          </span>
        )}
        {dueSoon.length > 0 && (
          <span className="flex items-center gap-1 text-orange-500 font-medium">
            <Calendar className="h-3 w-3" />
            {dueSoon.length} due soon
          </span>
        )}
        {later.length > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {later.length} later
          </span>
        )}
        {overdue.length === 0 && dueSoon.length === 0 && later.length === 0 && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ All bills paid!</span>
        )}
      </div>
    </div>
  );
}
