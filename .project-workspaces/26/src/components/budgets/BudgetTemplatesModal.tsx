import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BudgetTemplate {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  categories: { name: string; percentage: number; category: string }[];
}

const templates: BudgetTemplate[] = [
  {
    id: "50-30-20",
    name: "50/30/20 Rule",
    subtitle: "50% Needs, 30% Wants, 20% Savings",
    description: "Classic budgeting rule for balanced finances",
    categories: [
      { name: "Needs (Housing, Food, Bills)", percentage: 50, category: "housing" },
      { name: "Wants (Entertainment, Dining)", percentage: 30, category: "entertainment" },
      { name: "Savings & Debt", percentage: 20, category: "savings" },
    ],
  },
  {
    id: "zero-based",
    name: "Zero-Based Budget",
    subtitle: "Every dollar has a job",
    description: "Allocate all income to specific categories until you reach zero.",
    categories: [
      { name: "Housing", percentage: 30, category: "housing" },
      { name: "Transportation", percentage: 15, category: "transportation" },
      { name: "Food", percentage: 15, category: "food" },
      { name: "Utilities", percentage: 10, category: "utilities" },
      { name: "Savings", percentage: 10, category: "savings" },
      { name: "Entertainment", percentage: 10, category: "entertainment" },
      { name: "Personal", percentage: 10, category: "personal" },
    ],
  },
  {
    id: "essential-only",
    name: "Essential Only",
    subtitle: "Focus on necessities",
    description: "Budget for housing, utilities, food, and transportation only.",
    categories: [
      { name: "Housing", percentage: 35, category: "housing" },
      { name: "Utilities", percentage: 15, category: "utilities" },
      { name: "Food", percentage: 25, category: "food" },
      { name: "Transportation", percentage: 25, category: "transportation" },
    ],
  },
  {
    id: "family",
    name: "Family Budget",
    subtitle: "Household with kids",
    description: "Includes childcare, education, activities, and family expenses.",
    categories: [
      { name: "Housing", percentage: 25, category: "housing" },
      { name: "Childcare & Education", percentage: 15, category: "education" },
      { name: "Food & Groceries", percentage: 15, category: "food" },
      { name: "Transportation", percentage: 10, category: "transportation" },
      { name: "Healthcare", percentage: 10, category: "healthcare" },
      { name: "Utilities", percentage: 8, category: "utilities" },
      { name: "Entertainment & Activities", percentage: 7, category: "entertainment" },
      { name: "Savings", percentage: 10, category: "savings" },
    ],
  },
  {
    id: "70-20-10",
    name: "70/20/10 Aggressive Saving",
    subtitle: "70% Essentials, 20% Debt, 10% Savings",
    description: "Focus on paying off debt while building savings.",
    categories: [
      { name: "Essentials", percentage: 70, category: "housing" },
      { name: "Debt Payments", percentage: 20, category: "debt" },
      { name: "Savings", percentage: 10, category: "savings" },
    ],
  },
  {
    id: "envelope",
    name: "Envelope System",
    subtitle: "Cash-style budgeting",
    description: "Divides income into distinct spending categories like cash envelopes.",
    categories: [
      { name: "Housing", percentage: 25, category: "housing" },
      { name: "Groceries", percentage: 15, category: "food" },
      { name: "Transportation", percentage: 10, category: "transportation" },
      { name: "Utilities", percentage: 10, category: "utilities" },
      { name: "Entertainment", percentage: 10, category: "entertainment" },
      { name: "Clothing", percentage: 5, category: "shopping" },
      { name: "Personal Care", percentage: 5, category: "personal" },
      { name: "Savings", percentage: 10, category: "savings" },
      { name: "Miscellaneous", percentage: 10, category: "other" },
    ],
  },
];

