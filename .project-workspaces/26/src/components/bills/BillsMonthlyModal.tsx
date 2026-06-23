import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, DollarSign, CheckCircle2, AlertTriangle, Clock, Pencil } from "lucide-react";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
  category: string;
  is_recurring?: boolean;
  is_autopay?: boolean;
  frequency?: string;
  is_variable_amount?: boolean;
  reminder_enabled?: boolean;
  notes?: string | null;
  last_paid_date?: string | null;
  autopay_source?: 'internal' | 'external' | null;
}

interface BillsMonthlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  selectedMonth?: Date;
  onPayBill?: (bill: Bill) => void;
  onEditBill?: (bill: Bill) => void;
}

const BillsMonthlyModal = ({ open, onOpenChange, bills, selectedMonth, onPayBill, onEditBill }: BillsMonthlyModalProps) => {
  // Use the bills passed in directly — they're already scoped to the selected month by the parent
  const displayMonth = selectedMonth || new Date();

  const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const paidAmount = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const paidCount = bills.filter(b => b.status === 'paid').length;
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Group bills by category
  const billsByCategory = bills.reduce((acc, bill) => {
    const cat = bill.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(bill);
    return acc;
  }, {} as Record<string, Bill[]>);

  const categoryColors: Record<string, string> = {
    housing: 'bg-blue-500',
    utilities: 'bg-yellow-500',
    transportation: 'bg-green-500',
    insurance: 'bg-purple-500',
    subscriptions: 'bg-pink-500',
    healthcare: 'bg-red-500',
    education: 'bg-indigo-500',
    other: 'bg-gray-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Bills — {format(displayMonth, 'MMMM yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Paid</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">${paidAmount.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>{paidCount} of {bills.length} bills paid</span>
                <span className="text-orange-500">${unpaidAmount.toFixed(2)} remaining</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </CardContent>
          </Card>

          {/* Bills by Category */}
          {Object.keys(billsByCategory).length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">By Category</h3>
              <div className="space-y-2">
                {Object.entries(billsByCategory).map(([category, categoryBills]) => {
                  const catTotal = categoryBills.reduce((sum, b) => sum + Number(b.amount), 0);
                  const catPaid = categoryBills.filter(b => b.status === 'paid').length;
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${categoryColors[category] || 'bg-gray-500'}`} />
                        <div>
                          <p className="font-medium capitalize">{category.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {catPaid}/{categoryBills.length} paid
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">${catTotal.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Bills List - Interactive */}
          <div>
            <h3 className="font-semibold mb-3">All Bills This Month</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...bills]
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .map(bill => {
                  const now = new Date();
                  const isPaid = bill.status === 'paid';
                  const isOverdue = !isPaid && new Date(bill.due_date) < now;
                  
                  return (
                    <div 
                      key={bill.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => onEditBill?.(bill)}
                    >
                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : isOverdue ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{bill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(bill.due_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <p className="font-semibold">${Number(bill.amount).toFixed(2)}</p>
                          <p className={`text-xs ${isPaid ? 'text-emerald-500' : isOverdue ? 'text-destructive' : 'text-orange-500'}`}>
                            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
                          </p>
                        </div>
                        {!isPaid && onPayBill && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                            onClick={() => {
                              onPayBill(bill);
                              onOpenChange(false);
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Pay
                          </Button>
                        )}
                        {onEditBill && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              onEditBill(bill);
                              onOpenChange(false);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {bills.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bills scheduled for {format(displayMonth, 'MMMM yyyy')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillsMonthlyModal;
