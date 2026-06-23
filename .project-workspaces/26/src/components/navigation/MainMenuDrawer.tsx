import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  DollarSign, 
  Clock, 
  Building2, 
  FileText, 
  TrendingDown,
  Target,
  Image,
  BarChart3,
  CreditCard,
  Briefcase,
  HelpCircle,
  GraduationCap,
  Users,
  MessageSquare,
  ChevronLeft,
  ChevronDown,
  X,
  Crown,
  Activity,
  Layers,
  CreditCard as CreditCardIcon,
  UserCheck,
  Flower2,
  Plus,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { NavigationService } from "@/lib/navigationConfig";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useFamilyStatus } from "@/hooks/useFamilyStatus";
import { FamilyOnboardingModal } from "@/components/family/FamilyOnboardingModal";
import { useProfessionalMode } from "@/contexts/ProfessionalModeContext";

interface MenuSection {
  title: string;
  titleColor?: string;
  items: MenuItem[];
  requiresAdmin?: boolean;
  requiresFamily?: boolean;
  isFamilySetup?: boolean;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  badge?: string;
  action?: () => void;
  premiumTip?: string;
}

// Base menu sections (non-family)
const baseMenuSections: MenuSection[] = [
  {
    title: "CORE FEATURES",
    items: [
      { icon: <Home className="h-5 w-5 text-blue-500" />, label: "Dashboard", route: "/dashboard" },
      { icon: <DollarSign className="h-5 w-5 text-emerald-500" />, label: "Transactions", route: "/transactions" },
      { icon: <Clock className="h-5 w-5 text-amber-500" />, label: "Budgets", route: "/budgets" },
      { icon: <Building2 className="h-5 w-5 text-indigo-500" />, label: "Accounts", route: "/accounts" },
      { icon: <FileText className="h-5 w-5 text-rose-500" />, label: "Bills", route: "/bills" },
      { icon: <TrendingDown className="h-5 w-5 text-red-500" />, label: "Debt Management", route: "/debts" },
    ],
  },
  {
    title: "PLANNING & GOALS",
    items: [
      { icon: <Target className="h-5 w-5 text-pink-500" />, label: "Goals", route: "/goals" },
      { icon: <Image className="h-5 w-5 text-violet-500" />, label: "Vision Board", route: "/vision-board" },
      { icon: <BarChart3 className="h-5 w-5 text-cyan-500" />, label: "Reports", route: "/reports" },
    ],
  },
  {
    title: "MONEY MANAGEMENT",
    items: [
      { icon: <CreditCard className="h-5 w-5 text-orange-500" />, label: "Credit Score", route: "/credit" },
      { icon: <Briefcase className="h-5 w-5 text-slate-500" />, label: "Advanced Tools", route: "/advanced" },
    ],
  },
  {
    title: "LEARNING & SUPPORT",
    items: [
      { icon: <HelpCircle className="h-5 w-5 text-teal-500" />, label: "Help Center", route: "/help-center" },
      { icon: <GraduationCap className="h-5 w-5 text-purple-500" />, label: "Money Academy", route: "/money-academy" },
      { icon: <UserCheck className="h-5 w-5 text-sky-500" />, label: "Financial Professionals", route: "/professionals" },
      { icon: <Flower2 className="h-5 w-5 text-fuchsia-500" />, label: "Bloom", route: "/coach", premiumTip: "Free: 3 uses/day" },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { icon: <Building2 className="h-5 w-5 text-primary" />, label: "Refer a Business", route: "/refer-business" },
    ],
  },
];

// Family sub-items for collapsible
const familySubItems: MenuItem[] = [
  { icon: <Users className="h-5 w-5 text-lime-500" />, label: "My Kids", route: "/kids" },
  { icon: <MessageSquare className="h-5 w-5 text-green-500" />, label: "Family Chat", route: "/kids/chat" },
  { icon: <Crown className="h-5 w-5 text-yellow-500" />, label: "KidsBloom Login", route: "/kidsbloom/login" },
];

const adminSection: MenuSection = {
  title: "ADMIN",
  titleColor: "text-red-500",
  requiresAdmin: true,
  items: [
    { icon: <Activity className="h-5 w-5 text-red-500" />, label: "Admin Panel", route: "/admin" },
  ],
};

