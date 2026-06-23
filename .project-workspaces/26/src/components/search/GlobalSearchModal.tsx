import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Wallet, 
  Target, 
  CreditCard, 
  Receipt, 
  PiggyBank,
  BarChart3,
  GraduationCap,
  HelpCircle,
  Settings,
  Users,
  Bot,
  Calculator,
  FileText,
  TrendingUp,
  Home,
  ArrowRight,
  Baby,
  Heart,
  Eye,
  Shield,
  Gamepad2,
  BookOpen,
  Video,
  MessageSquare,
  Bell,
  Palette,
  Lock,
  Smartphone,
  CreditCard as CreditCardIcon,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  Coins,
  Sparkles,
  Gift,
  ListTodo,
  Clock,
  Lightbulb,
  TrendingDown,
  LayoutDashboard,
  PieChart,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "page" | "feature" | "transaction" | "budget" | "goal" | "bill" | "account" | "debt" | "kid" | "chore";
  title: string;
  subtitle?: string;
  keywords?: string[];
  icon: React.ReactNode;
  route: string;
  color: string;
}

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Comprehensive static pages and features for navigation
const staticPages: SearchResult[] = [
  // Main Navigation Pages
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Your financial overview", keywords: ["home", "overview", "summary", "net worth"], icon: <Home className="h-4 w-4" />, route: "/dashboard", color: "text-emerald-500" },
  { id: "budgets", type: "page", title: "Budgets", subtitle: "Manage spending limits", keywords: ["spending", "limits", "categories", "monthly"], icon: <BarChart3 className="h-4 w-4" />, route: "/budgets", color: "text-blue-500" },
  { id: "goals", type: "page", title: "Goals", subtitle: "Savings targets", keywords: ["savings", "target", "dream", "wish", "save"], icon: <Target className="h-4 w-4" />, route: "/goals", color: "text-purple-500" },
  { id: "transactions", type: "page", title: "Transactions", subtitle: "Income & expenses", keywords: ["income", "expenses", "spending", "payment", "purchase"], icon: <Receipt className="h-4 w-4" />, route: "/transactions", color: "text-orange-500" },
  { id: "accounts", type: "page", title: "Accounts", subtitle: "Bank accounts & assets", keywords: ["bank", "checking", "savings account", "investment", "asset", "liability"], icon: <Wallet className="h-4 w-4" />, route: "/accounts", color: "text-teal-500" },
  { id: "bills", type: "page", title: "Bills", subtitle: "Recurring payments", keywords: ["recurring", "payment", "due", "monthly", "subscription"], icon: <FileText className="h-4 w-4" />, route: "/bills", color: "text-red-500" },
  { id: "debts", type: "page", title: "Debts", subtitle: "Loans & credit", keywords: ["loan", "credit card", "mortgage", "student loan", "payoff"], icon: <CreditCard className="h-4 w-4" />, route: "/debts", color: "text-rose-500" },
  { id: "credit", type: "page", title: "Credit", subtitle: "Credit score tracking", keywords: ["credit score", "fico", "credit report", "credit cards"], icon: <TrendingUp className="h-4 w-4" />, route: "/credit", color: "text-indigo-500" },
  { id: "savings", type: "page", title: "Savings Goals", subtitle: "Savings targets & buckets", keywords: ["save", "bucket", "fund", "emergency", "savings"], icon: <PiggyBank className="h-4 w-4" />, route: "/goals", color: "text-amber-500" },
  
  // Kids & Family
  { id: "kids", type: "page", title: "Kids", subtitle: "KidsBloom - Family finance", keywords: ["children", "family", "kidsbloom", "child", "allowance", "chores", "parenting"], icon: <Baby className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "kids-dashboard", type: "feature", title: "Kids Dashboard", subtitle: "Manage children's finances", keywords: ["child dashboard", "kid overview", "family"], icon: <LayoutDashboard className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "kid-chores", type: "feature", title: "Chores", subtitle: "Assign tasks & rewards", keywords: ["tasks", "rewards", "allowance", "earn money", "jobs"], icon: <ListTodo className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "kid-allowance", type: "feature", title: "Allowance", subtitle: "Set up recurring allowance", keywords: ["weekly allowance", "pocket money", "kids money"], icon: <Coins className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "kid-savings", type: "feature", title: "Kid Savings Goals", subtitle: "Help kids save", keywords: ["kid goals", "child savings", "piggy bank"], icon: <PiggyBank className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "kid-games", type: "feature", title: "Money Games", subtitle: "Fun financial games for kids", keywords: ["games", "play", "learn", "fun", "educational"], icon: <Gamepad2 className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "kid-lessons", type: "feature", title: "Kids Lessons", subtitle: "Financial education for children", keywords: ["education", "learn", "teach", "lessons", "school"], icon: <BookOpen className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "family-chat", type: "feature", title: "Family Chat", subtitle: "Message family members", keywords: ["chat", "message", "communicate", "family group"], icon: <MessageSquare className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "family-expectations", type: "feature", title: "Family Expectations", subtitle: "Set expectations for kids", keywords: ["expectations", "rules", "responsibilities", "household", "agreement", "understanding"], icon: <FileText className="h-4 w-4" />, route: "/kids", color: "text-emerald-500" },
  
  // Learning & Education
  { id: "money-academy", type: "page", title: "Money Academy", subtitle: "Learn finance", keywords: ["learn", "education", "videos", "courses", "financial literacy"], icon: <GraduationCap className="h-4 w-4" />, route: "/money-academy", color: "text-violet-500" },
  { id: "videos", type: "feature", title: "Educational Videos", subtitle: "Watch and learn", keywords: ["video", "watch", "tutorial", "youtube"], icon: <Video className="h-4 w-4" />, route: "/money-academy", color: "text-violet-500" },
  { id: "lessons", type: "feature", title: "Finance Lessons", subtitle: "Step-by-step guides", keywords: ["lesson", "guide", "tutorial", "course"], icon: <BookOpen className="h-4 w-4" />, route: "/money-academy", color: "text-violet-500" },
  
  // Professionals
  { id: "professionals", type: "page", title: "Experts & Resources", subtitle: "Find financial advisors", keywords: ["advisor", "planner", "expert", "consultant", "cpa", "cfp", "professionals"], icon: <Users className="h-4 w-4" />, route: "/professionals", color: "text-sky-500" },
  { id: "find-advisor", type: "feature", title: "Find an Advisor", subtitle: "Connect with experts", keywords: ["find advisor", "search professional", "financial planner"], icon: <Briefcase className="h-4 w-4" />, route: "/professionals", color: "text-sky-500" },
  
  // AI & Tools
  { id: "coach", type: "page", title: "Bloom", subtitle: "AI financial mentor", keywords: ["ai", "coach", "advice", "assistant", "help", "chatbot", "quinn"], icon: <Bot className="h-4 w-4" />, route: "/coach", color: "text-fuchsia-500" },
  { id: "advanced", type: "page", title: "Advanced Tools", subtitle: "Calculators & simulators", keywords: ["calculator", "tools", "simulate", "what-if", "compound interest"], icon: <Calculator className="h-4 w-4" />, route: "/advanced", color: "text-slate-500" },
  { id: "reports", type: "page", title: "Reports", subtitle: "Financial reports & analytics", keywords: ["report", "analytics", "chart", "analysis", "insights"], icon: <PieChart className="h-4 w-4" />, route: "/reports", color: "text-cyan-500" },
  
  // Vision & Planning
  { id: "vision-board", type: "page", title: "Vision Board", subtitle: "Visualize your dreams", keywords: ["vision", "dream", "future", "goals", "motivation", "inspiration"], icon: <Eye className="h-4 w-4" />, route: "/vision-board", color: "text-amber-500" },
  
  // Support & Settings
  { id: "help-center", type: "page", title: "Help Center", subtitle: "FAQs & support", keywords: ["help", "support", "faq", "question", "guide", "how to"], icon: <HelpCircle className="h-4 w-4" />, route: "/help-center", color: "text-cyan-500" },
  { id: "settings", type: "page", title: "Settings", subtitle: "App preferences", keywords: ["settings", "preferences", "profile", "account settings"], icon: <Settings className="h-4 w-4" />, route: "/settings", color: "text-gray-500" },
  { id: "notifications", type: "feature", title: "Notifications", subtitle: "Manage alerts", keywords: ["alerts", "notify", "reminders", "push"], icon: <Bell className="h-4 w-4" />, route: "/settings", color: "text-yellow-500" },
  { id: "security", type: "feature", title: "Security Settings", subtitle: "Password & 2FA", keywords: ["password", "security", "2fa", "two factor", "login"], icon: <Lock className="h-4 w-4" />, route: "/settings", color: "text-red-500" },
  { id: "appearance", type: "feature", title: "Appearance", subtitle: "Theme & display", keywords: ["theme", "dark mode", "light mode", "display", "color"], icon: <Palette className="h-4 w-4" />, route: "/settings", color: "text-purple-500" },
  
  // Features
  { id: "bloom-bursts", type: "feature", title: "Bloom Bursts", subtitle: "Short-term spending challenges", keywords: ["challenge", "burst", "spending limit", "7-day"], icon: <Zap className="h-4 w-4" />, route: "/budgets", color: "text-orange-500" },
  { id: "bill-calendar", type: "feature", title: "Bill Calendar", subtitle: "View bills by date", keywords: ["calendar", "schedule", "due dates"], icon: <Calendar className="h-4 w-4" />, route: "/bills", color: "text-red-500" },
  { id: "debt-payoff", type: "feature", title: "Debt Payoff Calculator", subtitle: "Snowball & Avalanche methods", keywords: ["payoff", "snowball", "avalanche", "debt free"], icon: <TrendingDown className="h-4 w-4" />, route: "/debts", color: "text-rose-500" },
  { id: "credit-cards-apply", type: "feature", title: "Credit Card Offers", subtitle: "Compare & apply", keywords: ["credit card", "apply", "offers", "rewards"], icon: <CreditCardIcon className="h-4 w-4" />, route: "/credit", color: "text-indigo-500" },
  { id: "plaid-connect", type: "feature", title: "Connect Bank", subtitle: "Link via Plaid", keywords: ["plaid", "connect bank", "link account", "sync"], icon: <Building2 className="h-4 w-4" />, route: "/accounts", color: "text-teal-500" },
  { id: "shared-goals", type: "feature", title: "Shared Goals", subtitle: "Collaborate on savings", keywords: ["shared", "collaborate", "together", "family goal", "group"], icon: <Heart className="h-4 w-4" />, route: "/goals", color: "text-pink-500" },
  { id: "gift-money", type: "feature", title: "Gift Money", subtitle: "Send money to family", keywords: ["gift", "send money", "transfer"], icon: <Gift className="h-4 w-4" />, route: "/kids", color: "text-pink-500" },
  { id: "tips", type: "feature", title: "Financial Tips", subtitle: "Daily money tips", keywords: ["tips", "advice", "suggestion", "daily tip"], icon: <Lightbulb className="h-4 w-4" />, route: "/dashboard", color: "text-yellow-500" },
  { id: "net-worth", type: "feature", title: "Net Worth", subtitle: "Track your wealth", keywords: ["net worth", "wealth", "total", "assets minus liabilities"], icon: <DollarSign className="h-4 w-4" />, route: "/accounts", color: "text-emerald-500" },
  { id: "mobile-app", type: "feature", title: "Install App", subtitle: "Add to home screen", keywords: ["app", "install", "pwa", "mobile", "download"], icon: <Smartphone className="h-4 w-4" />, route: "/help-center", color: "text-blue-500" },
  
  // Live & Learn Features
  { id: "live-stream", type: "feature", title: "Live Streaming", subtitle: "Watch live financial content", keywords: ["live", "stream", "video", "broadcast", "watch"], icon: <Video className="h-4 w-4" />, route: "/dashboard", color: "text-red-500" },
  { id: "featured-videos", type: "feature", title: "Featured Videos", subtitle: "Educational video content", keywords: ["video", "featured", "watch", "learn", "education"], icon: <Video className="h-4 w-4" />, route: "/dashboard", color: "text-purple-500" },
  { id: "dashboard-highlights", type: "feature", title: "Dashboard Highlights", subtitle: "Personalized announcements", keywords: ["highlights", "announcements", "tips", "news", "updates"], icon: <Sparkles className="h-4 w-4" />, route: "/dashboard", color: "text-amber-500" },
];

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Search database for user data
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setDynamicResults([]);
      return;
    }

    const searchDatabase = async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        
        const [
          { data: transactions },
          { data: budgets },
          { data: goals },
          { data: bills },
          { data: accounts },
          { data: debts },
          { data: kidsProfiles },
          { data: chores },
        ] = await Promise.all([
          supabase.from("transactions").select("id, title, amount, type").ilike("title", searchTerm).limit(5),
          supabase.from("budgets").select("id, name, amount, category").ilike("name", searchTerm).limit(5),
          supabase.from("goals").select("id, title, target_amount").ilike("title", searchTerm).limit(5),
          supabase.from("bills").select("id, name, amount").ilike("name", searchTerm).limit(5),
          supabase.from("accounts").select("id, name, balance").ilike("name", searchTerm).limit(5),
          supabase.from("debts").select("id, name, current_balance").ilike("name", searchTerm).limit(5),
          supabase.from("kids_profiles").select("id, display_name, first_name").or(`display_name.ilike.${searchTerm},first_name.ilike.${searchTerm}`).limit(5),
          supabase.from("kid_chores").select("id, title, reward_amount").ilike("title", searchTerm).limit(5),
        ]);

        const results: SearchResult[] = [];

        // Kid profiles
        (kidsProfiles || []).forEach((k) => {
          results.push({
            id: k.id,
            type: "kid",
            title: k.display_name || k.first_name || "Child",
            subtitle: "Kid profile",
            icon: <Baby className="h-4 w-4" />,
            route: "/kids",
            color: "text-pink-500",
          });
        });

        // Chores
        (chores || []).forEach((c) => {
          results.push({
            id: c.id,
            type: "chore",
            title: c.title,
            subtitle: `$${c.reward_amount} reward`,
            icon: <ListTodo className="h-4 w-4" />,
            route: "/kids",
            color: "text-pink-500",
          });
        });

        (transactions || []).forEach((t) => {
          results.push({
            id: t.id,
            type: "transaction",
            title: t.title || "Transaction",
            subtitle: `$${Math.abs(t.amount).toFixed(2)} • ${t.type}`,
            icon: <Receipt className="h-4 w-4" />,
            route: "/transactions",
            color: "text-orange-500",
          });
        });

        (budgets || []).forEach((b) => {
          results.push({
            id: b.id,
            type: "budget",
            title: b.name,
            subtitle: `$${b.amount} budget • ${b.category}`,
            icon: <BarChart3 className="h-4 w-4" />,
            route: "/budgets",
            color: "text-blue-500",
          });
        });

        (goals || []).forEach((g) => {
          results.push({
            id: g.id,
            type: "goal",
            title: g.title,
            subtitle: `$${g.target_amount} target`,
            icon: <Target className="h-4 w-4" />,
            route: "/goals",
            color: "text-purple-500",
          });
        });

        (bills || []).forEach((b) => {
          results.push({
            id: b.id,
            type: "bill",
            title: b.name,
            subtitle: `$${b.amount}`,
            icon: <FileText className="h-4 w-4" />,
            route: "/bills",
            color: "text-red-500",
          });
        });

        (accounts || []).forEach((a) => {
          results.push({
            id: a.id,
            type: "account",
            title: a.name,
            subtitle: `$${a.balance.toFixed(2)}`,
            icon: <Wallet className="h-4 w-4" />,
            route: "/accounts",
            color: "text-teal-500",
          });
        });

        (debts || []).forEach((d) => {
          results.push({
            id: d.id,
            type: "debt",
            title: d.name,
            subtitle: `$${d.current_balance} remaining`,
            icon: <CreditCard className="h-4 w-4" />,
            route: "/debts",
            color: "text-rose-500",
          });
        });

        setDynamicResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchDatabase, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Filter static pages with enhanced keyword matching
  const filteredPages = useMemo(() => {
    if (!query.trim()) return staticPages.slice(0, 8);
    const lowerQuery = query.toLowerCase();
    return staticPages.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.subtitle?.toLowerCase().includes(lowerQuery) ||
        p.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    onOpenChange(false);
    setQuery("");
  };

  const allResults = [...filteredPages, ...dynamicResults];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, kids, transactions, features..."
            className="border-0 focus-visible:ring-0 px-0 text-base"
            autoFocus
          />
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-2">
            {loading && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Searching...
              </div>
            )}

            {!loading && allResults.length === 0 && query.length > 1 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            )}

            {/* Pages & Features Section */}
            {filteredPages.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Pages & Features
                </p>
                {filteredPages.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <div className={cn("shrink-0", result.color)}>
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Dynamic Results Section */}
            {dynamicResults.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Your Data
                </p>
                {dynamicResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <div className={cn("shrink-0", result.color)}>
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Type to search</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">ESC</kbd>
            to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}