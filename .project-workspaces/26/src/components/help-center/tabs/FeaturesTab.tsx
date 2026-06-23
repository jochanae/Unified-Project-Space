import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Link2, 
  Bell, 
  Users, 
  Brain, 
  Shield, 
  Download,
  TrendingUp,
  Calculator,
  FileText,
  Smartphone
} from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const features = [
  {
    icon: Calculator,
    title: "Budget by Category",
    category: "Budgets",
    description: "Give every dollar a job with the envelope budgeting system. Allocate your monthly income to budget categories, track spending against each 'envelope', and move money between categories as life happens. Includes templates like 50/30/20 and Bloom Bursts for short-term challenges.",
    availability: "All Plans"
  },
  {
    icon: Link2,
    title: "Bank Connection",
    category: "Sync",
    description: "Securely connect your bank accounts using Plaid to automatically sync your transactions and balances. Your credentials are never stored by CoinsBloom.",
    availability: "Premium"
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    category: "Alerts",
    description: "Get timely reminders for upcoming bills, budget warnings when you're close to limits, and goal progress updates to keep you on track.",
    availability: "All Plans"
  },
  {
    icon: Users,
    title: "Shared Goals",
    category: "Collaboration",
    description: "Invite family members or friends to collaborate on savings goals. Track contributions together and celebrate when you reach your target.",
    availability: "Premium"
  },
  {
    icon: Brain,
    title: "Bloom — Your Financial Architect",
    category: "Intelligence",
    description: "Bloom is a persistent Financial Architect, not a chatbot. She works inside the Obsidian Workstation and uses Strategic Memory (the Blueprint Ledger) to remember your identity, finances, active projects, and long-term legacy across sessions. Switch between Modes (Coach, Strategist, Private, Mental Shredder) and turn conversations into Strategic Blueprints you can save or export.",
    availability: "3/day Free, Unlimited Premium"
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    category: "Security",
    description: "Your data is protected with 256-bit SSL encryption, the same level of security used by major banks. We never sell your data.",
    availability: "All Plans"
  },
  {
    icon: Calculator,
    title: "Financial Calculators",
    category: "Tools",
    description: "Use our suite of calculators for compound interest, loan payments, retirement planning, and emergency fund calculations.",
    availability: "All Plans"
  },
  {
    icon: TrendingUp,
    title: "Credit Score Tracking",
    category: "Credit",
    description: "Monitor your credit score over time, set improvement goals, and get tips to boost your score. Track utilization across credit accounts.",
    availability: "All Plans"
  },
  {
    icon: FileText,
    title: "Expense Reports",
    category: "Reports",
    description: "Generate detailed reports of your spending, income, and net worth. Export as PDF or CSV for tax preparation or personal records.",
    availability: "Premium"
  },
  {
    icon: Download,
    title: "Data Export",
    category: "Data",
    description: "Export your financial data anytime. Download transactions, budgets, and account history in standard formats.",
    availability: "Premium"
  },
  {
    icon: Smartphone,
    title: "Progressive Web App",
    category: "Access",
    description: "Install CoinsBloom on your phone's home screen for quick access. Works offline and sends push notifications like a native app.",
    availability: "All Plans"
  },
  {
    icon: Users,
    title: "KidsBloom Basic",
    category: "Family",
    description: "Teach kids financial literacy with allowances, chores, savings goals, and educational games. Link up to 2 kids with 1:1 chat and individual chore assignments.",
    availability: "All Plans"
  },
  {
    icon: Users,
    title: "KidsBloom Premium",
    category: "Family",
    description: "Full family experience: 3+ kids, family group chat, shared chore board with rotation, and second parent access via family code.",
    availability: "Premium"
  },
  {
    icon: TrendingUp,
    title: "Live Streaming & Videos",
    category: "Education",
    description: "Watch live streams and featured educational videos on financial topics. Learn from experts and stay updated with the latest money tips.",
    availability: "All Plans"
  },
  {
    icon: Bell,
    title: "Dashboard Highlights",
    category: "Personalization",
    description: "Get personalized announcements, tips, and updates displayed on your dashboard. Stay informed about new features and relevant financial insights.",
    availability: "All Plans"
  },
  {
    icon: Brain,
    title: "Vision Board",
    category: "Motivation",
    description: "Create a visual board of your financial dreams—homes, vacations, cars. Upload images and stay motivated by seeing what you're working toward.",
    availability: "All Plans"
  },
  {
    icon: Calculator,
    title: "Strategic Labs (Specialized Tools)",
    category: "Tools",
    description: "High-performance tools — Debt Execution Matrix, What-If Simulator, Scenario Lab and more — that stress-test your plans with real math. Bloom uses them under the hood to generate Strategic Blueprints you can save to your Strategic Memory or export.",
    availability: "All Plans"
  },
  {
    icon: Shield,
    title: "Luxury Obsidian Theme (Inner Sanctum)",
    category: "Design",
    description: "Bloom's Workstation uses a deliberate dark, gold-accented Obsidian aesthetic — the Inner Sanctum — to separate 'managing tasks' from 'architecting wealth.' The rest of the app stays light and utility-focused; the Workstation is your high-focus, high-privacy room for deep financial work.",
    availability: "All Plans"
  }
];

interface FeaturesTabProps {
  searchQuery?: string;
}

export const FeaturesTab = ({ searchQuery = "" }: FeaturesTabProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  
  const filteredFeatures = features.filter(feature => {
    // Hide kids features when kids feature is disabled
    if (feature.category === "Family" && !isFeatureEnabled('kids')) return false;
    
    return !searchQuery || 
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Features Guide</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Discover what you can do with CoinsBloom
        </p>
      </div>

      <div className="grid gap-4">
        {filteredFeatures.length > 0 ? (
          filteredFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                        <span className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground">
                          {feature.category}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          feature.availability === "Premium" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-bloom-green/10 text-bloom-green"
                        }`}>
                          {feature.availability}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground ml-11">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No features match "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
