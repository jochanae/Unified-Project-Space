import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PartnerBrandingProvider } from "@/contexts/PartnerBrandingContext";
import { OfflineSyncProvider } from "@/contexts/OfflineSyncContext";
import { ProfessionalModeProvider } from "@/contexts/ProfessionalModeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminBlog from "./pages/AdminBlog";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import OurExperts from "./pages/OurExperts";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import ClaimProfessional from "./pages/ClaimProfessional";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import GoalDetail from "./pages/GoalDetail";
import JoinGoal from "./pages/JoinGoal";
import Budgets from "./pages/Budgets";
import BudgetDetail from "./pages/BudgetDetail";
import JoinBudget from "./pages/JoinBudget";
import Bills from "./pages/Bills";
import Accounts from "./pages/Accounts";
import Debts from "./pages/Debts";
import VisionBoard from "./pages/VisionBoard";
import Reports from "./pages/Reports";
import Credit from "./pages/Credit";
import AdvancedTools from "./pages/AdvancedTools";
import HelpCenter from "./pages/HelpCenter";
import MoneyAcademy from "./pages/MoneyAcademy";
import BloomCoach from "./pages/BloomCoach";
import QuinnExport from "./pages/QuinnExport";
import QuinnShelf from "./pages/QuinnShelf";
import FinancialPlans from "./pages/FinancialPlans";
import ScenarioLab from "./pages/ScenarioLab";
import ScenarioLabResults from "./pages/ScenarioLabResults";
import Support from "./pages/Support";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import KidsBloomSignup from "./pages/kidsbloom/KidsBloomSignup";
import KidsBloomLogin from "./pages/kidsbloom/KidsBloomLogin";
import KidsBloomDashboard from "./pages/kidsbloom/KidsBloomDashboard";
import KidsBloomSettings from "./pages/kidsbloom/KidsBloomSettings";
import KidsBloomLearn from "./pages/kidsbloom/KidsBloomLearn";
import KidsBloomHome from "./pages/kidsbloom/KidsBloomHome";
import Kids from "./pages/Kids";
import KidsChat from "./pages/KidsChat";
import Admin from "./pages/Admin";
import BetaTesting from "./pages/BetaTesting";
import ReferBusiness from "./pages/ReferBusiness";
import Refer from "./pages/Refer";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import SmsConsent from "./pages/SmsConsent";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";


