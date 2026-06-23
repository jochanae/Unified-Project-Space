import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  LayoutDashboard,
  BookOpen,
  Calculator,
  LineChart,
  Sparkles,
  FileDown,
  Crown,
  Target,
  BarChart3,
  Bell,
  Users,
  Lock,
  ClipboardList,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Settings,
  ChevronLeft,
  X,
} from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useCommunityEnabled } from "@/hooks/useCommunityEnabled";
import { cn } from "@/lib/utils";
import intoiqLogo from "@/assets/intoiq-logo.png";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredTier?: "pro";
  prompt?: string;
};

const mainNavItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Ask Quinn", url: "/mentor", icon: MessageSquare },
  { title: "My Money Plan", url: "/plan", icon: ClipboardList },
  { title: "Learn", url: "/learn", icon: BookOpen },
];

const wealthNavItems: NavItem[] = [
  { title: "Retirement", url: "/mentor", icon: Landmark, prompt: "Tell me about retirement planning." },
  { title: "My Finances", url: "/my-finances", icon: PiggyBank, requiredTier: "pro" },
  { title: "Insurance", url: "/mentor", icon: ShieldCheck, prompt: "What types of insurance should I have?" },
];

const toolsNavItems: NavItem[] = [
  { title: "Trade Journal", url: "/journal", icon: BookOpen },
  { title: "Analytics", url: "/analytics", icon: BarChart3, requiredTier: "pro" },
  { title: "Options Calc", url: "/calculator", icon: Calculator },
  { title: "Paper Trading", url: "/youth-mode", icon: LineChart },
  { title: "Price Alerts", url: "/reminders", icon: Bell },
  { title: "Import Trades", url: "/broker-import-guide", icon: FileDown },
];

const staticResourceNavItems: NavItem[] = [
  { title: "Community", url: "/community", icon: Users, badge: "New" },
  { title: "Strategies", url: "/strategies", icon: Target },
];

const bottomNavItems: NavItem[] = [
  { title: "Youth Mode", url: "/youth-mode", icon: Sparkles, badge: "Fun" },
  { title: "Settings", url: "/settings", icon: Settings },
];

type Section = { label: string; items: NavItem[] };
const staticSections: Section[] = [
  { label: "CORE FEATURES", items: mainNavItems },
  { label: "WEALTH & PLANNING", items: wealthNavItems },
  { label: "TOOLS", items: toolsNavItems },
  { label: "RESOURCES", items: staticResourceNavItems },
  { label: "MORE", items: bottomNavItems },
];

interface MobileMenuDrawerProps {
  isOpen: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, isExpanded, onToggleExpand, onClose }: MobileMenuDrawerProps) {
  const location = useLocation();
  const { subscriptionTier } = useFeatureAccess();
  const { enabled: communityEnabled } = useCommunityEnabled();

  const sections = staticSections.map((section) =>
    section.label === "RESOURCES"
      ? { ...section, items: section.items.filter((i) => i.url !== '/community' || communityEnabled) }
      : section
  );

  if (!isOpen) return null;

  const isActive = (url: string) => location.pathname === url;
  const tierHierarchy = { free: 0, pro: 1 };
  const isLocked = (requiredTier?: "pro") => {
    if (!requiredTier) return false;
    return tierHierarchy[subscriptionTier] < tierHierarchy[requiredTier];
  };

  const handleNavClick = (item: NavItem) => {
    onClose();
  };

  // All items flat for icon-rail
  const allItems = sections.flatMap((s) => s.items);

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col bg-card border-r border-border/50 shadow-xl transition-all duration-300 ease-in-out",
          isExpanded ? "w-72" : "w-[72px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border/30 min-h-[64px]">
          {isExpanded ? (
            <>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground shrink-0 ml-auto"
                onClick={onToggleExpand}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground mx-auto"
              onClick={onToggleExpand}
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          )}
        </div>

        {/* Expanded title */}
        {isExpanded && (
          <div className="px-4 pt-3 pb-1">
            <h2 className="text-lg font-bold text-primary">Menu</h2>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {isExpanded ? (
            /* Full expanded menu with sections */
            sections.map((section) => (
              <div key={section.label} className="mb-3">
                <div className="px-4 py-1.5 flex items-center gap-1">
                  <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </span>
                </div>
                {section.items.map((item) => (
                  <Link
                    key={item.title + item.url}
                    to={item.url}
                    state={item.prompt ? { prompt: item.prompt } : undefined}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-200",
                      isActive(item.url)
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-accent",
                      isLocked(item.requiredTier) && "opacity-60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-9 w-9 rounded-lg shrink-0",
                        isActive(item.url) ? "bg-primary/15" : "bg-muted/50"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm">{item.title}</span>
                    {item.requiredTier && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 gap-0.5"
                      >
                        {isLocked(item.requiredTier) && <Lock className="h-2.5 w-2.5" />}
                        <Crown className="h-3 w-3" />
                      </Badge>
                    )}
                    {item.badge && !item.requiredTier && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 bg-chart-2/20 text-chart-2 text-[10px] px-1.5"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            ))
          ) : (
            /* Collapsed icon-rail */
            <div className="flex flex-col items-center gap-1 px-1">
              {allItems.map((item) => (
                <Link
                  key={item.title + item.url}
                  to={item.url}
                  state={item.prompt ? { prompt: item.prompt } : undefined}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-200",
                    isActive(item.url)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={item.title}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
