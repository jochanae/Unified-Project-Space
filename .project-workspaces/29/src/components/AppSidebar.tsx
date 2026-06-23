import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
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
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useCommunityEnabled } from "@/hooks/useCommunityEnabled";
import intoiqLogo from "@/assets/intoiq-logo.png";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredTier?: 'pro';
  prompt?: string;
};

const mainNavItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Ask Quinn", url: "/mentor", icon: MessageSquare },
  { title: "My Plans", url: "/plan", icon: ClipboardList },
  { title: "Learn", url: "/learn", icon: BookOpen },
];

const wealthNavItems: NavItem[] = [
  { title: "Retirement Planning", url: "/mentor", icon: Landmark, prompt: "Tell me about retirement planning. What should I know about 401(k)s, IRAs, and building a retirement strategy?" },
  { title: "My Finances", url: "/my-finances", icon: PiggyBank, requiredTier: 'pro' },
  { title: "Insurance & Protection", url: "/mentor", icon: ShieldCheck, prompt: "What types of insurance should I have to protect my wealth? Tell me about life, health, disability, and property insurance." },
];

const toolsNavItems: NavItem[] = [
  { title: "Trade Journal", url: "/journal", icon: BookOpen },
  { title: "Analytics", url: "/analytics", icon: BarChart3, requiredTier: 'pro' },
  { title: "Options Calculator", url: "/calculator", icon: Calculator },
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

export function AppSidebar() {
  const location = useLocation();
  const { isMobile, state, setOpen, open, setOpenMobile } = useSidebar();
  const { subscriptionTier } = useFeatureAccess();
  const { enabled: communityEnabled } = useCommunityEnabled();

  const resourceNavItems = staticResourceNavItems.filter(
    (item) => item.url !== '/community' || communityEnabled
  );

  const isCollapsed = state === "collapsed" && !isMobile;

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (url: string) => location.pathname === url;

  const tierHierarchy = { free: 0, pro: 1 };
  
  const isLocked = (requiredTier?: 'pro') => {
    if (!requiredTier) return false;
    return tierHierarchy[subscriptionTier] < tierHierarchy[requiredTier];
  };

  const TierBadge = ({ requiredTier }: { requiredTier: 'pro' }) => {
    if (isCollapsed) return null;
    const locked = isLocked(requiredTier);
    
    return (
      <Badge
        variant="secondary"
        className="ml-auto h-5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 gap-0.5"
      >
        {locked && <Lock className="h-2.5 w-2.5" />}
        <Crown className="h-3 w-3" />
        Pro
      </Badge>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      {/* Header with logo */}
      <SidebarHeader className="border-b border-sidebar-border/50 px-4 py-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 group"
          onClick={handleNavClick}
        >
          <img 
            src={intoiqLogo} 
            alt="IntoIQ" 
            className="h-11 w-auto rounded-lg transition-transform duration-300 group-hover:scale-105 group-data-[collapsible=icon]:h-8"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group/item transition-all duration-200"
                  >
                    <Link to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4 transition-colors group-hover/item:text-primary" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Wealth & Planning */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3">
            Wealth & Planning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {wealthNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`group/item transition-all duration-200 ${isLocked(item.requiredTier) ? 'opacity-70' : ''}`}
                  >
                    <Link
                      to={item.url}
                      state={item.prompt ? { prompt: item.prompt } : undefined}
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-4 transition-colors group-hover/item:text-primary" />
                      <span>{item.title}</span>
                      {!isCollapsed && (item.requiredTier ? (
                        <TierBadge requiredTier={item.requiredTier} />
                      ) : (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-5 bg-primary/10 text-primary text-[10px] px-1.5"
                        >
                          Quinn
                        </Badge>
                      ))}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`group/item transition-all duration-200 ${isLocked(item.requiredTier) ? 'opacity-70' : ''}`}
                  >
                    <Link to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4 transition-colors group-hover/item:text-primary" />
                      <span>{item.title}</span>
                      {!isCollapsed && item.requiredTier && <TierBadge requiredTier={item.requiredTier} />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3">
            Resources
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourceNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`group/item transition-all duration-200 ${isLocked(item.requiredTier) ? 'opacity-70' : ''}`}
                  >
                    <Link to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4 transition-colors group-hover/item:text-primary" />
                      <span>{item.title}</span>
                      {!isCollapsed && (item.requiredTier ? (
                        <TierBadge requiredTier={item.requiredTier} />
                      ) : item.badge ? (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-5 bg-chart-2/20 text-chart-2 text-[10px] px-1.5"
                        >
                          {item.badge}
                        </Badge>
                      ) : null)}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom items */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group/item transition-all duration-200"
                  >
                    <Link to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4 transition-colors group-hover/item:text-chart-3" />
                      <span>{item.title}</span>
                      {!isCollapsed && item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-5 bg-chart-3/20 text-chart-3 text-[10px] px-1.5"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Collapse toggle footer (desktop only) */}
      {!isMobile && (
        <SidebarFooter className="border-t border-sidebar-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(!open)}
            className="w-full justify-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