import AdminContentHub from "./pages/admin/AdminContentHub";
import AdminKidsContent from "./pages/admin/AdminKidsContent";
import AdminDataIntegrity from "./pages/admin/AdminDataIntegrity";
import AdminE2ETesting from "./pages/admin/AdminE2ETesting";
import AdminUserMonitoring from "./pages/admin/AdminUserMonitoring";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import EnterprisePortal from "./pages/admin/EnterprisePortal";
import AdminEngagement from "./pages/admin/AdminEngagement";
import CardDashboard from "./pages/CardDashboard";
import AdminBetaResults from "./pages/admin/AdminBetaResults";
import PartnerAdmin from "./pages/PartnerAdmin";
import PartnerLandingPage from "./pages/partner/PartnerLandingPage";
import PartnerSignup from "./pages/partner/PartnerSignup";
import PartnerDashboardPreview from "./pages/PartnerDashboardPreview";
import SwipeNavigation from "@/components/navigation/SwipeNavigation";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";
import LoadingDemo from "./pages/LoadingDemo";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { AppFooterBar } from "@/components/navigation/AppFooterBar";
// PWA OfflineBanner disabled — kept for potential reuse
// import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { PreviewModeBanner } from "@/components/branding/PreviewModeBanner";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {/* PWA components removed to eliminate stale caching issues */}
            <BrowserRouter>
              <AuthProvider>
                <ProfessionalModeProvider>
                <PartnerBrandingProvider>
                <PreviewModeBanner />
                <OfflineSyncProvider>
                {/* Global swipe navigation with draggable arrows on all main pages */}
                <SwipeNavigation />
                <ScrollToTop />
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/signin" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/help-center" element={<HelpCenter />} />
               <Route path="/money-academy" element={<MoneyAcademy />} />
              <Route path="/support" element={<Support />} />
              <Route path="/install" element={<Install />} />
              <Route path="/beta-testing" element={<BetaTesting />} />
              <Route path="/loading-demo" element={<ProtectedRoute><LoadingDemo /></ProtectedRoute>} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/sms-consent" element={<SmsConsent />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/refer" element={<Refer />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              
              {/* Protected routes with MFA enforcement */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/professionals" element={<ProtectedRoute><FeatureGate path="/professionals"><OurExperts /></FeatureGate></ProtectedRoute>} />
              <Route path="/professionals/claim/:token" element={<ClaimProfessional />} />
              <Route path="/professionals/:id" element={<ProtectedRoute><FeatureGate path="/professionals"><ProfessionalProfile /></FeatureGate></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
              <Route path="/goals/join/:goalId" element={<ProtectedRoute><JoinGoal /></ProtectedRoute>} />
              <Route path="/goals/:id" element={<ProtectedRoute><GoalDetail /></ProtectedRoute>} />
              <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/budgets/join/:budgetId" element={<ProtectedRoute><JoinBudget /></ProtectedRoute>} />
              <Route path="/budgets/:id" element={<ProtectedRoute><BudgetDetail /></ProtectedRoute>} />
              <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
              <Route path="/debts" element={<ProtectedRoute><Debts /></ProtectedRoute>} />
              <Route path="/vision-board" element={<ProtectedRoute><FeatureGate path="/vision-board"><VisionBoard /></FeatureGate></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/credit" element={<ProtectedRoute><FeatureGate path="/credit"><Credit /></FeatureGate></ProtectedRoute>} />
              <Route path="/advanced" element={<ProtectedRoute><AdvancedTools /></ProtectedRoute>} />
              <Route path="/coach" element={<ProtectedRoute><FeatureGate path="/coach"><BloomCoach /></FeatureGate></ProtectedRoute>} />
              <Route path="/quinn/memory" element={<ProtectedRoute><QuinnExport /></ProtectedRoute>} />
              {/* Legacy redirect */}
              <Route path="/coach/export" element={<ProtectedRoute><QuinnExport /></ProtectedRoute>} />
              <Route path="/financial-plans" element={<ProtectedRoute><FinancialPlans /></ProtectedRoute>} />
              <Route path="/scenario-lab" element={<ProtectedRoute><ScenarioLab /></ProtectedRoute>} />
              <Route path="/scenario-lab/results" element={<ProtectedRoute><ScenarioLabResults /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/admin/content" element={<ProtectedRoute><AdminContentHub /></ProtectedRoute>} />
              <Route path="/admin/kids-content" element={<ProtectedRoute><AdminKidsContent /></ProtectedRoute>} />
              <Route path="/admin/data-integrity" element={<ProtectedRoute><AdminDataIntegrity /></ProtectedRoute>} />
              <Route path="/admin/e2e-testing" element={<ProtectedRoute><AdminE2ETesting /></ProtectedRoute>} />
              <Route path="/admin/user-monitoring" element={<ProtectedRoute><AdminUserMonitoring /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute><AdminAudit /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/enterprise" element={<ProtectedRoute><EnterprisePortal /></ProtectedRoute>} />
              <Route path="/admin/engagement" element={<ProtectedRoute><AdminEngagement /></ProtectedRoute>} />
              <Route path="/admin/beta-results" element={<ProtectedRoute><AdminBetaResults /></ProtectedRoute>} />
              <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
              
              {/* Partner Admin Portal (B2B White-label) */}
              <Route path="/partner/admin" element={<ProtectedRoute><PartnerAdmin /></ProtectedRoute>} />
              
              {/* Public Partner Landing Page */}
              <Route path="/p/:slug" element={<PartnerLandingPage />} />
              
              {/* Public Partner Signup */}
              <Route path="/partner/signup" element={<PartnerSignup />} />
              
              {/* Partner Dashboard Preview (no auth required) */}
              <Route path="/partner-preview/:slug" element={<PartnerDashboardPreview />} />
              
              {/* Card Routes */}
              <Route path="/card-dashboard" element={<ProtectedRoute><CardDashboard /></ProtectedRoute>} />
              <Route path="/quinn-shelf" element={<ProtectedRoute><QuinnShelf /></ProtectedRoute>} />
              
              {/* B2B Referral for Regular Users */}
              <Route path="/refer-business" element={<ProtectedRoute><FeatureGate path="/refer-business"><ReferBusiness /></FeatureGate></ProtectedRoute>} />
              
              {/* Parent Kids Management */}
              <Route path="/kids" element={<ProtectedRoute><FeatureGate path="/kids"><Kids /></FeatureGate></ProtectedRoute>} />
              <Route path="/kids/chat" element={<ProtectedRoute><FeatureGate path="/kids/chat"><KidsChat /></FeatureGate></ProtectedRoute>} />
              
              {/* KidsBloom Routes (separate auth system) */}
              <Route path="/kidsbloom" element={<KidsBloomHome />} />
              <Route path="/kidsbloom/signup" element={<KidsBloomSignup />} />
              <Route path="/kidsbloom/login" element={<KidsBloomLogin />} />
              <Route path="/kidsbloom/dashboard" element={<KidsBloomDashboard />} />
              <Route path="/kidsbloom/settings" element={<KidsBloomSettings />} />
              <Route path="/kidsbloom/learn" element={<KidsBloomLearn />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
                <AppFooterBar />
                </OfflineSyncProvider>
                </PartnerBrandingProvider>
                </ProfessionalModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
