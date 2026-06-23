import { useState, useEffect, useRef } from "react";
import { Info, Download, Upload, Plus, Search, Calendar, ArrowUpDown, FileText, Pencil, Trash2, Check, X, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AddBusinessExpenseModal } from "../modals/AddBusinessExpenseModal";
import { EditBusinessExpenseModal } from "../modals/EditBusinessExpenseModal";
import { exportBusinessExpensesPDF, parseCSVImport } from "@/lib/advancedToolsExport";
import { format } from "date-fns";

interface BusinessExpense {
  id: string;
  expense_date: string;
  description: string;
  category: string;
  amount: number;
  is_deductible: boolean;
  receipt_url?: string | null;
}

const CATEGORIES = [
  "office_supplies", "travel", "meals", "equipment", "software", "advertising", 
  "professional_services", "utilities", "insurance", "rent", "other"
];

export const BusinessTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BusinessExpense | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("business_expenses")
      .select("*")
      .eq("user_id", user!.id)
      .order("expense_date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load expenses", variant: "destructive" });
    } else {
      setExpenses(data || []);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("business_expenses").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Expense removed" });
      fetchExpenses();
    }
  };

  const handleEdit = (expense: BusinessExpense) => {
    setEditingExpense(expense);
    setEditModalOpen(true);
  };

  const exportCSV = () => {
    const headers = ["Date", "Description", "Category", "Amount", "Deductible"];
    const rows = expenses.map(e => [
      e.expense_date, e.description, e.category, e.amount, e.is_deductible ? "Yes" : "No"
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "business_expenses.csv";
    a.click();
  };

  const exportPDF = () => {
    exportBusinessExpensesPDF(expenses);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const records = parseCSVImport(text);
    
    if (records.length === 0) {
      toast({ title: "Error", description: "No valid records found in CSV", variant: "destructive" });
      return;
    }

    let imported = 0;
    for (const record of records) {
      const { error } = await supabase.from("business_expenses").insert({
        user_id: user!.id,
        expense_date: record.date || new Date().toISOString().split("T")[0],
        description: record.description || "Imported expense",
        category: CATEGORIES.includes(record.category?.toLowerCase()) ? record.category.toLowerCase() : "other",
        amount: Number(record.amount) || 0,
        is_deductible: record.deductible?.toLowerCase() === "yes" || record.deductible?.toLowerCase() === "true"
      });
      if (!error) imported++;
    }

    toast({ title: "Import Complete", description: `Imported ${imported} of ${records.length} records` });
    fetchExpenses();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const expenseDate = new Date(e.expense_date);
    const matchesDateFrom = !dateRange.from || expenseDate >= dateRange.from;
    const matchesDateTo = !dateRange.to || expenseDate <= dateRange.to;
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  }).sort((a, b) => {
    const dateA = new Date(a.expense_date).getTime();
    const dateB = new Date(b.expense_date).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const deductibleAmount = filteredExpenses.filter(e => e.is_deductible).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
      
      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
        <Card className="border-2 border-orange-200 bg-orange-50/30 dark:bg-orange-950/20 dark:border-orange-800/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-base font-medium">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange-600" />
                  Business Expense Tracking Tips
                </div>
                <ChevronDown className={`h-4 w-4 text-orange-600 transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Separate accounts:</strong> Use dedicated business bank accounts and credit cards to simplify expense tracking and tax preparation</li>
                <li><strong className="text-foreground">Save receipts:</strong> IRS requires receipts for expenses over $75 - snap photos immediately and attach them to expense records</li>
                <li><strong className="text-foreground">Mileage tracking:</strong> Log business travel with date, purpose, and odometer readings - the 2024 standard rate is 67¢ per mile</li>
                <li><strong className="text-foreground">Home office deduction:</strong> If you use part of your home exclusively for business, track related expenses like utilities and internet</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Business Expenses</CardTitle>
          <p className="text-sm text-muted-foreground">Track deductible business expenses for tax purposes</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Items</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400" onClick={exportPDF}>
              <FileText className="h-4 w-4 mr-1" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Expense
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400">
                  <Calendar className="h-4 w-4 mr-1" /> Date Range
                  {(dateRange.from || dateRange.to) && " •"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={1}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setDateRange({})}>
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="outline" className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 mb-4" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}>
            <ArrowUpDown className="h-4 w-4 mr-2" /> Sort {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </Button>

          {filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No business expenses yet. Add your first expense!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Deductible</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.expense_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {expense.category.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>${Number(expense.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {expense.is_deductible ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Total</span>
                <div className="flex gap-6">
                  <span className="font-bold">${totalAmount.toLocaleString()}</span>
                  <span className="text-green-600 font-bold">${deductibleAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddBusinessExpenseModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchExpenses} />
      <EditBusinessExpenseModal open={editModalOpen} onOpenChange={setEditModalOpen} expense={editingExpense} onSuccess={fetchExpenses} />
    </div>
  );
};
