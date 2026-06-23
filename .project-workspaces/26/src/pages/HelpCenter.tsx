import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { HelpCenterTabs } from "@/components/help-center/HelpCenterTabs";
import { HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const HelpCenter = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "start";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Help Center | CoinsBloom - Support & Resources</title>
        <meta name="description" content="Find answers to your questions about CoinsBloom. Browse FAQs, tutorials, and guides to make the most of your financial journey." />
      </Helmet>
      <DashboardHeader />
      
      <PageHeroHeader
        title="Help Center"
        subtitle="Get help, learn features, and find answers to your questions"
        icon={<HelpCircle className="h-6 w-6 text-[hsl(210,80%,85%)]" />}
        colorScheme="blue"
      />
      
      {/* Search Bar */}
      <div className="px-4 pt-4 max-w-6xl mx-auto w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search help articles, FAQs, features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border/50"
          />
        </div>
      </div>
      
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 pb-24 pt-6 px-4 max-w-6xl mx-auto w-full"
      >
        <HelpCenterTabs activeTab={activeTab} setActiveTab={setActiveTab} searchQuery={searchQuery} />
      </motion.main>
    </div>
  );
};

export default HelpCenter;
