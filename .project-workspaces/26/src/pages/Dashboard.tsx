import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardEditProvider } from "@/contexts/DashboardEditContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatusHeroBar } from "@/components/dashboard/StatusHeroBar";

import { DateNavigation } from "@/components/dashboard/DateNavigation";
import { DashboardKPIRow } from "@/components/dashboard/DashboardKPIRow";
import { DashboardSpendingCard } from "@/components/dashboard/DashboardSpendingCard";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardTipCard } from "@/components/dashboard/DashboardTipCard";
import { BalanceHeroCard } from "@/components/dashboard/BalanceHeroCard";
import { LiveLearnCard } from "@/components/dashboard/LiveLearnCard";
import { DashboardHighlights } from "@/components/dashboard/DashboardHighlights";
import { FeaturedProfessionalCard } from "@/components/dashboard/FeaturedProfessionalCard";
import { SubscriptionBadge } from "@/components/dashboard/SubscriptionBadge";
import { CompactCardGrid } from "@/components/dashboard/CompactCardGrid";
import { EditModeOverlay } from "@/components/dashboard/EditModeOverlay";
import { ProfessionalDashboard } from "@/components/professionals/ProfessionalDashboard";
import { ProfessionalModeProvider, useProfessionalMode } from "@/contexts/ProfessionalModeContext";
import { BillReminders } from "@/components/bills/BillReminders";

import PayBillModal from "@/components/bills/PayBillModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useDashboardFinancials } from "@/hooks/useDashboardFinancials";
import { KPIChartDrawer } from "@/components/dashboard/KPIChartDrawer";
import { SpendingOverviewModal } from "@/components/dashboard/SpendingOverviewModal";
import { toast } from "sonner";

type UserRole = 'admin' | 'moderator' | 'user' | null;

interface ReminderBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
}

