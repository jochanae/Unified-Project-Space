import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Plus, DollarSign, FileText, TrendingDown, TrendingUp, ShoppingCart, Receipt, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  notes: string | null;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  status: string;
}

interface DayDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
}

export function DayDetailsModal({ open, onOpenChange, selectedDate }: DayDetailsModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && selectedDate && user) {
      fetchDataForDate();
    }
  }, [open, selectedDate, user]);

  const fetchDataForDate = async () => {
    if (!selectedDate || !user) return;
    
    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Fetch transactions for the selected date
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("transaction_date", dateStr);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Fetch bills due on the selected date
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .eq("due_date", dateStr);

      if (billsError) throw billsError;
      setBills(billsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDate) return null;
  
  const formattedDate = format(selectedDate, "EEEE, MMMM d, yyyy");
  const totalItems = transactions.length + bills.length;

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      housing: "Housing",
      transportation: "Transportation",
      food: "Food & Dining",
      utilities: "Bills & Utilities",
      healthcare: "Healthcare",
      insurance: "Insurance",
      entertainment: "Entertainment",
      shopping: "Shopping",
      personal: "Personal",
      education: "Education",
      debt: "Debt Payment",
      business: "Business",
      other: "Other",
    };
    return labels[category] || category;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[85vh]" hideCloseButton>
        {/* Header */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-background rounded-lg shadow-sm">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Financial Details</h2>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          
          {/* Quick Add Dropdown */}
          <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-background">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 bg-popover border border-border">
              <DropdownMenuItem
                onClick={() => {
                  onOpenChange(false);
                  navigate("/transactions");
                }}
                className="gap-2 cursor-pointer"
              >
                <Receipt className="h-4 w-4 text-primary" />
                Add Transaction
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onOpenChange(false);
                  navigate("/bills");
                }}
                className="gap-2 cursor-pointer"
              >
                <DollarSign className="h-4 w-4 text-orange-500" />
                Add Bill
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No financial activity for this day</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          ) : (
            <>
              {/* Transactions Section */}
              {transactions.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-5 w-5 text-foreground" />
                    <h3 className="font-bold text-foreground">Transactions ({transactions.length})</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div 
                        key={transaction.id} 
                        className="bg-card rounded-xl p-4 shadow-sm border border-border/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${transaction.type === "income" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                              {transaction.type === "income" ? (
                                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{transaction.title}</h4>
                              <p className="text-sm text-muted-foreground">{getCategoryLabel(transaction.category)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${transaction.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                              {transaction.type === "income" ? "+" : "-"}${Math.abs(transaction.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                            {transaction.notes && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {transaction.notes}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bills Section */}
              {bills.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-foreground" />
                    <h3 className="font-bold text-foreground">Bills Due ({bills.length})</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div 
                        key={bill.id} 
                        className="bg-card rounded-xl p-4 shadow-sm border border-border/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${bill.status === "paid" ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                              <DollarSign className={`h-5 w-5 ${bill.status === "paid" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{bill.name}</h4>
                              <p className="text-sm text-muted-foreground">{getCategoryLabel(bill.category)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground">
                              ${bill.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`mt-1 text-xs ${bill.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : bill.status === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}
                            >
                              {bill.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