interface MainMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function MainMenuDrawer({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: MainMenuDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [simpleMode, setSimpleMode] = useState(() => NavigationService.isSimpleModeEnabled());
  const [familyOnboardingOpen, setFamilyOnboardingOpen] = useState(false);
  
  // Get family status for conditional rendering
  const { hasFamily, kidCount } = useFamilyStatus();
  
  // Get feature flags
  const { isFeatureEnabled } = useFeatureFlags();
  
  // Get professional mode status
  const { isLinkedProfessional, isProfessionalMode, toggleProfessionalMode, loading: professionalLoading } = useProfessionalMode();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (!error && data) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Listen for Simple Mode changes
  useEffect(() => {
    const handleSimpleModeChange = () => {
      setSimpleMode(NavigationService.isSimpleModeEnabled());
    };

    window.addEventListener('coinsbloom_simple_mode_changed', handleSimpleModeChange);
    window.addEventListener('storage', handleSimpleModeChange);

    return () => {
      window.removeEventListener('coinsbloom_simple_mode_changed', handleSimpleModeChange);
      window.removeEventListener('storage', handleSimpleModeChange);
    };
  }, []);

  const handleNavigate = (route: string) => {
    // Handle family setup action
    if (route === "#family-setup") {
      setFamilyOnboardingOpen(true);
      return;
    }
    navigate(route);
    onClose();
  };

  if (!isOpen) return null;

  // Build menu sections dynamically (without family - handled separately)
  const menuSections: MenuSection[] = [
    ...baseMenuSections,
    adminSection,
  ];

  // Get Simple Mode paths for filtering
  const simpleModePaths = NavigationService.getSimpleModePaths();

  // Map menu routes to feature keys for filtering
  const routeToFeatureKey: Record<string, string> = {
    '/kids': 'kids',
    '/kids/chat': 'kids_chat',
    '/vision-board': 'vision_board',
    '/credit': 'credit',
    '/professionals': 'professionals',
    '/refer-business': 'refer_business',
    '/coach': 'coach',
  };

  // Filter family sub-items by feature flags
  const visibleFamilyItems = familySubItems.filter(item => {
    const featureKey = routeToFeatureKey[item.route];
    if (featureKey && !isFeatureEnabled(featureKey)) return false;
    return true;
  });

  const showFamilySection = isFeatureEnabled('kids');

  // Filter sections based on admin status, Simple Mode, and feature flags
  const visibleSections = menuSections
    .filter(section => {
      if (section.requiresAdmin) {
        return isAdmin;
      }
      return true;
    })
    .map(section => {
      const filteredItems = section.items.filter(item => {
        const featureKey = routeToFeatureKey[item.route];
        if (featureKey && !isFeatureEnabled(featureKey)) return false;
        if (simpleMode && section.title !== "FAMILY") {
          if (!simpleModePaths.includes(item.route)) return false;
        }
        return true;
      });
      return { ...section, items: filteredItems };
    })
    .filter(section => section.items.length > 0);


  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer with Obsidian glass surface — matches Bloom's premium feel without competing */}
      <div 
        className={cn(
          "fixed left-0 top-14 sm:top-16 h-[calc(100%-3.5rem)] sm:h-[calc(100%-4rem)] obsidian-surface z-50 transition-all duration-300 ease-out rounded-tr-3xl",
          isCollapsed ? "w-20" : "w-80"
        )}
      >
        {/* Header - gradient Menu text like reference */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          {!isCollapsed && <h2 className="text-xl font-bold bg-gradient-to-r from-[hsl(320,70%,55%)] to-[hsl(280,70%,50%)] bg-clip-text text-transparent">Menu</h2>}
          <div className="flex items-center gap-2 ml-auto">
            {onToggleCollapse && (
              <Button 
                size="icon"
                onClick={onToggleCollapse}
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(320,70%,55%)] to-[hsl(280,70%,50%)] hover:opacity-90 text-white border-0 shadow-md"
              >
                <ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed ? "rotate-180" : "")} />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="text-foreground hover:bg-muted h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-5rem)] pb-8">
          <TooltipProvider delayDuration={300}>
          <div className="p-4 space-y-6 pb-20">
            {/* Professional Mode Toggle - Only shown for linked professionals when feature flag is enabled */}
            {!professionalLoading && isLinkedProfessional && !isCollapsed && isFeatureEnabled('professional_mode') && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isProfessionalMode ? (
                      <Briefcase className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {isProfessionalMode ? "Professional Mode" : "Personal Mode"}
                    </span>
                  </div>
                  <Switch
                    checked={isProfessionalMode}
                    onCheckedChange={toggleProfessionalMode}
                    className="scale-90"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {isProfessionalMode 
                    ? "Viewing your professional dashboard" 
                    : "Switch to view referrals & stats"}
                </p>
              </div>
            )}
            
            {visibleSections.filter(s => !s.requiresAdmin).map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <h3 className={cn(
                    "obsidian-section-label mb-2 px-1 flex items-center gap-1.5",
                    section.titleColor
                  )}>
                    {section.title === "ADMIN" && <Crown className="h-3 w-3" />}
                    {section.title}
                  </h3>
                )}
                {!isCollapsed && (
                  <div className="h-px bg-amber-500/10 mb-2 mx-1" />
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.route;
                    return (
                      <button
                        key={item.route}
                        onClick={() => handleNavigate(item.route)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left",
                          isActive 
                            ? "obsidian-row-active text-foreground font-medium" 
                            : "hover:bg-foreground/5 text-foreground",
                          isCollapsed && "justify-center px-2"
                        )}
                      >
                        <span className="flex-shrink-0">
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <>
                            <span className={cn("text-[15px]", !item.premiumTip && "flex-1")}>{item.label}</span>
                            {item.premiumTip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex-shrink-0 ml-1.5">
                                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">
                                  <p>{item.premiumTip}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className="flex-1" />
                            {item.badge && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Collapsible Family Section */}
            {showFamilySection && isCollapsed && (
              <button
                onClick={() => handleNavigate('/kids')}
                className={cn(
                  "w-full flex items-center justify-center px-2 py-3 rounded-lg transition-colors",
                  location.pathname.startsWith('/kids')
                    ? "bg-[hsl(270,70%,95%)] text-[hsl(270,70%,50%)] font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <Users className="h-5 w-5 text-lime-500" />
              </button>
            )}
            {showFamilySection && !isCollapsed && (
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-foreground transition-colors text-left w-full">
                    <span className="flex-shrink-0">
                      <Users className="h-5 w-5 text-lime-500" />
                    </span>
                    <span className="text-[15px] font-medium text-left">Family</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-shrink-0 ml-1.5">
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <p>Free: up to 2 kids</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="flex-1" />
                    {hasFamily && kidCount > 0 && (
                      <span className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        {kidCount} {kidCount === 1 ? 'kid' : 'kids'}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 space-y-0.5 mt-1 border-l-2 border-border/50 pl-3">
                    {hasFamily ? (
                      visibleFamilyItems.map((item) => {
                        const isActive = location.pathname === item.route;
                        return (
                          <button
                            key={item.route}
                            onClick={() => handleNavigate(item.route)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left text-sm",
                              isActive 
                                ? "bg-[hsl(270,70%,95%)] text-[hsl(270,70%,50%)] font-medium" 
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                          </button>
                        );
                      })
                    ) : (
                      <button
                        onClick={() => setFamilyOnboardingOpen(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground transition-colors text-left text-sm"
                      >
                        <span className="flex-shrink-0">
                          <Sparkles className="h-5 w-5 text-purple-500" />
                        </span>
                        <span className="flex-1">Set Up Family</span>
                      </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Admin Section - always last */}
            {visibleSections.filter(s => s.requiresAdmin).map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <h3 className={cn(
                    "text-xs font-semibold tracking-wider mb-3 px-1 flex items-center gap-1",
                    section.titleColor || "text-muted-foreground"
                  )}>
                    <ChevronLeft className="h-3 w-3 opacity-50" />
                    <Crown className="h-3.5 w-3.5" />
                    {section.title}
                  </h3>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.route;
                    return (
                      <button
                        key={item.route}
                        onClick={() => handleNavigate(item.route)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left",
                          isActive 
                            ? "bg-[hsl(270,70%,95%)] text-[hsl(270,70%,50%)] font-medium" 
                            : "hover:bg-muted text-foreground",
                          isCollapsed && "justify-center px-2"
                        )}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        {!isCollapsed && (
                          <span className="flex-1 text-[15px]">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          </TooltipProvider>
        </ScrollArea>
      </div>
      
      {/* Family Onboarding Modal */}
      <FamilyOnboardingModal 
        open={familyOnboardingOpen} 
        onOpenChange={(open) => {
          setFamilyOnboardingOpen(open);
          if (!open) onClose();
        }}
      />
    </>
  );
}

export default MainMenuDrawer;