import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, CreditCard, DollarSign, FileText, TrendingUp, Bot, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BloomCoachHelpModal } from "./BloomCoachHelpModal";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { AddAccountModal } from "@/components/accounts/AddAccountModal";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import QuickAddBillsModal from "@/components/bills/QuickAddBillsModal";

// Checklist items for onboarding
const checklistItems = [
  { id: "account", number: 1, title: "Add Your First Account", description: "Link your bank for auto-sync", icon: <CreditCard className="h-4 w-4 text-[hsl(200,70%,55%)]" />, detectKey: "has_accounts", route: "/accounts" },
  { id: "budget", number: 2, title: "Create a Budget", description: "Set spending limits", icon: <DollarSign className="h-4 w-4 text-[hsl(250,70%,60%)]" />, detectKey: "has_budgets", route: "/budgets" },
  { id: "bills", number: 3, title: "Add Your Bills", description: "Track due dates", icon: <FileText className="h-4 w-4 text-[hsl(200,70%,55%)]" />, detectKey: "has_bills", route: "/bills" },
  { id: "transaction", number: 4, title: "Log a Transaction", description: "Record income or expenses", icon: <TrendingUp className="h-4 w-4 text-[hsl(200,70%,55%)]" />, detectKey: "has_transactions", route: "/transactions" },
  { id: "bloom-coach", number: 5, title: "Try Bloom", description: "Your AI financial mentor", icon: <Bot className="h-4 w-4 text-[hsl(280,70%,60%)]" />, detectKey: "visited_bloom_coach", route: "/coach" },
];

interface BalanceHeroCardProps {
  onUpgrade?: () => void;
}

