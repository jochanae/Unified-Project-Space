import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { startOfMonth, endOfMonth, isWithinInterval, addDays, format } from "date-fns";
import { Zap, AlertTriangle, Calendar, Clock } from "lucide-react";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
}

interface BillsOverviewProps {
  bills: Bill[];
  selectedMonth?: Date;
}

const BillsOverview = ({ bills, selectedMonth }: BillsOverviewProps) => {
  const viewMonth = selectedMonth || new Date();
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  const currentMonthBills = bills.filter(bill => 
    isWithinInterval(new Date(bill.due_date), { start: monthStart, end: monthEnd })
  );

  const totalAmount = currentMonthBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const paidAmount = currentMonthBills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const paidCount = currentMonthBills.filter(b => b.status === 'paid').length;
  const remainingAmount = totalAmount - paidAmount;

  // Calculate due soon counts relative to the viewed month
  const today = new Date();
  const overdue = currentMonthBills.filter(b => 
    b.status !== 'paid' && new Date(b.due_date) < today
  );
  const thisWeek = currentMonthBills.filter(b => {
    const dueDate = new Date(b.due_date);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return b.status !== 'paid' && dueDate >= today && dueDate <= weekFromNow;
  });
  const later = currentMonthBills.filter(b => {
    const dueDate = new Date(b.due_date);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return b.status !== 'paid' && dueDate > weekFromNow;
  });

  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-xl">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-bold text-xl text-emerald-600">${paidAmount.toFixed(2)}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{paidCount} of {currentMonthBills.length} paid</span>
            <span className="text-orange-500">${remainingAmount.toFixed(2)} remaining</span>
          </div>
        </CardContent>
      </Card>


      {/* Due Soon Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Due Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>Overdue</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-sm ${overdue.length > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
              {overdue.length} bills
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>This Week</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-sm bg-muted">
              {thisWeek.length} bills
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Later</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-sm bg-muted">
              {later.length} bills
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillsOverview;
