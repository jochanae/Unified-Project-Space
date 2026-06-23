import { useState, useEffect, useMemo } from "react";
import { BloomCoachTip } from "@/components/shared/BloomCoachTip";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  BarChart3,
  Link2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  PiggyBank,
  Car,
  GraduationCap,
  Shield,
  Building,
  TrendingDown,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Info,
  Landmark,
  RefreshCw,
  Loader2,
  Home,
  Upload,
} from "lucide-react";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { AddAccountModal } from "@/components/accounts/AddAccountModal";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountCentralCarousel } from "@/components/accounts/AccountCentralCarousel";
import { AssetAllocationChart } from "@/components/accounts/AssetAllocationChart";
import { PlaidLinkButton } from "@/components/accounts/PlaidLinkButton";
import { SyncHistoryCard } from "@/components/accounts/SyncHistoryCard";
import { TransferModal } from "@/components/transactions/TransferModal";
import { DualCardPromo } from "@/components/accounts/DualCardPromo";
import { ReconcileAccountsModal } from "@/components/accounts/ReconcileAccountsModal";
import { CSVImportModal } from "@/components/shared/CSVImportModal";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  account_number_masked: string | null;
  account_type: string;
  category: "asset" | "liability";
  balance: number;
  is_manual: boolean;
}

const ACCOUNT_GROUPS = {
  "Banking & Cash": ["cash", "checking", "savings", "money_market", "cd"],
  "Real Estate": ["real_estate"],
  "Vehicles": ["vehicle"],
  "Investments": ["investment", "brokerage", "crypto"],
  "Retirement": ["retirement_401k", "retirement_ira", "retirement_roth"],
  "Insurance & Annuities": ["insurance", "annuity"],
  "Credit Cards & Lines": ["credit_card", "line_of_credit"],
  "Vehicle Loans": ["auto_loan"],
  "Mortgage & Home Loans": ["mortgage", "heloc"],
  "Education Loans": ["student_loan"],
  "Other Loans": ["personal_loan"],
  "Other": ["other"],
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  "Banking & Cash": "Your liquid cash and bank balances",
  "Real Estate": "Property market values — what your homes are worth",
  "Vehicles": "Current market value of vehicles you own",
  "Investments": "Brokerage, crypto, and investment accounts",
  "Retirement": "401(k), IRA, and Roth retirement savings",
  "Insurance & Annuities": "Cash value of policies and annuities",
  "Credit Cards & Lines": "Outstanding balances you owe",
  "Vehicle Loans": "Remaining balance on auto loans",
  "Mortgage & Home Loans": "What you still owe on your home(s)",
  "Education Loans": "Outstanding student loan balances",
  "Other Loans": "Personal and other loan balances",
  "Other": "Miscellaneous accounts",
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
  "Banking & Cash": <Wallet className="h-5 w-5 text-primary" />,
  "Real Estate": <Home className="h-5 w-5 text-green-600" />,
  "Vehicles": <Car className="h-5 w-5 text-primary" />,
  "Investments": <TrendingUp className="h-5 w-5 text-primary" />,
  "Retirement": <PiggyBank className="h-5 w-5 text-primary" />,
  "Insurance & Annuities": <Shield className="h-5 w-5 text-teal-600" />,
  "Credit Cards & Lines": <CreditCard className="h-5 w-5 text-destructive" />,
  "Vehicle Loans": <Car className="h-5 w-5 text-destructive" />,
  "Mortgage & Home Loans": <Home className="h-5 w-5 text-destructive" />,
  "Education Loans": <GraduationCap className="h-5 w-5 text-primary" />,
  "Other Loans": <Landmark className="h-5 w-5 text-destructive" />,
  "Other": <Building className="h-5 w-5 text-muted-foreground" />,
};

