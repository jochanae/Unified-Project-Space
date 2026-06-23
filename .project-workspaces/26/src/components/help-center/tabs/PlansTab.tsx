import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Check, X } from "lucide-react";

interface PlansTabProps {
  searchQuery?: string;
}

const planFeatures = [
  { category: "Core Features", features: [
    { name: "Transactions", free: "Unlimited", premium: "Unlimited" },
    { name: "Goals", free: "Up to 5", premium: "Unlimited" },
    { name: "Budgets", free: "Up to 5", premium: "Unlimited" },
    { name: "Accounts", free: "Up to 3", premium: "Unlimited" },
    { name: "Bills Tracking", free: true, premium: true },
    { name: "Credit Score Tracking", free: true, premium: true },
  ]},
  { category: "Advanced Features", features: [
    { name: "Bank Connection (Plaid)", free: false, premium: true },
    { name: "AI Insights", free: false, premium: true },
    { name: "Shared Goals", free: false, premium: true },
    { name: "Data Export (PDF/CSV)", free: false, premium: true },
    { name: "Priority Support", free: false, premium: true },
  ]},
  { category: "Collaborative Features", features: [
    { name: "Join Collaborative Goals", free: true, premium: true },
    { name: "Join Collaborative Budgets", free: true, premium: true },
    { name: "Create Collaborative Goals", free: false, premium: true },
    { name: "Create Collaborative Budgets", free: false, premium: true },
  ]},
  { category: "Reports & Analytics", features: [
    { name: "Basic Reports", free: true, premium: true },
    { name: "Advanced Analytics", free: false, premium: true },
    { name: "What-If Simulator", free: false, premium: true },
    { name: "Custom Date Ranges", free: false, premium: true },
  ]},
];

const renderValue = (value: boolean | string) => {
  if (typeof value === "string") {
    return <span className="text-foreground font-medium">{value}</span>;
  }
  return value ? (
    <Check className="w-5 h-5 text-bloom-green mx-auto" />
  ) : (
    <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
  );
};

export const PlansTab = ({ searchQuery = "" }: PlansTabProps) => {
  return (
    <div className="space-y-6">
      {/* Plan Comparison Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Plan Comparison</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Choose the plan that fits your financial goals
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Pricing Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="text-center pb-2">
            <p className="text-sm font-medium text-muted-foreground">FREE</p>
            <CardTitle className="text-2xl">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></CardTitle>
            <p className="text-xs text-muted-foreground">Smart budgeting essentials</p>
          </CardHeader>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
          <CardHeader className="text-center pb-2">
            <p className="text-sm font-medium text-primary">PREMIUM</p>
            <CardTitle className="text-2xl">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></CardTitle>
            <p className="text-xs text-muted-foreground">AI, automation & family</p>
          </CardHeader>
        </Card>
      </div>

      {/* Feature Comparison Table */}
      {planFeatures.map((section, sectionIndex) => (
        <Card key={sectionIndex} className="bg-card border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/50 py-3">
            <CardTitle className="text-sm font-semibold">{section.category}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {section.features.map((feature, featureIndex) => (
                <div key={featureIndex} className="grid grid-cols-3 py-3 px-4 items-center">
                  <span className="text-sm text-foreground">{feature.name}</span>
                  <div className="text-center text-sm">
                    {renderValue(feature.free)}
                  </div>
                  <div className="text-center text-sm">
                    {renderValue(feature.premium)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <CardContent className="py-6 text-center">
          <h3 className="font-semibold text-lg mb-2">Ready to unlock Premium?</h3>
          <p className="text-sm opacity-90 mb-4">
            Get unlimited features, AI insights, and family sharing
          </p>
          <button className="bg-white text-primary font-semibold px-6 py-2 rounded-xl hover:bg-white/90 transition-colors">
            Upgrade Now
          </button>
        </CardContent>
      </Card>

      {/* B2B Enterprise */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-blue-500/10 border-emerald-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Crown className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-xl">B2B Enterprise</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                White-label solution for businesses
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">$29</span>
            <span className="text-muted-foreground">/mo base</span>
            <span className="text-muted-foreground mx-2">+</span>
            <span className="text-xl font-semibold">$7</span>
            <span className="text-muted-foreground">/seat/mo</span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Custom branding & colors</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Custom domain support</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Team professional profiles with QR codes</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>All Premium features for team members</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Partner admin dashboard</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Contact sales or visit /admin/enterprise for B2B pricing
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
