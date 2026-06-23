import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  Receipt, 
  Target, 
  CreditCard, 
  TrendingDown,
  Sparkles,
  BarChart3,
  Settings,
  Eye,
  Users
} from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Link } from "react-router-dom";

interface PagesTabProps {
  searchQuery?: string;
}

const pages = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    path: "/dashboard",
    description: "Your financial command center. View your overall balance, recent transactions, upcoming bills, and quick access to all features.",
    features: ["Net worth overview", "Quick action buttons", "Financial health alerts", "Recent activity feed"]
  },
  {
    icon: Wallet,
    title: "Accounts",
    path: "/accounts",
    description: "Manage all your financial accounts in one place. Add bank accounts, credit cards, investments, and more.",
    features: ["Asset and liability tracking", "Account balance history", "Plaid integration", "Manual account entry"]
  },
  {
    icon: Receipt,
    title: "Transactions",
    path: "/transactions",
    description: "Track every income and expense. Categorize transactions and see where your money goes.",
    features: ["Income and expense logging", "Category assignment", "Search and filter", "Recurring transaction support"]
  },
  {
    icon: PieChart,
    title: "Budgets",
    path: "/budgets",
    description: "Create budget 'envelopes' for each spending category using the envelope budgeting method. Allocate your income, track spending, and move money between categories as priorities change.",
    features: [
      "Envelope budgeting system", 
      "Move money between categories", 
      "Budget templates (50/30/20, etc.)", 
      "Monthly reset", 
      "Link budgets to savings goals",
      "Bloom Bursts for short-term challenges",
      "Spending pie chart breakdown"
    ]
  },
  {
    icon: Target,
    title: "Goals",
    path: "/goals",
    description: "Define savings goals and track your progress. Share goals with family or friends for collaborative saving.",
    features: ["Individual and shared goals", "Contribution tracking", "Progress visualization", "Goal celebration"]
  },
  {
    icon: CreditCard,
    title: "Bills",
    path: "/bills",
    description: "Never miss a payment. Track recurring bills, set reminders, and mark payments as complete.",
    features: ["Bill reminders", "Payment tracking", "Autopay indicators", "Calendar view"]
  },
  {
    icon: TrendingDown,
    title: "Debts",
    path: "/debts",
    description: "Manage and pay down your debts strategically. Use payoff calculators to plan your debt-free journey.",
    features: ["Debt tracking", "Interest rate management", "Payoff strategies", "Payment history"]
  },
  {
    icon: Sparkles,
    title: "Credit",
    path: "/credit",
    description: "Monitor your credit score, set improvement goals, and get personalized tips to boost your credit.",
    features: ["Credit score tracking", "Score history chart", "Improvement tips", "Credit utilization"]
  },
  {
    icon: Users,
    title: "Kids & Family",
    path: "/kids",
    description: "Teach children about money with KidsBloom. Create kid profiles, assign chores, manage allowances, and explore interactive games and lessons.",
    features: ["Kid profiles with secure login", "Chore assignments with rewards", "Family chat & groups", "Games, lessons & stories"]
  },
  {
    icon: Eye,
    title: "Vision Board",
    path: "/vision-board",
    description: "Visualize your financial dreams. Create a digital vision board to stay motivated on your journey.",
    features: ["Visual goal setting", "Image uploads", "Category organization", "Progress tracking"]
  },
  {
    icon: BarChart3,
    title: "Reports",
    path: "/reports",
    description: "Gain insights with detailed financial reports. Analyze spending patterns and track progress over time.",
    features: ["Spending analysis", "Income vs expenses", "Category breakdowns", "Custom date ranges"]
  },
  {
    icon: Settings,
    title: "Settings",
    path: "/settings",
    description: "Customize your CoinsBloom experience. Manage notifications, security, and account preferences.",
    features: ["Profile management", "Notification settings", "Security options", "Data export"]
  }
];

export const PagesTab = ({ searchQuery = "" }: PagesTabProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  
  const filteredPages = pages.filter(page => {
    // Hide kids page when kids feature is disabled
    if (page.path === '/kids' && !isFeatureEnabled('kids')) return false;
    
    return !searchQuery || 
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">App Pages</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Learn about each page in CoinsBloom and what you can do there
        </p>
      </div>

      <div className="grid gap-4">
        {filteredPages.map((page, index) => {
          const Icon = page.icon;
          return (
            <Card key={index} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Link to={page.path}>
                      <CardTitle className="text-base hover:text-primary transition-colors">
                        {page.title}
                      </CardTitle>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {page.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="ml-11 flex flex-wrap gap-2">
                  {page.features.map((feature, i) => (
                    <span 
                      key={i} 
                      className="px-2.5 py-1 text-xs bg-muted rounded-full text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
