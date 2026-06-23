import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { GraduationCap, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { MoneyAcademyActions } from "@/components/money-academy/MoneyAcademyActions";
import { VideoLibrary } from "@/components/money-academy/VideoLibrary";
import { LessonsLibrary } from "@/components/money-academy/LessonsLibrary";
import { Input } from "@/components/ui/input";

const MoneyAcademy = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<"videos" | "lessons" | "expert">("videos");
  const [searchQuery, setSearchQuery] = useState("");

  // When "Ask an Expert" is selected, navigate to professionals page
  useEffect(() => {
    if (activeSection === "expert") {
      navigate("/professionals");
    }
  }, [activeSection, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Helmet>
        <title>Money Academy | CoinsBloom - Financial Education</title>
        <meta name="description" content="Learn personal finance with CoinsBloom Money Academy. Videos, lessons, and expert advice on budgeting, investing, credit, and more." />
      </Helmet>
      <DashboardHeader />
      
      <PageHeroHeader
        title="Money Academy"
        subtitle="Learn financial literacy through interactive lessons, videos, and expert insights"
        icon={<GraduationCap className="h-7 w-7" />}
        colorScheme="orange"
      />
      
      {/* Search Bar */}
      <div className="container mx-auto px-4 pt-4 max-w-4xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search videos and lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border/50"
          />
        </div>
      </div>
      
      <MoneyAcademyActions 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      
      <motion.main
        id="academy-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-6 max-w-4xl scroll-mt-4"
      >
        {activeSection === "videos" && <VideoLibrary searchQuery={searchQuery} />}
        {activeSection === "lessons" && <LessonsLibrary searchQuery={searchQuery} />}
      </motion.main>
    </div>
  );
};

export default MoneyAcademy;
