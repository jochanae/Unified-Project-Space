import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppProvider } from "@/contexts/AppContext";
import AppLayout from "@/layouts/AppLayout";
import HomePage from "./pages/HomePage";
import FeedPage from "./pages/FeedPage";
import MessagesPage from "./pages/MessagesPage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPageRoute from "./pages/SettingsPageRoute";
import WellnessPage from "./pages/WellnessPage";
import ChatPage from "./pages/ChatPage";
import StudioPage from "./pages/StudioPage";

import CirclesPage from "./pages/CirclesPage";
import CircleChatPage from "./pages/CircleChatPage";
import CircleJoinPage from "./pages/CircleJoinPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/NotFound";
import PublicProfilePage from "./pages/PublicProfilePage";
import BrowsePage from "./pages/BrowsePage";
import PricingPage from "./pages/PricingPage";
import BillingPage from "./pages/BillingPage";
import VaultPage from "./pages/VaultPage";
import AdminPage from "./pages/AdminPage";
import BetaFeedbackPage from "./pages/BetaFeedbackPage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import BlogPage from "./pages/BlogPage";
import WardrobePage from "./pages/WardrobePage";
import RestingPage from "./pages/RestingPage";
import StoryPage from "./pages/StoryPage";
// ThinkFreelyPage retired — replaced by Privacy Mode toggle in ChatInterface
import WorldPage from "./pages/WorldPage";
import PlansPage from "./pages/PlansPage";
import MyWorldPage from "./pages/MyWorldPage";
import PassportVaultPage from "./pages/PassportVaultPage";
import PersonalIntelPage from "./pages/PersonalIntelPage";
import BlueprintsPage from "./pages/BlueprintsPage";
import AwakeningPage from "./pages/AwakeningPage";


import ThreadsJoinPage from "./pages/ThreadsJoinPage";
import StorePage from "./pages/StorePage";
import CircleLobbyPage from "./pages/CircleLobbyPage";
import JoinPage from "./pages/JoinPage";
import OgCapture from "./pages/OgCapture";
import CertificatePage from "./pages/CertificatePage";
import KeyClaimPage from "./pages/KeyClaimPage";
import RemindersPage from "./pages/RemindersPage";
import { lazy, Suspense } from 'react';
const PWAInstallCelebration = lazy(() => import('./components/PWAInstallCelebration'));
import PreviewAuthGate from './components/PreviewAuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminRouteGuard } from './components/AdminRouteGuard';
import IncomingCallOverlay from './components/IncomingCallOverlay';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <ErrorBoundary name="App">
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={null}><PWAInstallCelebration /></Suspense>
        <PreviewAuthGate />
        <BrowserRouter>
          <IncomingCallOverlay />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/og" element={<OgCapture />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/key/:code" element={<KeyClaimPage />} />
            <Route element={<AppProvider><AppLayout /></AppProvider>}>
              <Route index element={<HomePage />} />
              <Route path="/threads" element={<FeedPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/settings" element={<SettingsPageRoute />} />
              <Route path="/browse" element={<BrowsePage />} />
              
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/wardrobe" element={<WardrobePage />} />
              {/* Think Freely retired — Privacy Mode is now in chat */}
              <Route path="/wellness" element={<WellnessPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/chat/:memberId" element={<ChatPage />} />
              <Route path="/profile/:username" element={<PublicProfilePage />} />
              
              <Route path="/studio" element={<StudioPage />} />
              <Route path="/awakening" element={<AwakeningPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/story" element={<StoryPage />} />
              <Route path="/world" element={<WorldPage />} />
              <Route path="/my-world" element={<MyWorldPage />} />
              <Route path="/passport" element={<PassportVaultPage />} />
              <Route path="/personal-intel" element={<PersonalIntelPage />} />
              <Route path="/blueprints" element={<BlueprintsPage />} />
              
              <Route path="/circles" element={<CirclesPage />} />
              <Route path="/circles/join/:code" element={<CircleJoinPage />} />
              <Route path="/circles/:id/lobby" element={<CircleLobbyPage />} />
              <Route path="/circles/:id" element={<CircleChatPage />} />
              <Route path="/admin" element={<AdminRouteGuard><AdminPage /></AdminRouteGuard>} />
              <Route path="/admin/feedback" element={<AdminRouteGuard><AdminFeedbackPage /></AdminRouteGuard>} />
              <Route path="/beta-feedback" element={<BetaFeedbackPage />} />
              <Route path="/certificate" element={<CertificatePage />} />
              <Route path="/resting" element={<RestingPage />} />
              <Route path="/threads/join/:code" element={<ThreadsJoinPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