export function BalanceHeroCard({ onUpgrade }: BalanceHeroCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isWelcomeExpanded, setIsWelcomeExpanded] = useState(false);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [autoDetectedItems, setAutoDetectedItems] = useState<string[]>([]);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [activeHelpTopic, setActiveHelpTopic] = useState("");
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [quickAddBillsModalOpen, setQuickAddBillsModalOpen] = useState(false);
  const [allStepsComplete, setAllStepsComplete] = useState(false);
  const [hideChecklist, setHideChecklist] = useState(() => localStorage.getItem("coinsbloom_checklist_hidden") === "true");
  const [isPreviewMode, setIsPreviewMode] = useState(() => localStorage.getItem("coinsbloom_checklist_preview_mode") === "true");

  const allCompletedItems = isPreviewMode ? [] : [...new Set([...completedItems, ...autoDetectedItems])];

  // Persist checklist hidden state to DB
  const persistChecklistHidden = useCallback(async (hidden: boolean) => {
    if (!user) return;
    localStorage.setItem("coinsbloom_checklist_hidden", hidden ? "true" : "false");
    setHideChecklist(hidden);
    await supabase.from('profiles').update({ welcome_checklist_hidden: hidden }).eq('id', user.id);
  }, [user]);

  // Listen for reset/preview events
  useEffect(() => {
    const handleReset = () => {
      setHideChecklist(false);
      setCompletedItems([]);
      setAutoDetectedItems([]);
      setAllStepsComplete(false);
      setIsPreviewMode(false);
      localStorage.removeItem('coinsbloom_checklist_preview_mode');
      if (user) {
        supabase.from('profiles').update({ welcome_checklist_hidden: false }).eq('id', user.id);
      }
    };
    const handlePreview = () => {
      const pm = localStorage.getItem("coinsbloom_checklist_preview_mode") === "true";
      setIsPreviewMode(pm);
      if (pm) { setAllStepsComplete(false); setHideChecklist(false); setIsWelcomeExpanded(true); }
    };
    const handleOpenSearch = () => setSearchModalOpen(true);

    window.addEventListener('coinsbloom_reset_welcome_checklist', handleReset);
    window.addEventListener('coinsbloom_preview_mode_changed', handlePreview);
    window.addEventListener('coinsbloom_open_search', handleOpenSearch);
    return () => {
      window.removeEventListener('coinsbloom_reset_welcome_checklist', handleReset);
      window.removeEventListener('coinsbloom_preview_mode_changed', handlePreview);
      window.removeEventListener('coinsbloom_open_search', handleOpenSearch);
    };
  }, [user]);

  const exitPreviewMode = () => {
    localStorage.removeItem('coinsbloom_checklist_preview_mode');
    setIsPreviewMode(false);
  };

  // Auto-detect completed onboarding steps — use DB for everything
  useEffect(() => {
    const detect = async () => {
      if (!user) return;
      const detected: string[] = [];

      // Check DB for bloom coach usage (conversations exist = visited)
      const [a, b, bi, t, bc, profile] = await Promise.all([
        supabase.from('accounts').select('id').eq('user_id', user.id).limit(1),
        supabase.from('budgets').select('id').eq('user_id', user.id).limit(1),
        supabase.from('bills').select('id').eq('user_id', user.id).limit(1),
        supabase.from('transactions').select('id').eq('user_id', user.id).limit(1),
        supabase.from('bloom_coach_conversations').select('id').eq('user_id', user.id).limit(1),
        supabase.from('profiles').select('welcome_checklist_hidden').eq('id', user.id).single(),
      ]);
      if ((a.data?.length || 0) > 0) detected.push("account");
      if ((b.data?.length || 0) > 0) detected.push("budget");
      if ((bi.data?.length || 0) > 0) detected.push("bills");
      if ((t.data?.length || 0) > 0) detected.push("transaction");
      if ((bc.data?.length || 0) > 0) detected.push("bloom-coach");

      // Also check localStorage as fallback for bloom coach
      if (!detected.includes("bloom-coach") && localStorage.getItem("visited_bloom_coach") === "true") {
        detected.push("bloom-coach");
      }

      setAutoDetectedItems(detected);
      const union = new Set<string>([...detected, ...completedItems]);
      const allComplete = checklistItems.every(i => union.has(i.id));
      setAllStepsComplete(allComplete);

      // Sync DB hidden state to local
      if (profile.data?.welcome_checklist_hidden) {
        setHideChecklist(true);
        localStorage.setItem("coinsbloom_checklist_hidden", "true");
      }

      if (allComplete && !hideChecklist) {
        persistChecklistHidden(true);
      }
    };
    detect();
  }, [user]);

  return (
    <div className="space-y-3">
      {/* Mobile Search Bar — removed; search icon is now in the header */}

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="p-3 bg-gradient-to-r from-violet-500 to-pink-500 rounded-xl text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <span className="font-medium text-sm">Preview Mode: Viewing as a new user</span>
          </div>
          <Button size="sm" variant="secondary" onClick={exitPreviewMode} className="bg-white/20 hover:bg-white/30 text-white border-0">
            Exit Preview
          </Button>
        </div>
      )}

      {/* Onboarding Checklist Pill */}
      {(!hideChecklist || isPreviewMode) && !allStepsComplete && (
        <div className="relative lg:max-w-md">
          <button
            onClick={() => setIsWelcomeExpanded(!isWelcomeExpanded)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-pink-500/15 dark:from-violet-500/20 dark:to-pink-500/20 border border-primary/20 backdrop-blur-md hover:border-primary/40 transition-all"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-semibold text-foreground">Get Started</span>
              <span className="text-xs text-muted-foreground ml-2">{allCompletedItems.length}/{checklistItems.length} done</span>
            </div>
            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden flex-shrink-0">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${(allCompletedItems.length / checklistItems.length) * 100}%` }} />
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isWelcomeExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isWelcomeExpanded && (
            <Card className="absolute left-0 right-0 top-full mt-2 z-40 p-3 border border-primary/20 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  if (allCompletedItems.includes(item.id)) return null;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => {
                      if (item.id === "account") setAccountModalOpen(true);
                      else if (item.id === "budget") setBudgetModalOpen(true);
                      else if (item.id === "bills") setQuickAddBillsModalOpen(true);
                      else if (item.id === "transaction") setTransactionModalOpen(true);
                      else navigate(item.route);
                      setIsWelcomeExpanded(false);
                    }}>
                      <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
              <button onClick={() => { persistChecklistHidden(true); setIsWelcomeExpanded(false); }} className="w-full mt-2 pt-2 border-t border-border text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
                Dismiss
              </button>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <BloomCoachHelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} topicId={activeHelpTopic} />
      <AddTransactionModal open={transactionModalOpen} onOpenChange={setTransactionModalOpen} defaultType="income" />
      <AddAccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} onSuccess={() => setAutoDetectedItems(prev => [...new Set([...prev, "account"])])} />
      <CreateBudgetModal open={budgetModalOpen} onOpenChange={setBudgetModalOpen} onSuccess={() => setAutoDetectedItems(prev => [...new Set([...prev, "budget"])])} />
      <QuickAddBillsModal open={quickAddBillsModalOpen} onOpenChange={setQuickAddBillsModalOpen} onSuccess={() => setAutoDetectedItems(prev => [...new Set([...prev, "bills"])])} />
      <GlobalSearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />
    </div>
  );
}
