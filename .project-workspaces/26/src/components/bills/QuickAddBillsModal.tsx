import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { Zap, Plus, Tv, Wifi, Phone, Car, Home, CreditCard, Dumbbell, Shield, Droplets, Flame, Trash2, Check, ChevronDown, ChevronRight, Receipt, GraduationCap } from "lucide-react";

interface QuickAddBillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CommonBill {
  id: string;
  name: string;
  defaultAmount: number;
  category: string;
  frequency: string;
  isVariable: boolean;
  icon: React.ElementType;
  taxRelevant?: boolean;
  taxType?: 'mortgage' | 'student_loan' | 'property_tax';
}

interface TaxDetails {
  trackForTax: boolean;
  principal: string;
  interest: string;
  propertyTax: string;
  insurance: string;
  studentLoanInterest: string;
}

const commonBills: CommonBill[] = [
  // Utilities
  { id: 'electric', name: 'Electric Bill', defaultAmount: 150, category: 'utilities', frequency: 'monthly', isVariable: true, icon: Zap },
  { id: 'gas', name: 'Gas Bill', defaultAmount: 80, category: 'utilities', frequency: 'monthly', isVariable: true, icon: Flame },
  { id: 'water', name: 'Water Bill', defaultAmount: 50, category: 'utilities', frequency: 'monthly', isVariable: true, icon: Droplets },
  { id: 'trash', name: 'Trash/Waste', defaultAmount: 35, category: 'utilities', frequency: 'monthly', isVariable: false, icon: Trash2 },
  
  // Housing - Tax Relevant
  { id: 'mortgage', name: 'Mortgage', defaultAmount: 1500, category: 'mortgage', frequency: 'monthly', isVariable: false, icon: Home, taxRelevant: true, taxType: 'mortgage' },
  { id: 'rent', name: 'Rent', defaultAmount: 1200, category: 'rent', frequency: 'monthly', isVariable: false, icon: Home },
  { id: 'property_tax', name: 'Property Tax', defaultAmount: 250, category: 'property_tax', frequency: 'monthly', isVariable: false, icon: Receipt, taxRelevant: true, taxType: 'property_tax' },
  
  // Loans - Tax Relevant
  { id: 'student_loan', name: 'Student Loan', defaultAmount: 300, category: 'student_loan', frequency: 'monthly', isVariable: false, icon: GraduationCap, taxRelevant: true, taxType: 'student_loan' },
  
  // Communication
  { id: 'internet', name: 'Internet', defaultAmount: 75, category: 'internet', frequency: 'monthly', isVariable: false, icon: Wifi },
  { id: 'phone', name: 'Phone Bill', defaultAmount: 85, category: 'phone', frequency: 'monthly', isVariable: false, icon: Phone },
  
  // Streaming & Entertainment
  { id: 'netflix', name: 'Netflix', defaultAmount: 15.99, category: 'streaming', frequency: 'monthly', isVariable: false, icon: Tv },
  { id: 'spotify', name: 'Spotify', defaultAmount: 10.99, category: 'streaming', frequency: 'monthly', isVariable: false, icon: Tv },
  { id: 'hulu', name: 'Hulu', defaultAmount: 17.99, category: 'streaming', frequency: 'monthly', isVariable: false, icon: Tv },
  { id: 'disney', name: 'Disney+', defaultAmount: 13.99, category: 'streaming', frequency: 'monthly', isVariable: false, icon: Tv },
  { id: 'hbomax', name: 'Max (HBO)', defaultAmount: 15.99, category: 'streaming', frequency: 'monthly', isVariable: false, icon: Tv },
  { id: 'youtube', name: 'YouTube Premium', defaultAmount: 13.99, category: 'streaming', frequency: 'monthly', isVariable: false, icon: Tv },
  { id: 'amazon', name: 'Amazon Prime', defaultAmount: 14.99, category: 'subscriptions', frequency: 'monthly', isVariable: false, icon: Tv },
  
  // Insurance
  { id: 'car_insurance', name: 'Car Insurance', defaultAmount: 150, category: 'insurance', frequency: 'monthly', isVariable: false, icon: Car },
  { id: 'renters_insurance', name: 'Renters Insurance', defaultAmount: 25, category: 'insurance', frequency: 'monthly', isVariable: false, icon: Shield },
  { id: 'health_insurance', name: 'Health Insurance', defaultAmount: 300, category: 'insurance', frequency: 'monthly', isVariable: false, icon: Shield },
  
  // Other
  { id: 'gym', name: 'Gym Membership', defaultAmount: 40, category: 'gym', frequency: 'monthly', isVariable: false, icon: Dumbbell },
  { id: 'credit_card', name: 'Credit Card Payment', defaultAmount: 200, category: 'credit_card', frequency: 'monthly', isVariable: true, icon: CreditCard },
];