const DashboardContent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payBillModalOpen, setPayBillModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [activeKPI, setActiveKPI] = useState<"networth" | "cashflow" | "budget" | "savings" | null>(null);
  const [spendingModalOpen, setSpendingModalOpen] = useState(false);
  const [dashboardMonth, setDashboardMonth] = useState(new Date());
  
  const { financialData, chartData, formatCurrency } = useDashboardFinancials(dashboardMonth);
  
  const { 
    tier, 
    subscribed, 
    showFirstLoginModal, 
    dismissFirstLoginModal,
    checkSubscription 
  } = useSubscription();
  
  const { isLinkedProfessional, isProfessionalMode } = useProfessionalMode();

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (roleData && roleData.length > 0) {
        const roles = roleData.map(r => r.role);
        if (roles.includes('super_admin') || roles.includes('admin')) setUserRole('admin');
        else if (roles.includes('moderator')) setUserRole('moderator');
        else setUserRole('user');
      }
    };
    fetchUserRole();
  }, [user]);

  // Handle subscription success/cancel from URL params
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      toast.success("Subscription successful! Welcome to Premium!");
      checkSubscription();
      window.history.replaceState({}, "", "/dashboard");
    } else if (subscriptionStatus === "canceled") {
      toast.info("Subscription canceled. You can subscribe anytime.");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, checkSubscription]);

  useEffect(() => {
    if (showFirstLoginModal) setSubscriptionModalOpen(true);
  }, [showFirstLoginModal]);

  const handlePayBill = (bill: ReminderBill) => {
    setSelectedBill({
      id: bill.id, name: bill.name, amount: bill.amount, due_date: bill.due_date,
      category: 'other', frequency: 'monthly', is_recurring: true, is_autopay: false, status: 'pending',
    });
    setPayBillModalOpen(true);
  };

  useEffect(() => {
    if (!loading && !user) { navigate("/signin"); return; }
    if (user?.email?.includes('@kidsbloom.internal') || user?.email?.includes('@kidsbloom.local')) {
      supabase.auth.signOut({ scope: "local" }).finally(() => navigate("/signin"));
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Preparing your dashboard…" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-background dark:via-background dark:to-background flex flex-col relative">
      <Helmet>
        <title>Dashboard | CoinsBloom - Your Financial Hub</title>
        <meta name="description" content="View your complete financial overview." />
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <EditModeOverlay />
      <DashboardHeader />
      <StatusHeroBar 
        onSubscriptionClick={() => setSubscriptionModalOpen(true)}
        planName={
          userRole === 'admin' ? "Admin Plan" 
            : userRole === 'moderator' ? "Moderator Plan"
            : subscribed ? (tier === "premium" ? "Premium Plan" : "Family Plan") 
            : "Free Plan"
        }
        userName={user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Friend'}
      />
      
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 pb-24"
      >
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6">
          {isProfessionalMode ? (
            <ProfessionalDashboard />
          ) : (
            <>
              {/* Row 1: Search + Subscription Badge (desktop) */}
              <div className="flex items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-3 min-w-0" />
                <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('coinsbloom_open_search'))}
                    className="flex items-center gap-2 h-9 w-72 rounded-xl border border-border/50 bg-white/50 dark:bg-white/10 backdrop-blur-md px-4 text-left text-sm text-muted-foreground hover:bg-white/70 dark:hover:bg-white/15 transition-colors"
                  >
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search accounts, bills, goals…
                  </button>
                  <div className="cursor-pointer" onClick={() => setSubscriptionModalOpen(true)}>
                    <SubscriptionBadge 
                      variant="compact"
                      planName={
                        userRole === 'admin' ? "Admin Plan" 
                          : userRole === 'moderator' ? "Moderator Plan"
                          : subscribed ? (tier === "premium" ? "Premium Plan" : "Family Plan") 
                          : "Free Plan"
                      } 
                      message={
                        userRole === 'admin' || userRole === 'moderator' ? "Full access granted"
                          : subscribed ? "Thank you for your support!" 
                          : "Tap to upgrade"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Mobile subscription badge removed — now in hero bar */}
              
              <div className="mt-2">
                <DateNavigation currentDate={dashboardMonth} onDateChange={setDashboardMonth} />
              </div>

              {/* Row 2: KPI Summary Cards */}
              <div className="mt-4">
                <DashboardKPIRow
                  data={financialData}
                  formatCurrency={formatCurrency}
                  activeKPI={activeKPI}
                  onKPISelect={(kpi) => setActiveKPI(activeKPI === kpi ? null : kpi)}
                />
              </div>

              {/* Rotating Tips — frosted, right below KPI cards */}
              <div className="mt-3">
                <DashboardTipCard />
              </div>

              {/* Row 3: Quick Actions */}
              <div className="mt-4">
                <DashboardQuickActions />
              </div>

              {/* Row 4: Spending Chart — full width, centered */}
              <div className="mt-4">
                <DashboardSpendingCard
                  chartData={chartData}
                  income={financialData.cashflow.income}
                  expenses={financialData.cashflow.expenses}
                  formatCurrency={formatCurrency}
                  onExpand={() => setSpendingModalOpen(true)}
                />
              </div>


              <div className="mt-4">
                <BillReminders onPayBill={handlePayBill} />
              </div>

              {/* Row 4: Onboarding + Health (from BalanceHeroCard — kept for onboarding/checklist/modals) */}
              <div className="mt-4">
                <BalanceHeroCard onUpgrade={() => setSubscriptionModalOpen(true)} />
              </div>

              {/* Row 5: Highlights + Subscription (mobile only) */}
              <div className="mt-4">
                <DashboardHighlights />
              </div>

              {/* Row 6: Live & Learn + Professionals (2-col) */}
              <div className="mt-4 lg:grid lg:grid-cols-2 lg:gap-4">
                <LiveLearnCard />
                <FeaturedProfessionalCard />
              </div>

              {/* Row 7: Compact Cards */}
              <div className="mt-4">
                <CompactCardGrid />
              </div>
            </>
          )}
        </div>
      </motion.main>

      <PayBillModal
        open={payBillModalOpen}
        onOpenChange={setPayBillModalOpen}
        bill={selectedBill}
        onSuccess={() => setSelectedBill(null)}
      />
      <SubscriptionModal 
        open={subscriptionModalOpen} 
        onOpenChange={(open) => {
          setSubscriptionModalOpen(open);
          if (!open) dismissFirstLoginModal();
        }}
        currentTier={tier}
      />
      <KPIChartDrawer
        activeKPI={activeKPI}
        onClose={() => setActiveKPI(null)}
        data={financialData}
        formatCurrency={formatCurrency}
      />
      <SpendingOverviewModal
        open={spendingModalOpen}
        onClose={() => setSpendingModalOpen(false)}
        chartData={chartData}
        income={financialData.cashflow.income}
        expenses={financialData.cashflow.expenses}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <ProfessionalModeProvider>
      <DashboardEditProvider>
        <DashboardContent />
      </DashboardEditProvider>
    </ProfessionalModeProvider>
  );
};

export default Dashboard;
