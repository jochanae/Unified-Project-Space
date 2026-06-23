import { useState } from "react";
import { Shield, Percent, FileText, Heart, Calculator } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InsuranceTab } from "./tabs/InsuranceTab";
import { DTITab } from "./tabs/DTITab";
import { BusinessTab } from "./tabs/BusinessTab";
import { CharityTab } from "./tabs/CharityTab";
import { TaxTab } from "./tabs/TaxTab";

const tabs = [
  { value: "insurance", label: "Insurance", icon: Shield, activeClass: "data-[state=active]:bg-emerald-500 data-[state=active]:text-white" },
  { value: "dti", label: "DTI", icon: Percent, activeClass: "data-[state=active]:bg-orange-500 data-[state=active]:text-white" },
  { value: "business", label: "Business", icon: FileText, activeClass: "data-[state=active]:bg-green-600 data-[state=active]:text-white" },
  { value: "charity", label: "Charity", icon: Heart, activeClass: "data-[state=active]:bg-pink-500 data-[state=active]:text-white" },
  { value: "tax", label: "Tax", icon: Calculator, activeClass: "data-[state=active]:bg-purple-600 data-[state=active]:text-white" },
];

export const AdvancedToolsTabs = () => {
  const [activeTab, setActiveTab] = useState("insurance");

  return (
    <div className="px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile: horizontal scrolling tabs */}
        <div className="lg:hidden">
          <ScrollArea className="w-full whitespace-nowrap mb-4">
            <TabsList className="inline-flex w-max gap-1 bg-muted/50 h-auto p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`flex items-center gap-2 text-xs py-2 px-3 ${tab.activeClass}`}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="insurance"><InsuranceTab /></TabsContent>
          <TabsContent value="dti"><DTITab /></TabsContent>
          <TabsContent value="business"><BusinessTab /></TabsContent>
          <TabsContent value="charity"><CharityTab /></TabsContent>
          <TabsContent value="tax"><TaxTab /></TabsContent>
        </div>

        {/* Desktop: vertical tab list on left, content on right */}
        <div className="hidden lg:flex gap-6">
          <TabsList className="flex flex-col h-auto bg-muted/50 p-1.5 rounded-xl w-48 shrink-0 sticky top-24 self-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`flex items-center gap-2.5 text-sm py-2.5 px-3 w-full justify-start ${tab.activeClass}`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-w-0">
            <TabsContent value="insurance" className="mt-0"><InsuranceTab /></TabsContent>
            <TabsContent value="dti" className="mt-0"><DTITab /></TabsContent>
            <TabsContent value="business" className="mt-0"><BusinessTab /></TabsContent>
            <TabsContent value="charity" className="mt-0"><CharityTab /></TabsContent>
            <TabsContent value="tax" className="mt-0"><TaxTab /></TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};