interface BudgetTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BudgetTemplatesModal = ({ open, onOpenChange, onSuccess }: BudgetTemplatesModalProps) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchExistingCategories();
    }
  }, [open, user]);

  const fetchExistingCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("budgets")
        .select("category")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setExistingCategories((data || []).map(b => b.category));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setMonthlyIncome("");
    setIsRecurring(false);
    setIsCollaborative(false);
  };

  const handleSelectTemplate = (template: BudgetTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateFromTemplate = async () => {
    if (!user || !selectedTemplate) return;

    const income = Number(monthlyIncome);
    if (!income || income <= 0) {
      toast.error("Please enter a valid monthly income");
      return;
    }

    // Check for conflicting categories
    const templateCategories = selectedTemplate.categories.map(c => c.category);
    const conflicts = templateCategories.filter(c => existingCategories.includes(c));
    
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(c => {
        const cat = selectedTemplate.categories.find(tc => tc.category === c);
        return cat?.name || c;
      });
      toast.error(
        `You already have active budgets for: ${conflictNames.join(", ")}. Delete existing budgets first, or create individual envelopes instead.`
      );
      return;
    }

    setLoading(true);
    try {
      const budgetsToCreate = selectedTemplate.categories.map((cat) => ({
        name: cat.name,
        category: cat.category as any,
        amount: Math.round((income * cat.percentage) / 100),
        user_id: user.id,
        start_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      }));

      const { error } = await supabase.from("budgets").insert(budgetsToCreate);

      if (error) throw error;

      toast.success(`${selectedTemplate.name} budget created!`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating budget from template:", error);
      toast.error("Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold text-center">Budget Templates</DialogTitle>
          <p className="text-sm text-muted-foreground text-center">Quick start with pre-built budgets</p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          {!selectedTemplate ? (
            <div className="space-y-3 pb-4">
              {templates.map((template) => {
                const conflictCount = template.categories.filter(c => existingCategories.includes(c.category)).length;
                return (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${conflictCount > 0 ? 'border-amber-300 dark:border-amber-700' : ''}`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-bold text-base">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.subtitle}</p>
                      <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
                      
                      {conflictCount > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                          ⚠️ {conflictCount} category{conflictCount > 1 ? 'ies' : 'y'} already in use — conflicts will be blocked
                        </p>
                      )}
                      
                      {template.categories.length <= 4 && (
                        <div className="mt-3 space-y-1">
                          {template.categories.map((cat, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className={existingCategories.includes(cat.category) ? 'line-through text-muted-foreground' : ''}>{cat.name}</span>
                              <span className="font-medium">{cat.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <div className="text-center">
                <h3 className="font-bold text-lg">Enter Your Monthly Income</h3>
                <p className="text-sm text-muted-foreground">
                  We'll use this to calculate your budget amounts based on the {selectedTemplate.name}.
                </p>
              </div>

              <div>
                <Label className="text-base font-semibold">Monthly Income</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="mt-2 text-lg"
                  min="0"
                />
              </div>

              {/* Options */}
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      id="recurring-template"
                      checked={isRecurring}
                      onCheckedChange={(checked) => setIsRecurring(checked === true)}
                      className="mt-1 border-purple-400 data-[state=checked]:bg-purple-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="recurring-template" className="font-semibold cursor-pointer">
                        Make this a recurring monthly budget
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically creates next month's budget on the 1st (continues until turned off)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Checkbox 
                      id="collaborative-template"
                      checked={isCollaborative}
                      onCheckedChange={(checked) => setIsCollaborative(checked === true)}
                      className="mt-1 border-purple-400 data-[state=checked]:bg-purple-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="collaborative-template" className="font-semibold cursor-pointer">
                          Make this a collaborative budget
                        </Label>
                        <Crown className="h-4 w-4 text-yellow-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invite others to view or edit this budget together (Premium feature)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Action Buttons */}
        <div className="p-6 pt-4 flex gap-3 border-t">
          {selectedTemplate ? (
            <>
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 border-purple-300 text-purple-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFromTemplate}
                disabled={loading || !monthlyIncome}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
              >
                {loading ? "Creating..." : "Create Budget"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetTemplatesModal;
