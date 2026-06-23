import { useState, useEffect, useRef } from "react";
import { Info, Download, Upload, Plus, Search, Calendar, ArrowUpDown, FileText, Pencil, Trash2, Check, X, Sparkles, ChevronDown } from "lucide-react";
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
import { AddDonationModal } from "../modals/AddDonationModal";
import { EditDonationModal } from "../modals/EditDonationModal";
import { exportDonationsPDF, parseCSVImport } from "@/lib/advancedToolsExport";
import { format } from "date-fns";

interface Donation {
  id: string;
  donation_date: string;
  organization: string;
  donation_type: string;
  amount: number;
  is_tax_eligible: boolean;
  receipt_url?: string | null;
}

const DONATION_TYPES = ["cash", "check", "credit_card", "stock", "property", "goods", "other"];

export const CharityTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [businessExpenses, setBusinessExpenses] = useState<number>(0);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    if (user) {
      fetchDonations();
      fetchBusinessExpenses();
    }
  }, [user]);

  const fetchDonations = async () => {
    const { data, error } = await supabase
      .from("charitable_donations")
      .select("*")
      .eq("user_id", user!.id)
      .order("donation_date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load donations", variant: "destructive" });
    } else {
      setDonations(data || []);
    }
  };

  const fetchBusinessExpenses = async () => {
    const { data } = await supabase
      .from("business_expenses")
      .select("amount, is_deductible")
      .eq("user_id", user!.id);
    
    if (data) {
      const deductible = data.filter(e => e.is_deductible).reduce((sum, e) => sum + Number(e.amount), 0);
      setBusinessExpenses(deductible);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("charitable_donations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete donation", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Donation removed" });
      fetchDonations();
    }
  };

  const handleEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setEditModalOpen(true);
  };

  const exportCSV = () => {
    const headers = ["Date", "Organization", "Type", "Amount", "Tax Eligible"];
    const rows = donations.map(d => [
      d.donation_date, d.organization, d.donation_type, d.amount, d.is_tax_eligible ? "Yes" : "No"
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "charitable_donations.csv";
    a.click();
  };

  const exportPDF = () => {
    exportDonationsPDF(donations);
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
      const { error } = await supabase.from("charitable_donations").insert({
        user_id: user!.id,
        donation_date: record.date || new Date().toISOString().split("T")[0],
        organization: record.organization || "Imported donation",
        donation_type: DONATION_TYPES.includes(record.type?.toLowerCase()) ? record.type.toLowerCase() : "other",
        amount: Number(record.amount) || 0,
        is_tax_eligible: record.tax_eligible?.toLowerCase() === "yes" || record.tax_eligible?.toLowerCase() === "true"
      });
      if (!error) imported++;
    }

    toast({ title: "Import Complete", description: `Imported ${imported} of ${records.length} records` });
    fetchDonations();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredDonations = donations.filter((d) => {
    const matchesSearch = d.organization.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || d.donation_type === categoryFilter;
    const donationDate = new Date(d.donation_date);
    const matchesDateFrom = !dateRange.from || donationDate >= dateRange.from;
    const matchesDateTo = !dateRange.to || donationDate <= dateRange.to;
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  }).sort((a, b) => {
    const dateA = new Date(a.donation_date).getTime();
    const dateB = new Date(b.donation_date).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const totalAmount = filteredDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const taxEligibleAmount = filteredDonations.filter(d => d.is_tax_eligible).reduce((sum, d) => sum + Number(d.amount), 0);
  const totalTaxDeductions = taxEligibleAmount + businessExpenses;

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
      
      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
        <Card className="border-2 border-pink-200 bg-pink-50/30 dark:bg-pink-950/20 dark:border-pink-800/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 hover:bg-pink-100/50 dark:hover:bg-pink-900/30 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-base font-medium">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-pink-600" />
                  Charitable Giving Tips
                </div>
                <ChevronDown className={`h-4 w-4 text-pink-600 transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Research before donating:</strong> Check charity ratings on sites like Charity Navigator or GuideStar to ensure your donations are used effectively</li>
                <li><strong className="text-foreground">Bundle donations:</strong> Consider using a donor-advised fund to make one large tax-deductible contribution and distribute to charities over time</li>
                <li><strong className="text-foreground">Keep documentation:</strong> Save all receipts - donations over $250 require written acknowledgment from the charity for tax deductions</li>
                <li><strong className="text-foreground">Strategic timing:</strong> Donate appreciated stocks instead of cash to avoid capital gains tax while getting full market value deduction</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Charitable Donations</CardTitle>
          <p className="text-sm text-muted-foreground">Track donations for tax deductions</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Types</SelectItem>
                {DONATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
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
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Donation
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
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

          {filteredDonations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No donations yet. Add your first donation!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tax Eligible</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>{format(new Date(donation.donation_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{donation.organization}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {donation.donation_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>${Number(donation.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {donation.is_tax_eligible ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(donation)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(donation.id)}>
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
                  <span className="text-green-600 font-bold">${taxEligibleAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Deduction Summary */}
      <Card className="border-2 border-purple-200 bg-purple-50/30 dark:bg-purple-950/20 dark:border-purple-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Tax Deduction Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Charitable Donations</span>
              <span className="font-semibold">${totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tax-Eligible Donations</span>
              <span className="font-semibold text-green-600">${taxEligibleAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Business Expenses (Deductible)</span>
              <span className="font-semibold text-green-600">${businessExpenses.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-bold">Total Tax Deductions</span>
              <span className="font-bold text-green-600 text-lg">${totalTaxDeductions.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddDonationModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchDonations} />
      <EditDonationModal open={editModalOpen} onOpenChange={setEditModalOpen} donation={editingDonation} onSuccess={fetchDonations} />
    </div>
  );
};
