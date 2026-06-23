import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { Wrench } from "lucide-react";

import { AdvancedToolsCarousel } from "@/components/advanced-tools/AdvancedToolsCarousel";
import { AdvancedToolsTabs } from "@/components/advanced-tools/AdvancedToolsTabs";
import { AdvancedToolsInfoCard } from "@/components/advanced-tools/AdvancedToolsInfoCard";

const AdvancedTools = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading advanced tools..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Helmet>
        <title>Advanced Tools | CoinsBloom - Tax, Insurance & Business</title>
        <meta name="description" content="Access advanced financial tools for tax planning, insurance tracking, business expenses, and charitable giving with CoinsBloom." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />
      
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 pb-24"
      >
        <PageHeroHeader
          title="Specialized Tools"
          subtitle="Store policies, track expenses, plan taxes, and organize charitable giving"
          icon={<Wrench className="h-5 w-5 text-white" />}
          colorScheme="pink"
        />
        <div className="max-w-6xl mx-auto">
          <AdvancedToolsCarousel />
          <AdvancedToolsTabs />
          <AdvancedToolsInfoCard />
        </div>
      </motion.main>
    </div>
  );
};

export default AdvancedTools;
