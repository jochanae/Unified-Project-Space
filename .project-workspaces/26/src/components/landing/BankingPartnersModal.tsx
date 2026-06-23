import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, PiggyBank, Shield, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface BankingPartnersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BankingPartnersModal = ({ open, onOpenChange }: BankingPartnersModalProps) => {
  const features = [
    { icon: CreditCard, text: "Curated debit cards and checking accounts" },
    { icon: PiggyBank, text: "High-yield savings accounts for families" },
    { icon: Shield, text: "Kid-friendly banking options with parental controls" },
    { icon: CheckCircle2, text: "Vetted partners — no hidden fees" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">Banking Partners</DialogTitle>
          <DialogDescription className="text-base">
            Explore recommended cards and accounts for individuals and families.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/70 via-orange-50/30 to-orange-100/20 border border-orange-200/40 backdrop-blur-sm dark:from-slate-800/70 dark:via-orange-900/15 dark:to-orange-800/20 dark:border-orange-700/30">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white" 
          size="lg"
          asChild
        >
          <Link to="/auth?mode=signup" onClick={() => onOpenChange(false)}>
            Sign Up to Explore Partners
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
