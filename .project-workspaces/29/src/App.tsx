import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppFooter } from "@/components/footer/AppFooter";
import { KeyboardShortcutsProvider } from "@/components/shortcuts/KeyboardShortcutsProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Mentor from "./pages/Mentor";
import Journal from "./pages/Journal";
import PaperTrading from "./pages/PaperTrading";
import KidMode from "./pages/KidMode";
import OptionsCalculator from "./pages/OptionsCalculator";
import BrokerImportGuide from "./pages/BrokerImportGuide";
import Learn from "./pages/Learn";
import Admin from "./pages/Admin";
import Strategies from "./pages/Strategies";
import Reminders from "./pages/Reminders";
import Analytics from "./pages/Analytics";
import Community from "./pages/Community";
import Plan from "./pages/Plan";
import NotFound from "./pages/NotFound";
import PositionSizeCalculator from "./pages/tools/PositionSizeCalculator";
import RiskRewardCalculator from "./pages/tools/RiskRewardCalculator";
import CompoundCalculator from "./pages/tools/CompoundCalculator";
import MarginCalculator from "./pages/tools/MarginCalculator";
import Notepad from "./pages/tools/Notepad";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import InteractiveLearning from "./pages/InteractiveLearning";
import Terms from "./pages/Terms";
import MyFinances from "./pages/MyFinances";
import BetaTest from "./pages/BetaTest";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
// Redirect components for legacy routes
function RedirectToLearnTab({ tab }: { tab: string }) {
  return <Navigate to={`/learn?tab=${tab}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <KeyboardShortcutsProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/beta-test" element={<BetaTest />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/youth-mode" element={<ProtectedRoute><KidMode /></ProtectedRoute>} />
                <Route path="/kid-mode" element={<Navigate to="/youth-mode" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mentor"
                  element={
                    <ProtectedRoute>
                      <Mentor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/journal"
                  element={
                    <ProtectedRoute>
                      <Journal />
                    </ProtectedRoute>
                  }
                />
                <Route path="/paper-trading" element={<Navigate to="/youth-mode" replace />} />
                <Route
                  path="/calculator"
                  element={
                    <ProtectedRoute>
                      <OptionsCalculator />
                    </ProtectedRoute>
                  }
                />
                {/* Trading Tools */}
                <Route
                  path="/tools/position-size"
                  element={
                    <ProtectedRoute>
                      <PositionSizeCalculator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tools/risk-reward"
                  element={
                    <ProtectedRoute>
                      <RiskRewardCalculator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tools/compound"
                  element={
                    <ProtectedRoute>
                      <CompoundCalculator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tools/margin"
                  element={
                    <ProtectedRoute>
                      <MarginCalculator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tools/notepad"
                  element={
                    <ProtectedRoute>
                      <Notepad />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/broker-import-guide"
                  element={
                    <ProtectedRoute>
                      <BrokerImportGuide />
                    </ProtectedRoute>
                  }
                />
                {/* Legacy redirect */}
                <Route path="/linked-accounts" element={<Navigate to="/broker-import-guide" replace />} />
                <Route
                  path="/learn"
                  element={
                    <ProtectedRoute>
                      <Learn />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/strategies"
                  element={
                    <ProtectedRoute>
                      <Strategies />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/learn/interactive"
                  element={
                    <ProtectedRoute>
                      <InteractiveLearning />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reminders"
                  element={
                    <ProtectedRoute>
                      <Reminders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute requiredTier="pro">
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                {/* Community route */}
                <Route
                  path="/community"
                  element={
                    <ProtectedRoute>
                      <Community />
                    </ProtectedRoute>
                  }
                />
                {/* My Plan route */}
                <Route
                  path="/plan"
                  element={
                    <ProtectedRoute>
                      <Plan />
                    </ProtectedRoute>
                  }
                />
                {/* My Finances route */}
                <Route
                  path="/my-finances"
                  element={
                    <ProtectedRoute>
                      <MyFinances />
                    </ProtectedRoute>
                  }
                />
                {/* Settings route */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                {/* Admin route */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                {/* Redirect legacy routes to Learning Hub tabs */}
                <Route path="/resources" element={<RedirectToLearnTab tab="resources" />} />
                <Route path="/glossary" element={<RedirectToLearnTab tab="glossary" />} />
                <Route path="/videos" element={<RedirectToLearnTab tab="videos" />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
              <AppFooter />
              <InstallPrompt />
            </KeyboardShortcutsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
