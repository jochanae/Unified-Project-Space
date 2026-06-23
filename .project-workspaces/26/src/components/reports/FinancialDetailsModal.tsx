import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Plus, DollarSign, Receipt, TrendingUp, TrendingDown } from "lucide-react";

interface FinancialDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: number;
  expenses: number;
  billsDue: number;
  unpaidBills: number;
  savings: number;
}

type TimePeriod = "1M" | "3M" | "6M" | "1Y";

const FinancialDetailsModal = ({
  open,
  onOpenChange,
  income,
  expenses,
  billsDue,
  unpaidBills,
  savings,
}: FinancialDetailsModalProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1M");

  const periods: TimePeriod[] = ["1M", "3M", "6M", "1Y"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle>Financial Details</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Plus className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </Button>
              <Button variant="ghost" size="icon">
                <Receipt className="w-5 h-5 text-primary" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time Period Selector */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Financial Summary</h3>
            <div className="flex gap-1">
              {periods.map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>

          {/* Financial Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Income</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                ${income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </Card>

            <Card className="p-4 bg-rose-50 border-rose-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                <span className="text-rose-600 font-medium">Expenses</span>
              </div>
              <p className="text-xl font-bold text-rose-700">
                ${expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </Card>

            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <span className="text-amber-600 font-medium">Bills Due</span>
              </div>
              <p className="text-xl font-bold text-amber-700">
                ${billsDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-amber-600">{unpaidBills} unpaid</p>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-xl font-bold text-blue-700">
                ${savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialDetailsModal;
