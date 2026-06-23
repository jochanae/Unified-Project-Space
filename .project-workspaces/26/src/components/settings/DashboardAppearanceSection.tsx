import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Grid3X3, Eye, RotateCcw, Save, 
  GripVertical, Sparkles, Monitor, Info, EyeOff, RefreshCcw,
  Zap, Layers, MessageSquareQuote, ListChecks, Maximize, Square, RectangleHorizontal
} from 'lucide-react';
import { getLayoutMode, setLayoutMode, type LayoutMode } from '@/components/layout/ResponsiveContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const HIDDEN_CARDS_KEY = "coinsbloom_hidden_cards";
const SHOW_NAV_ARROWS_KEY = "coinsbloom_show_nav_arrows";
const SHOW_FLOATING_MIC_KEY = "coinsbloom_show_floating_mic";
const SIMPLE_MODE_KEY = "coinsbloom_simple_mode";
const QUOTES_HIDDEN_KEY = "coinsbloom_quotes_hidden";

// Core cards shown in Simple Mode (basic budgeting experience)
const SIMPLE_MODE_CARDS = ['quickActions', 'financialOverview', 'budgets', 'expenses', 'savings', 'bills'];

const DASHBOARD_CARDS = [
  { id: 'professionals', label: 'Financial Professionals', isAdvanced: true },
  { id: 'quickActions', label: 'Quick Actions', isAdvanced: false },
  { id: 'financialOverview', label: 'Financial Overview', isAdvanced: false },
  { id: 'budgets', label: 'Budget Overview', isAdvanced: false },
  { id: 'expenses', label: 'Spending & Transactions', isAdvanced: false },
  { id: 'savings', label: 'Goals', isAdvanced: false },
  { id: 'bills', label: 'Upcoming Bills', isAdvanced: false },
  { id: 'insights', label: 'Smart Insights', isAdvanced: true },
  { id: 'aiCoach', label: 'Bloom', isAdvanced: true },
  { id: 'bloomBursts', label: 'Bloom Bursts', isAdvanced: true },
  { id: 'investments', label: 'Investment Portfolio', isAdvanced: true },
  { id: 'tax', label: 'Tax Optimization', isAdvanced: true },
  { id: 'smsTracker', label: 'SMS Tracker', isAdvanced: true },
  { id: 'myKids', label: 'My Kids', isAdvanced: true },
  { id: 'news', label: 'Financial News', isAdvanced: true },
  { id: 'currency', label: 'Currency Breakdown', isAdvanced: true },
];

