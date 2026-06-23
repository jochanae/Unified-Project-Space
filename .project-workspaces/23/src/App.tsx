import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/features/auth";
import { AdminRouteGuard } from "@/features/admin";
import { AppShell } from "@/components/shared/AppShell";
import { CustomDomainRouter } from "@/components/CustomDomainRouter";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PublishedPage from "./pages/PublishedPage";
import SharedBlueprintPage from "./pages/SharedBlueprintPage";
import SocialFunnelPage from "./pages/SocialFunnelPage";
import ProjectsPage from "./pages/ProjectsPage";
import AdminPage from "./pages/AdminPage";
import HelpPage from "./pages/HelpPage";
import SettingsPage from "./pages/SettingsPage";
import BrandKitSettingsPage from "./pages/BrandKitSettingsPage";
import DashboardPage from "./pages/DashboardPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import Index from "./pages/Index";

import QuickLaunchPage from "./pages/QuickLaunchPage";
import LeadsPage from "./pages/LeadsPage";
import SignalLabPage from "./pages/SignalLabPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import StrategyBlueprintPage from "./pages/StrategyBlueprintPage";
import StudioPage from "./pages/StudioPage";


import NotFound from "./pages/NotFound";
import UnsubscribePage from "./pages/UnsubscribePage";
import ThanksPage from "./pages/ThanksPage";
import { PwaInstallBanner } from "./components/shared/PwaInstallBanner";

const queryClient = new QueryClient();

/**
 * ProtectedAppShell combines auth guard + shared header layout.
 * ProtectedRoute handles auth check and renders its children (AppShell).
 * AppShell renders the header + <Outlet /> for child routes.
 */
function ProtectedAppShell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CustomDomainRouter>
            <PwaInstallBanner />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/p/:slug" element={<PublishedPage />} />
              <Route path="/s/:token" element={<SocialFunnelPage />} />
              <Route path="/blueprint/:token" element={<SharedBlueprintPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/thanks/:pageId" element={<ThanksPage />} />

              {/* Authenticated routes — share AppShell header */}
              <Route element={<ProtectedAppShell />}>
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/workspace" element={<Index />} />
                <Route path="/admin" element={<AdminRouteGuard><AdminPage /></AdminRouteGuard>} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/brand" element={<BrandKitSettingsPage />} />
                <Route path="/help" element={<HelpPage />} />
                
                <Route path="/launch" element={<QuickLaunchPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/signal-lab" element={<SignalLabPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/strategy" element={<StrategyBlueprintPage />} />
                <Route path="/studio" element={<StudioPage />} />
                <Route path="/learn" element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* Legacy redirects — folded into consolidated hubs */}
              <Route path="/home" element={<Navigate to="/projects" replace />} />
              <Route path="/logo-generator" element={<Navigate to="/studio?tab=logo" replace />} />
              <Route path="/social-lab" element={<Navigate to="/studio?tab=social" replace />} />
              <Route path="/video" element={<Navigate to="/studio" replace />} />
              <Route path="/renders" element={<Navigate to="/studio" replace />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </CustomDomainRouter>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
