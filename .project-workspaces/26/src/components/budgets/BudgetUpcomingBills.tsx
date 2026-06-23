import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { BudgetBill } from "@/hooks/useBudgetBills";

interface BudgetUpcomingBillsProps {
  bills: BudgetBill[];
  budgetAmount: number;
  spent: number;
}

const BudgetUpcomingBills = ({ bills, budgetAmount, spent }: BudgetUpcomingBillsProps) => {
  if (bills.length === 0) return null;

  const totalCommitted = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const trulyAvailable = budgetAmount - spent - totalCommitted;

  const getStatusBadge = (bill: BudgetBill) => {
    const dueDate = new Date(bill.due_date);
    const now = new Date();
    const isOverdue = dueDate < now;

    if (isOverdue) return <Badge variant="destructive" className="text-[10px]">Overdue</Badge>;
    if (bill.is_autopay) return <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Autopay</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-amber-500" />
          Upcoming Bills
          <Badge variant="secondary" className="ml-auto text-xs">
            {bills.length} bill{bills.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary bar */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${
          trulyAvailable < 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-amber-50 dark:bg-amber-950/20"
        }`}>
          <div className="flex items-center gap-2">
            {trulyAvailable < 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <span className="text-xs text-muted-foreground">After bills:</span>
          </div>
          <span className={`text-sm font-bold ${trulyAvailable < 0 ? "text-red-500" : "text-green-500"}`}>
            {trulyAvailable < 0 ? `-$${Math.abs(trulyAvailable).toLocaleString()}` : `$${trulyAvailable.toLocaleString()}`}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {trulyAvailable < 0 ? "over-committed" : "truly available"}
            </span>
          </span>
        </div>

        {/* Bill list */}
        <div className="space-y-2">
          {bills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{bill.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(bill.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(bill)}
                <span className="text-sm font-semibold">${Number(bill.amount).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total committed */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-xs font-medium text-muted-foreground">Total Committed</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            ${totalCommitted.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetUpcomingBills;