export function DashboardAppearanceSection() {
  const { toast } = useToast();
  const [showNavArrows, setShowNavArrows] = useState(() => {
    const saved = localStorage.getItem(SHOW_NAV_ARROWS_KEY);
    return saved !== "false";
  });
  const [showFloatingMic, setShowFloatingMic] = useState(() => {
    const saved = localStorage.getItem(SHOW_FLOATING_MIC_KEY);
    return saved === "true"; // Default OFF — user can enable in settings
  });
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [simpleMode, setSimpleMode] = useState(() => {
    const saved = localStorage.getItem(SIMPLE_MODE_KEY);
    return saved === "true";
  });
  const [showQuotes, setShowQuotes] = useState(() => {
    return localStorage.getItem(QUOTES_HIDDEN_KEY) !== "true";
  });
  const [currentLayoutMode, setCurrentLayoutMode] = useState<LayoutMode>(getLayoutMode);

  // Load hidden cards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(HIDDEN_CARDS_KEY);
    if (saved) {
      try {
        setHiddenCards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse hidden cards", e);
      }
    }
  }, []);

  // Persist nav arrows and mic settings
  const handleNavArrowsChange = (value: boolean) => {
    setShowNavArrows(value);
    localStorage.setItem(SHOW_NAV_ARROWS_KEY, String(value));
    toast({ 
      title: value ? 'Navigation Arrows Enabled' : 'Navigation Arrows Disabled',
      description: value ? 'Swipe arrows are now visible' : 'Swipe arrows are now hidden'
    });
  };

  const handleFloatingMicChange = (value: boolean) => {
    setShowFloatingMic(value);
    localStorage.setItem(SHOW_FLOATING_MIC_KEY, String(value));
    // Also clear the dismiss flag when enabling
    if (value) {
      localStorage.removeItem('voice-fab-dismissed');
    }
    toast({ 
      title: value ? 'Voice Microphone Enabled' : 'Voice Microphone Disabled',
      description: value ? 'Floating microphone is now visible' : 'Floating microphone is now hidden'
    });
  };

  const handleQuotesChange = (value: boolean) => {
    setShowQuotes(value);
    if (value) {
      localStorage.removeItem(QUOTES_HIDDEN_KEY);
    } else {
      localStorage.setItem(QUOTES_HIDDEN_KEY, "true");
    }
    toast({ 
      title: value ? 'Inspirational Quotes Enabled' : 'Inspirational Quotes Hidden',
      description: value ? 'Quotes are now visible on the dashboard' : 'Quotes are now hidden from the dashboard'
    });
  };

  const handleLayoutModeChange = (mode: LayoutMode) => {
    setCurrentLayoutMode(mode);
    setLayoutMode(mode);
    toast({ 
      title: `Layout: ${mode === 'centered' ? 'Centered' : mode === 'wider' ? 'Wider' : 'Full Screen'}`,
      description: mode === 'full' ? 'Content now fills your entire screen' : mode === 'wider' ? 'Content container expanded to 1600px' : 'Content centered at 1152px'
    });
  };

  const handleSimpleModeChange = (value: boolean) => {
    setSimpleMode(value);
    localStorage.setItem(SIMPLE_MODE_KEY, String(value));
    
    if (value) {
      // In Simple Mode, hide all advanced cards
      const advancedCardIds = DASHBOARD_CARDS.filter(c => c.isAdvanced).map(c => c.id);
      setHiddenCards(advancedCardIds);
      localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify(advancedCardIds));
    } else {
      // When turning off Simple Mode, restore all cards
      setHiddenCards([]);
      localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify([]));
    }
    
    // Dispatch event to notify navigation components
    window.dispatchEvent(new CustomEvent('coinsbloom_simple_mode_changed'));
    
    toast({ 
      title: value ? 'Simple Mode Enabled' : 'Full Mode Restored',
      description: value 
        ? 'Navigation and dashboard now show core finance features only. Return to Settings → Dashboard to restore full mode anytime.' 
        : 'All features and pages are now available'
    });
  };

  const visibleCount = DASHBOARD_CARDS.length - hiddenCards.length;
  const allVisible = hiddenCards.length === 0;

  const handleToggleCard = (cardId: string) => {
    let newHiddenCards: string[];
    if (hiddenCards.includes(cardId)) {
      newHiddenCards = hiddenCards.filter(id => id !== cardId);
    } else {
      newHiddenCards = [...hiddenCards, cardId];
    }
    setHiddenCards(newHiddenCards);
    localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify(newHiddenCards));
  };

  const handleRestoreAllCards = () => {
    setHiddenCards([]);
    localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify([]));
    toast({ title: 'Cards Restored', description: 'All dashboard cards are now visible' });
  };

  const handleSavePreferences = () => {
    toast({ title: 'Saved', description: 'Interface preferences saved successfully' });
  };

  const handleResetDashboard = () => {
    setShowNavArrows(true);
    setShowFloatingMic(false);
    setShowQuotes(true);
    setSimpleMode(false);
    setHiddenCards([]);
    setCurrentLayoutMode('centered');
    setLayoutMode('centered');
    localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify([]));
    localStorage.setItem(SHOW_NAV_ARROWS_KEY, "true");
    localStorage.setItem(SHOW_FLOATING_MIC_KEY, "false");
    localStorage.setItem(SIMPLE_MODE_KEY, "false");
    localStorage.removeItem(QUOTES_HIDDEN_KEY);
    toast({ title: 'Reset Complete', description: 'Dashboard restored to default settings' });
  };

  return (
    <div className="space-y-6">
      {/* Simple Mode Toggle - Most Prominent */}
      <Card className={simpleMode ? "border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${simpleMode ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-purple-100 dark:bg-purple-900/30"}`}>
                {simpleMode ? <Zap className="h-6 w-6 text-emerald-600" /> : <Layers className="h-6 w-6 text-purple-600" />}
              </div>
              <div>
                <h3 className="text-xl font-bold">{simpleMode ? "Simple Mode" : "Full Mode"}</h3>
                <p className="text-sm text-muted-foreground">
                  {simpleMode 
                    ? "Core budgeting features only — clean & focused" 
                    : "All features enabled — full financial platform"
                  }
                </p>
              </div>
            </div>
            <Switch 
              checked={simpleMode}
              onCheckedChange={handleSimpleModeChange}
            />
          </div>
          
          <div className={`p-4 rounded-lg ${simpleMode ? "bg-emerald-100/50 dark:bg-emerald-900/20" : "bg-purple-100/50 dark:bg-purple-900/20"}`}>
            <p className="text-sm font-medium mb-2">{simpleMode ? "Simple Mode includes:" : "Full Mode includes everything:"}</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              {simpleMode ? (
                <>
                  <span>• Budgets</span>
                  <span>• Transactions</span>
                  <span>• Bills</span>
                  <span>• Goals</span>
                  <span>• Financial Overview</span>
                  <span>• Quick Actions</span>
                </>
              ) : (
                <>
                  <span>• All basic features</span>
                  <span>• AI Coach</span>
                  <span>• Investments</span>
                  <span>• Tax Tools</span>
                  <span>• Kids Features</span>
                  <span>• And more...</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">Display & Preferences</h2>
          <p className="text-muted-foreground">Customize your screen layout, navigation, and visual experience</p>
        </CardContent>
      </Card>


      {/* Interface Preferences */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-1">Interface Preferences</h3>
            <p className="text-muted-foreground text-sm">Customize how CoinsBloom appears and behaves</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Navigation & Controls</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <span className="font-medium">Show Navigation Arrows</span>
                  <p className="text-sm text-muted-foreground">Draggable arrows for swiping between pages</p>
                </div>
                <Switch 
                  checked={showNavArrows} 
                  onCheckedChange={handleNavArrowsChange}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <span className="font-medium">Show Floating Microphone</span>
                  <p className="text-sm text-muted-foreground">Voice-activated commands and navigation</p>
                </div>
                <Switch 
                  checked={showFloatingMic} 
                  onCheckedChange={handleFloatingMicChange}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquareQuote className="h-5 w-5 text-amber-600" />
                  <div>
                    <span className="font-medium">Show Inspirational Quotes</span>
                    <p className="text-sm text-muted-foreground">Daily motivational quotes on your dashboard</p>
                  </div>
                </div>
                <Switch 
                  checked={showQuotes} 
                  onCheckedChange={handleQuotesChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Layout Mode */}
          <div>
            <h4 className="font-semibold mb-2">Screen Layout</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how content fills your screen — great for ultra-wide monitors
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { mode: 'centered' as LayoutMode, label: 'Centered', desc: '1152px', icon: Square },
                { mode: 'wider' as LayoutMode, label: 'Wider', desc: '1600px', icon: RectangleHorizontal },
                { mode: 'full' as LayoutMode, label: 'Full Screen', desc: 'Edge to edge', icon: Maximize },
              ]).map(({ mode, label, desc, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => handleLayoutModeChange(mode)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    currentLayoutMode === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[11px] opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSavePreferences}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Reset Preferences */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-lg">Reset Preferences</h3>
          <p className="text-muted-foreground text-sm">
            Reset all display and preference settings to defaults.
          </p>
          <Button 
            variant="outline"
            onClick={handleResetDashboard}
            className="border-purple-300 text-purple-600"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Reset Welcome Checklist */}
      <Card className="border-emerald-200 dark:border-emerald-800/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-lg">Welcome Checklist</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Reset your welcome checklist progress to see it again on the dashboard. This clears all completed steps.
          </p>
          
          <Button 
            variant="outline"
            onClick={() => {
              localStorage.removeItem('coinsbloom_checklist_hidden');
              localStorage.removeItem('dashboard_customized');
              localStorage.removeItem('visited_bloom_coach');
              localStorage.removeItem('coinsbloom_checklist_preview_mode');
              window.dispatchEvent(new CustomEvent('coinsbloom_reset_welcome_checklist'));
              toast({ 
                title: 'Checklist Reset', 
                description: 'Your welcome checklist has been reset. Visit your dashboard to see it again.' 
              });
            }}
            className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reset Checklist
          </Button>
        </CardContent>
      </Card>

      {/* Install App */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-bold text-lg">Install App</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Install CoinsBloom as a standalone app on your device for quicker access and offline support
          </p>
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Installation is not yet available. Chrome requires you to spend at least 30 seconds on the site before allowing app installation. Keep browsing and the install option will appear soon!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}