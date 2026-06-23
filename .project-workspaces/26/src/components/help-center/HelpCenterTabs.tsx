import { Play, LayoutGrid, BookOpen, Crown, Calculator, HelpCircle, Download, Shield } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { StartTab } from "./tabs/StartTab";
import { PagesTab } from "./tabs/PagesTab";
import { FeaturesTab } from "./tabs/FeaturesTab";
import { PlansTab } from "./tabs/PlansTab";
import { ToolsTab } from "./tabs/ToolsTab";
import { FAQsTab } from "./tabs/FAQsTab";
import { AppTab } from "./tabs/AppTab";
import { PrivacyTab } from "./tabs/PrivacyTab";

interface HelpCenterTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery?: string;
}

const tabs = [
  { id: "start", label: "Start", icon: Play },
  { id: "pages", label: "Pages", icon: LayoutGrid },
  { id: "features", label: "Features", icon: BookOpen },
  { id: "plans", label: "Plans", icon: Crown },
  { id: "tools", label: "Tools", icon: Calculator },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
  { id: "app", label: "App", icon: Download },
  { id: "privacy", label: "Privacy", icon: Shield },
];

export const HelpCenterTabs = ({ activeTab, setActiveTab, searchQuery = "" }: HelpCenterTabsProps) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case "start":
        return <StartTab searchQuery={searchQuery} />;
      case "pages":
        return <PagesTab searchQuery={searchQuery} />;
      case "features":
        return <FeaturesTab searchQuery={searchQuery} />;
      case "plans":
        return <PlansTab searchQuery={searchQuery} />;
      case "tools":
        return <ToolsTab searchQuery={searchQuery} />;
      case "faqs":
        return <FAQsTab searchQuery={searchQuery} />;
      case "app":
        return <AppTab searchQuery={searchQuery} />;
      case "privacy":
        return <PrivacyTab searchQuery={searchQuery} />;
      default:
        return <StartTab searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="px-4">
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Tab Content */}
        <div className="mt-4">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