const GROUP_COLORS: Record<string, string> = {
  "Banking & Cash": "bg-primary/10 dark:bg-primary/5",
  "Real Estate": "bg-bloom-green/10 dark:bg-bloom-green/5",
  "Vehicles": "bg-primary/10 dark:bg-primary/5",
  "Investments": "bg-primary/10 dark:bg-primary/5",
  "Retirement": "bg-primary/10 dark:bg-primary/5",
  "Insurance & Annuities": "bg-bloom-cyan/10 dark:bg-bloom-cyan/5",
  "Credit Cards & Lines": "bg-destructive/10 dark:bg-destructive/5",
  "Vehicle Loans": "bg-destructive/10 dark:bg-destructive/5",
  "Mortgage & Home Loans": "bg-destructive/10 dark:bg-destructive/5",
  "Education Loans": "bg-primary/10 dark:bg-primary/5",
  "Other Loans": "bg-destructive/10 dark:bg-destructive/5",
  "Other": "bg-muted dark:bg-muted/50",
};

export default function Accounts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "assets" | "liabilities">("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth?mode=signin");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  // Real-time subscription for accounts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('accounts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
        },
        () => {
          console.log('[Accounts] Real-time update received');
          fetchAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load accounts");
    } else {
      setAccounts(data || []);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    // Find the account to store for potential undo
    const accountToDelete = accounts.find(a => a.id === id);
    if (!accountToDelete) return;

    // Optimistically remove from UI
    setAccounts(prev => prev.filter(a => a.id !== id));

    // Show toast with undo option
    toast.success("Account deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          // Restore the account
          const { error } = await supabase.from("accounts").insert({
            id: accountToDelete.id,
            user_id: user!.id,
            name: accountToDelete.name,
            institution: accountToDelete.institution,
            account_number_masked: accountToDelete.account_number_masked,
            account_type: accountToDelete.account_type as any,
            category: accountToDelete.category,
            balance: accountToDelete.balance,
            is_manual: accountToDelete.is_manual,
          });

          if (error) {
            toast.error("Failed to restore account");
          } else {
            toast.success("Account restored");
            fetchAccounts();
          }
        },
      },
    });

    // Actually delete from database
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete account");
      // Restore on error
      fetchAccounts();
    }
  };

  const handleSyncAccounts = async () => {
    if (!user) return;
    setSyncing(true);
    
    try {
      const response = await supabase.functions.invoke("plaid", {
        body: { action: "sync_accounts" },
      });

      if (response.error) {
        // Log failed sync
        await supabase.from("sync_history").insert({
          user_id: user.id,
          sync_type: "manual",
          accounts_synced: 0,
          status: "error",
          error_message: response.error.message,
        });
        throw new Error(response.error.message);
      }

      const accountsSynced = response.data?.accounts_synced || 0;

      // Log successful sync
      await supabase.from("sync_history").insert({
        user_id: user.id,
        sync_type: "manual",
        accounts_synced: accountsSynced,
        status: "success",
      });

      if (accountsSynced > 0) {
        toast.success(`Synced ${accountsSynced} accounts`);
        fetchAccounts();
      } else {
        toast.info("No linked accounts to sync. Link a bank first!");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync accounts");
    } finally {
      setSyncing(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    if (activeTab === "assets") return accounts.filter((a) => a.category === "asset");
    if (activeTab === "liabilities") return accounts.filter((a) => a.category === "liability");
    return accounts;
  }, [accounts, activeTab]);

  const totalAssets = accounts
    .filter((a) => a.category === "asset")
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalLiabilities = accounts
    .filter((a) => a.category === "liability")
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const netWorth = totalAssets - totalLiabilities;
  const liquidityRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(1) : "N/A";
  const debtToAssetRatio = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : "0";

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    Object.entries(ACCOUNT_GROUPS).forEach(([groupName, types]) => {
      const groupAccounts = filteredAccounts.filter((a) =>
        types.includes(a.account_type)
      );
      if (groupAccounts.length > 0) {
        groups[groupName] = groupAccounts;
      }
    });
    return groups;
  }, [filteredAccounts]);

  const assetAllocation = useMemo(() => {
    const assetAccounts = accounts.filter((a) => a.category === "asset");
    const allocation: Record<string, number> = {};
    
    Object.entries(ACCOUNT_GROUPS).forEach(([groupName, types]) => {
      const total = assetAccounts
        .filter((a) => types.includes(a.account_type))
        .reduce((sum, a) => sum + Number(a.balance), 0);
      if (total > 0) {
        allocation[groupName] = total;
      }
    });
    
    return allocation;
  }, [accounts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your accounts..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="w-full">
      <Helmet>
        <title>Accounts | CoinsBloom - Track Your Net Worth</title>
        <meta name="description" content="Manage all your financial accounts in one place. Track assets, liabilities, and your complete net worth with CoinsBloom." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />

      {/* Hero */}
      <PageHeroHeader
        title="Accounts"
        subtitle="Connect and manage all your bank accounts, credit cards, and financial institutions"
        icon={<Landmark className="h-6 w-6 text-[hsl(200,80%,70%)]" />}
        colorScheme="blue"
      />

      <BloomCoachTip
        example="Add my Chase checking account with $2,500"
        dismissKey="bloom_tip_accounts"
      />

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-4 py-6 space-y-6"
      >
        {/* Account Central Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-primary">Account Central</h2>
              <p className="text-sm text-muted-foreground">Track your complete net worth</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInfo(!showInfo)}
            >
              {showInfo ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>
          
          <div id="net-worth-section">
            <AccountCentralCarousel
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              netWorth={netWorth}
            />
          </div>
        </div>

        {/* Asset Allocation */}
        {Object.keys(assetAllocation).length > 0 && (
          <AssetAllocationChart allocation={assetAllocation} total={totalAssets} />
        )}

        {/* Account Summary */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Account Summary</h3>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Accounts</span>
              <span className="bg-muted px-2 py-0.5 rounded-full text-xs">{accounts.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Assets</span>
              <span className="text-green-600 font-semibold">
                ${totalAssets.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Liabilities</span>
              <span className="text-destructive font-semibold">
                ${totalLiabilities.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span>Liquidity Ratio</span>
              <span>{liquidityRatio}</span>
            </div>
            <div className="flex justify-between">
              <span>Debt-to-Asset Ratio</span>
              <span className="text-green-600">{debtToAssetRatio}%</span>
            </div>
          </div>

          <PlaidLinkButton onSuccess={fetchAccounts} />
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <Button
            className="flex-shrink-0 bg-primary hover:bg-primary/90"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account (Free)
          </Button>
          <Button variant="secondary" className="flex-shrink-0 bg-primary text-white hover:bg-primary/90" onClick={() => setTransferModalOpen(true)}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transfer Money
          </Button>
          <Button 
            variant="outline" 
            className="flex-shrink-0 border-emerald-500 text-emerald-600 hover:bg-emerald-500/10 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            onClick={() => setActiveTab("assets")}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Assets
          </Button>
          <Button 
            variant="outline" 
            className="flex-shrink-0 border-destructive/50 text-destructive hover:bg-destructive/5"
            onClick={() => setActiveTab("liabilities")}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            View Liabilities
          </Button>
          <Button 
            variant="secondary" 
            className="flex-shrink-0 bg-primary text-white hover:bg-primary/90"
            onClick={() => {
              setActiveTab("all");
              document.getElementById("net-worth-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Net Worth
          </Button>
          <PlaidLinkButton onSuccess={fetchAccounts} />
          <Button 
            variant="default" 
            className="flex-shrink-0 bg-blue-500 hover:bg-blue-600"
            onClick={handleSyncAccounts}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? "Syncing..." : "Sync Accounts"}
          </Button>
          <Button 
            variant="default" 
            className="flex-shrink-0 bg-teal-500 hover:bg-teal-600"
            onClick={() => setReconcileModalOpen(true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Reconcile
          </Button>
          <Button 
            variant="outline" 
            className="flex-shrink-0"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Accounts</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Account Groups */}
        <div className="space-y-6">
          {activeTab !== "liabilities" && (
            <div>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-emerald-500/30" />
                <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">Assets</h3>
                <div className="h-px flex-1 bg-emerald-500/30" />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">What you own — adds to your net worth</p>
            </div>
          )}
          
          {(() => {
            const entries = Object.entries(groupedAccounts);
            const liabilityGroups = ["Credit Cards & Lines", "Vehicle Loans", "Mortgage & Home Loans", "Education Loans", "Other Loans"];
            const hasAssets = entries.some(([g]) => !liabilityGroups.includes(g));
            const hasLiabilities = entries.some(([g]) => liabilityGroups.includes(g));
            let liabilitySectionShown = false;

            return entries.map(([groupName, groupAccounts]) => {
              const isLiability = liabilityGroups.includes(groupName);
              if (activeTab === "assets" && isLiability) return null;
              if (activeTab === "liabilities" && !isLiability) return null;

              const groupTotal = groupAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

              // Show liabilities section header before the first liability group
              let showLiabilityDivider = false;
              if (isLiability && !liabilitySectionShown && activeTab !== "liabilities") {
                liabilitySectionShown = true;
                showLiabilityDivider = true;
              }

              return (
                <div key={groupName}>
                  {showLiabilityDivider && (
                    <div className="pt-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-destructive/30" />
                        <h3 className="font-bold text-lg text-destructive">Liabilities</h3>
                        <div className="h-px flex-1 bg-destructive/30" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-1">What you owe — subtracted from your net worth</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {GROUP_ICONS[groupName]}
                        <div>
                          <h4 className="font-semibold text-lg">{groupName}</h4>
                          <p className="text-xs text-muted-foreground">{GROUP_DESCRIPTIONS[groupName]}</p>
                        </div>
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                          {groupAccounts.length}
                        </span>
                      </div>
                      <span className={isLiability ? "text-destructive font-semibold" : "font-semibold"}>
                        ${groupTotal.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {groupAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          groupColor={GROUP_COLORS[groupName]}
                          onDelete={() => handleDeleteAccount(account.id)}
                          onRefresh={fetchAccounts}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {filteredAccounts.length === 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No accounts yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                  Add your first account to start tracking your complete financial picture
                </p>
                <Button onClick={() => setAddModalOpen(true)} className="gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sync History */}
        <SyncHistoryCard />

        {/* Dual Card Promo */}
        <DualCardPromo />

        {/* Info Card */}
        {showInfo && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold flex items-center gap-2">
                  💡 Accounts (Your Complete Financial Picture)
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <strong>Assets:</strong> Bank accounts, investments, retirement (401k, IRA),
                    real estate, vehicles - everything you own
                  </li>
                  <li>
                    <strong>Liabilities:</strong> Credit cards, mortgages, loans, HELOCs -
                    everything you owe
                  </li>
                  <li>
                    <strong>Net Worth:</strong> Total Assets minus Total Liabilities, calculated
                    automatically
                  </li>
                </ul>
                <p className="text-muted-foreground">
                  Add accounts manually or connect your bank with Plaid for automatic syncing.
                  Use Bills and Debt pages to track payments on liabilities.
                </p>
                <Button variant="link" className="p-0 h-auto text-primary">
                  Learn more & share your feedback →
                </Button>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      <AddAccountModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={fetchAccounts}
      />

      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
      />

      <ReconcileAccountsModal
        open={reconcileModalOpen}
        onOpenChange={setReconcileModalOpen}
        onSuccess={fetchAccounts}
      />

      <CSVImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        importType="accounts"
        existingRecords={accounts}
        onSuccess={fetchAccounts}
      />
    </div>
    </div>
  );
}