const QuickAddBillsModal = ({ open, onOpenChange, onSuccess }: QuickAddBillsModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBills, setSelectedBills] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customBillName, setCustomBillName] = useState('');
  const [customBillAmount, setCustomBillAmount] = useState('');
  const [customIsRecurring, setCustomIsRecurring] = useState(true);
  const [customIsVariable, setCustomIsVariable] = useState(false);
  const [customCategory, setCustomCategory] = useState<string>('other');
  const [existingBillNames, setExistingBillNames] = useState<Set<string>>(new Set());
  const [taxDetails, setTaxDetails] = useState<Record<string, TaxDetails>>({});
  const [expandedTaxBills, setExpandedTaxBills] = useState<Record<string, boolean>>({});

  // Fetch existing bills when modal opens
  useEffect(() => {
    const fetchExistingBills = async () => {
      if (!user || !open) return;
      
      const { data } = await supabase
        .from('bills')
        .select('name')
        .eq('user_id', user.id);
      
      if (data) {
        const names = new Set(data.map(b => b.name.toLowerCase()));
        setExistingBillNames(names);
      }
    };
    
    fetchExistingBills();
  }, [user, open]);

  const isBillAlreadyAdded = (billName: string) => {
    return existingBillNames.has(billName.toLowerCase());
  };

  const categoryOptions = [
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent/Mortgage' },
    { value: 'internet', label: 'Internet' },
    { value: 'phone', label: 'Phone' },
    { value: 'streaming', label: 'Streaming' },
    { value: 'subscriptions', label: 'Subscriptions' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'loans', label: 'Loans' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'gym', label: 'Gym' },
    { value: 'business', label: 'Business' },
    { value: 'other', label: 'Other' },
  ];

  const toggleBill = (billId: string) => {
    const bill = commonBills.find(b => b.id === billId);
    setSelectedBills(prev => {
      const newState = { ...prev, [billId]: !prev[billId] };
      // Initialize tax details when selecting a tax-relevant bill
      if (newState[billId] && bill?.taxRelevant) {
        setTaxDetails(prevTax => ({
          ...prevTax,
          [billId]: prevTax[billId] || {
            trackForTax: true,
            principal: '',
            interest: '',
            propertyTax: '',
            insurance: '',
            studentLoanInterest: '',
          }
        }));
        setExpandedTaxBills(prev => ({ ...prev, [billId]: true }));
      }
      return newState;
    });
  };

  const updateTaxDetail = (billId: string, field: keyof TaxDetails, value: string | boolean) => {
    setTaxDetails(prev => ({
      ...prev,
      [billId]: {
        ...prev[billId],
        [field]: value,
      }
    }));
  };

  const updateAmount = (billId: string, amount: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [billId]: amount
    }));
  };

  const getAmount = (bill: CommonBill): number => {
    const customAmount = customAmounts[bill.id];
    if (customAmount && parseFloat(customAmount) > 0) {
      return parseFloat(customAmount);
    }
    return bill.defaultAmount;
  };

  const selectedCount = Object.values(selectedBills).filter(Boolean).length;

  const handleAddAll = async () => {
    if (!user) return;
    if (selectedCount === 0) {
      toast.error('Please select at least one bill');
      return;
    }

    setIsLoading(true);

    try {
      const billsToAdd = commonBills
        .filter(bill => selectedBills[bill.id])
        .map(bill => {
          // For mortgage with PITI, calculate total from breakdown if provided
          let amount = getAmount(bill);
          const billTaxDetails = taxDetails[bill.id];
          
          if (bill.taxType === 'mortgage' && billTaxDetails?.trackForTax) {
            const principal = parseFloat(billTaxDetails.principal) || 0;
            const interest = parseFloat(billTaxDetails.interest) || 0;
            const propTax = parseFloat(billTaxDetails.propertyTax) || 0;
            const insurance = parseFloat(billTaxDetails.insurance) || 0;
            const pitiTotal = principal + interest + propTax + insurance;
            if (pitiTotal > 0) {
              amount = pitiTotal;
            }
          }
          
          return {
            user_id: user.id,
            name: bill.name,
            amount,
            category: bill.category as any,
            due_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
            frequency: bill.frequency as any,
            is_recurring: true,
            is_autopay: false,
            is_variable_amount: bill.isVariable,
            reminder_enabled: true,
            status: 'pending' as const,
          };
        });

      const { data: insertedBills, error } = await supabase
        .from('bills')
        .insert(billsToAdd)
        .select();

      if (error) {
        console.error('Error adding bills:', error);
        toast.error('Failed to add bills');
        setIsLoading(false);
        return;
      }

      // Now add tax details for tax-relevant bills
      if (insertedBills) {
        const taxDetailsToAdd = [];
        
        for (const insertedBill of insertedBills) {
          const originalBill = commonBills.find(b => b.name === insertedBill.name);
          if (originalBill?.taxRelevant && taxDetails[originalBill.id]?.trackForTax) {
            const details = taxDetails[originalBill.id];
            
            taxDetailsToAdd.push({
              bill_id: insertedBill.id,
              user_id: user.id,
              is_tax_deductible: true,
              principal_amount: parseFloat(details.principal) || 0,
              interest_amount: parseFloat(details.interest) || 0,
              property_tax_amount: parseFloat(details.propertyTax) || 0,
              insurance_amount: parseFloat(details.insurance) || 0,
              student_loan_interest: parseFloat(details.studentLoanInterest) || 0,
              deduction_category: originalBill.taxType || 'other',
            });
          }
        }

        if (taxDetailsToAdd.length > 0) {
          const { error: taxError } = await supabase
            .from('bill_tax_details')
            .insert(taxDetailsToAdd);
          
          if (taxError) {
            console.error('Error adding tax details:', taxError);
            // Don't fail the whole operation, bills were still added
          }
        }
      }

      toast.success(`Added ${billsToAdd.length} bills successfully!`);
      setSelectedBills({});
      setCustomAmounts({});
      setTaxDetails({});
      setExpandedTaxBills({});
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to add bills');
    }

    setIsLoading(false);
  };

  const handleAddCustom = async () => {
    if (!user) return;
    if (!customBillName.trim()) {
      toast.error('Please enter a bill name');
      return;
    }

    const amount = parseFloat(customBillAmount) || 0;

    const { error } = await supabase
      .from('bills')
      .insert({
        user_id: user.id,
        name: customBillName.trim(),
        amount,
        category: customCategory as "credit_card" | "gym" | "insurance" | "internet" | "loans" | "other" | "phone" | "rent" | "streaming" | "subscriptions" | "transportation" | "utilities",
        due_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        frequency: 'monthly' as const,
        is_recurring: customIsRecurring,
        is_autopay: false,
        is_variable_amount: customIsVariable,
        reminder_enabled: true,
        status: 'pending' as const,
      });

    if (error) {
      console.error('Error adding custom bill:', error);
      toast.error('Failed to add bill');
    } else {
      toast.success(`Added "${customBillName}" to the list`);
      setCustomBillName('');
      setCustomBillAmount('');
      setCustomIsRecurring(true);
      setCustomIsVariable(false);
      setCustomCategory('other');
      onSuccess(); // Refresh the bills list
    }
  };

  const groupedBills = {
    'Housing': commonBills.filter(b => ['mortgage', 'rent', 'property_tax'].includes(b.category)),
    'Loans': commonBills.filter(b => b.category === 'student_loan'),
    'Utilities': commonBills.filter(b => b.category === 'utilities'),
    'Communication': commonBills.filter(b => ['internet', 'phone'].includes(b.category)),
    'Streaming': commonBills.filter(b => b.category === 'streaming'),
    'Insurance': commonBills.filter(b => b.category === 'insurance'),
    'Subscriptions': commonBills.filter(b => b.category === 'subscriptions'),
    'Other': commonBills.filter(b => ['gym', 'credit_card'].includes(b.category)),
  };

  const renderTaxDetails = (bill: CommonBill) => {
    if (!bill.taxRelevant || !selectedBills[bill.id]) return null;
    
    const details = taxDetails[bill.id];
    if (!details) return null;
    
    const isExpanded = expandedTaxBills[bill.id];
    
    return (
      <div className="col-span-full" onClick={(e) => e.stopPropagation()}>
        <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedTaxBills(prev => ({ ...prev, [bill.id]: open }))}>
          <div className="ml-7 p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Track for Tax Optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={details.trackForTax}
                  onCheckedChange={(checked) => updateTaxDetail(bill.id, 'trackForTax', checked)}
                />
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            
            <CollapsibleContent className="space-y-3">
              {bill.taxType === 'mortgage' && details.trackForTax && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Enter PITI breakdown for accurate tax tracking:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Principal</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={details.principal}
                        onChange={(e) => updateTaxDetail(bill.id, 'principal', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-600">Interest (deductible)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={details.interest}
                        onChange={(e) => updateTaxDetail(bill.id, 'interest', e.target.value)}
                        className="h-8 text-sm border-green-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-600">Property Tax (deductible)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={details.propertyTax}
                        onChange={(e) => updateTaxDetail(bill.id, 'propertyTax', e.target.value)}
                        className="h-8 text-sm border-green-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Insurance</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={details.insurance}
                        onChange={(e) => updateTaxDetail(bill.id, 'insurance', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {bill.taxType === 'student_loan' && details.trackForTax && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Student loan interest is tax-deductible up to $2,500/year</p>
                  <div>
                    <Label className="text-xs text-green-600">Monthly Interest Portion (deductible)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={details.studentLoanInterest}
                      onChange={(e) => updateTaxDetail(bill.id, 'studentLoanInterest', e.target.value)}
                      className="h-8 text-sm border-green-200 w-32"
                    />
                  </div>
                </div>
              )}
              
              {bill.taxType === 'property_tax' && details.trackForTax && (
                <p className="text-xs text-green-600">✓ This will be tracked as a tax-deductible expense</p>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Add Common Bills
          </DialogTitle>
          <DialogDescription>
            Select bills you pay regularly. You can adjust amounts before adding.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6"  style={{ minHeight: 0 }}>
          <div className="space-y-6">
            {Object.entries(groupedBills).map(([groupName, bills]) => (
              bills.length > 0 && (
                <div key={groupName}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">{groupName}</h3>
                  <div className="space-y-2">
                    {bills.map(bill => {
                      const Icon = bill.icon;
                      const isSelected = selectedBills[bill.id];
                      const alreadyAdded = isBillAlreadyAdded(bill.name);
                      return (
                        <div key={bill.id} className="space-y-2">
                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              alreadyAdded 
                                ? 'border-muted bg-muted/30 opacity-60 cursor-default' 
                                : isSelected 
                                  ? 'border-primary bg-primary/5 cursor-pointer' 
                                  : 'border-border hover:border-primary/50 cursor-pointer'
                            }`}
                            onClick={() => !alreadyAdded && toggleBill(bill.id)}
                          >
                            {alreadyAdded ? (
                              <Check className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleBill(bill.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{bill.name}</p>
                                {alreadyAdded && (
                                  <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
                                )}
                                {bill.taxRelevant && !alreadyAdded && (
                                  <Badge variant="outline" className="text-xs shrink-0 text-green-600 border-green-200">Tax Deductible</Badge>
                                )}
                              </div>
                              {bill.isVariable && !alreadyAdded && (
                                <p className="text-xs text-muted-foreground">Variable amount</p>
                              )}
                            </div>
                            {!alreadyAdded && (
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24 h-8 text-sm"
                                value={customAmounts[bill.id] ?? bill.defaultAmount}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateAmount(bill.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                          {renderTaxDetails(bill)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}

            {/* Custom bill quick add */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Add Custom Bill</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Bill name"
                    value={customBillName}
                    onChange={(e) => setCustomBillName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={customBillAmount}
                    onChange={(e) => setCustomBillAmount(e.target.value)}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddCustom}
                    disabled={!customBillName.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Select value={customCategory} onValueChange={setCustomCategory}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="custom-recurring"
                      checked={customIsRecurring}
                      onCheckedChange={setCustomIsRecurring}
                    />
                    <Label htmlFor="custom-recurring" className="text-sm cursor-pointer">Recurring</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="custom-variable"
                      checked={customIsVariable}
                      onCheckedChange={setCustomIsVariable}
                    />
                    <Label htmlFor="custom-variable" className="text-sm cursor-pointer">Variable</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between p-6 pt-4 border-t flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            {selectedCount} bill{selectedCount !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAll} disabled={isLoading || selectedCount === 0}>
              {isLoading ? 'Adding...' : `Add ${selectedCount} Bill${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddBillsModal;
