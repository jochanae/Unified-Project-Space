import { useState } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileMenuDrawer } from "@/components/navigation/MobileMenuDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserAvatarMenu } from "@/components/header/UserAvatarMenu";
import { HeaderToolbar } from "@/components/header/HeaderToolbar";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { useIsMobile } from "@/hooks/use-mobile";
import intoiqLogo from "@/assets/intoiq-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { toggleSidebar, openMobile } = useSidebar();
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile custom drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState(false);

  const isMenuOpen = isMobile && mobileMenuOpen;

  const handleMenuToggle = () => {
    if (isMobile) {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        setMobileMenuExpanded(false);
      } else {
        setMobileMenuOpen(true);
        setMobileMenuExpanded(true); // Start fully expanded
      }
    } else {
      toggleSidebar();
    }
  };

  const handleMobileClose = () => {
    setMobileMenuOpen(false);
    setMobileMenuExpanded(false);
  };

  return (
    <div className="flex h-screen w-full">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Mobile custom drawer */}
      {isMobile && (
        <MobileMenuDrawer
          isOpen={mobileMenuOpen}
          isExpanded={mobileMenuExpanded}
          onToggleExpand={() => setMobileMenuExpanded(!mobileMenuExpanded)}
          onClose={handleMobileClose}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0">
          <header
            className={`flex h-[72px] items-center justify-between gap-1 sm:gap-2 backdrop-blur-xl px-2 sm:px-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border-b border-border/30 relative z-20 transition-all duration-300 ${
              isMenuOpen
                ? "bg-foreground/10 dark:bg-foreground/20 rounded-b-none"
                : "bg-card/90 rounded-b-2xl"
            }`}
          >
            {/* Left side */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenuToggle}
                className="text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex flex-col items-center gap-0.5 h-auto py-2 px-2 sm:px-3 shrink-0"
              >
                {isMenuOpen ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
                <span className="text-xs font-medium hidden xs:block">
                  {isMenuOpen ? "Close" : "Menu"}
                </span>
              </Button>

              <Link to="/dashboard" className="flex items-center shrink-0">
                <img
                  src={intoiqLogo}
                  alt="IntoIQ"
                  className="h-12 sm:h-16 w-auto rounded-md"
                />
              </Link>

              <NotificationBell />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setToolbarOpen(!toolbarOpen)}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 h-9 px-2.5"
              >
                {toolbarOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {toolbarOpen ? "Hide" : "Tools"}
                </span>
              </Button>

              <ThemeToggle />
              <UserAvatarMenu />
            </div>

            <GlobalSearchModal />
          </header>

          <HeaderToolbar isOpen={toolbarOpen} />
        </div>

        <OfflineBanner />

        <main className="flex-1 overflow-auto bg-background pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
