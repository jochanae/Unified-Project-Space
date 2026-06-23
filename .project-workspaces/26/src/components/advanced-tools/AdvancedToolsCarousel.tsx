import { ChevronLeft, ChevronRight, Shield, FileText, Heart, Calculator } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ToolSummary {
  icon: React.ElementType;
  title: string;
  badge: string;
  badgeCount: number;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  color: string;
}

export const AdvancedToolsCarousel = () => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summaries, setSummaries] = useState<ToolSummary[]>([]);

  useEffect(() => {
    if (user) {
      fetchSummaries();
    }
  }, [user]);

  const fetchSummaries = async () => {
    const [policiesRes, expensesRes, donationsRes] = await Promise.all([
      supabase.from("insurance_policies").select("premium_amount, premium_frequency").eq("user_id", user!.id),
      supabase.from("business_expenses").select("amount, is_deductible").eq("user_id", user!.id),
      supabase.from("charitable_donations").select("amount, is_tax_eligible").eq("user_id", user!.id),
    ]);

    const policies = policiesRes.data || [];
    const expenses = expensesRes.data || [];
    const donations = donationsRes.data || [];

    const monthlyPremium = policies.reduce((sum, p) => {
      const amount = Number(p.premium_amount);
      if (p.premium_frequency === "annual") return sum + amount / 12;
      if (p.premium_frequency === "quarterly") return sum + amount / 3;
      return sum + amount;
    }, 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const deductibleExpenses = expenses.filter(e => e.is_deductible).reduce((sum, e) => sum + Number(e.amount), 0);

    const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const taxEligibleDonations = donations.filter(d => d.is_tax_eligible).reduce((sum, d) => sum + Number(d.amount), 0);

    setSummaries([
      {
        icon: Shield,
        title: "Insurance Protection",
        badge: `${policies.length} policies`,
        badgeCount: policies.length,
        primaryLabel: "Monthly",
        primaryValue: `$${monthlyPremium.toLocaleString()}`,
        secondaryLabel: "Annual",
        secondaryValue: `$${(monthlyPremium * 12).toLocaleString()}`,
        color: "blue",
      },
      {
        icon: FileText,
        title: "Business Expenses",
        badge: `${expenses.length} expenses`,
        badgeCount: expenses.length,
        primaryLabel: "",
        primaryValue: `$${totalExpenses.toLocaleString()}`,
        secondaryLabel: "Deductible",
        secondaryValue: `$${deductibleExpenses.toLocaleString()}`,
        color: "green",
      },
      {
        icon: Heart,
        title: "Charitable Giving",
        badge: `${donations.length} donations`,
        badgeCount: donations.length,
        primaryLabel: "",
        primaryValue: `$${totalDonations.toLocaleString()}`,
        secondaryLabel: "Tax eligible",
        secondaryValue: `$${taxEligibleDonations.toLocaleString()}`,
        color: "pink",
      },
      {
        icon: Calculator,
        title: "Tax Planning",
        badge: "Planning",
        badgeCount: 0,
        primaryLabel: "",
        primaryValue: "Strategy & Tools",
        secondaryLabel: "",
        secondaryValue: "Optimize your tax position",
        color: "purple",
      },
    ]);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % summaries.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + summaries.length) % summaries.length);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; icon: string; value: string }> = {
      blue: { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", icon: "text-blue-500 dark:text-blue-400", value: "text-blue-600 dark:text-blue-300" },
      green: { border: "border-l-green-500", bg: "bg-green-50 dark:bg-green-950/40", icon: "text-green-500 dark:text-green-400", value: "text-green-600 dark:text-green-300" },
      pink: { border: "border-l-pink-500", bg: "bg-pink-50 dark:bg-pink-950/40", icon: "text-pink-500 dark:text-pink-400", value: "text-pink-600 dark:text-pink-300" },
      purple: { border: "border-l-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40", icon: "text-purple-500 dark:text-purple-400", value: "text-purple-600 dark:text-purple-300" },
    };
    return colors[color] || colors.blue;
  };

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 mb-2">
        Financial Protection & Planning Hub
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Store insurance policies, track business expenses, plan taxes, and organize charitable giving
      </p>

      {/* Vertically stacked cards on mobile, grid on desktop */}
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {summaries.map((summary, index) => {
          const colorClasses = getColorClasses(summary.color);
          return (
            <Card key={index} className={`border-l-4 ${colorClasses.border} ${colorClasses.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <summary.icon className={`h-6 w-6 ${colorClasses.icon}`} />
                  <Badge variant="outline" className="text-xs bg-background">
                    {summary.badge}
                  </Badge>
                </div>
                <h3 className="font-medium text-foreground mb-2">{summary.title}</h3>
                <div className="flex justify-between items-end">
                  <div>
                    {summary.primaryLabel && (
                      <p className="text-xs text-muted-foreground">{summary.primaryLabel}</p>
                    )}
                    <p className={`text-xl font-bold ${colorClasses.value}`}>
                      {summary.primaryValue}
                    </p>
                  </div>
                  {summary.secondaryValue && (
                    <div className="text-right">
                      {summary.secondaryLabel && (
                        <p className="text-xs text-muted-foreground">{summary.secondaryLabel}</p>
                      )}
                      <p className={`text-lg font-semibold ${colorClasses.value}`}>
                        {summary.secondaryValue}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
