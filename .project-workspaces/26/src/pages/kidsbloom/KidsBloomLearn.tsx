import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, BookOpen, Lightbulb, Video, X, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { KidsBloomLogo } from "@/components/kidsbloom/KidsBloomLogo";
import { GamesSection } from "@/components/kidsbloom/learning/GamesSection";
import { StoriesSection } from "@/components/kidsbloom/learning/StoriesSection";
import { LessonsSection } from "@/components/kidsbloom/learning/LessonsSection";
import { VideosSection } from "@/components/kidsbloom/learning/VideosSection";
import { BottomNavigation } from "@/components/kidsbloom/dashboard/BottomNavigation";
import { useKidsSession } from "@/hooks/useKidsSession";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function KidsBloomLearn() {
  const navigate = useNavigate();
  const { profile, isLoading, isAuthenticated } = useKidsSession();
  const [activeTab, setActiveTab] = useState("videos");
  const isUnder10 = profile?.age_tier === "under_10";

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/kidsbloom/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isUnder10 ? "bg-gradient-to-b from-yellow-50 via-orange-50 to-pink-50" : "bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900"}`}>
        <LoadingSpinner size="lg" text="Loading your learning adventures..." />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${isUnder10 ? "bg-gradient-to-b from-yellow-50 via-orange-50 to-pink-50" : "bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b ${isUnder10 ? "bg-white/80 border-orange-200" : "bg-black/50 border-white/10"}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/kidsbloom/dashboard")}
            className={isUnder10 ? "text-orange-600 hover:bg-orange-100" : "text-white hover:bg-white/10"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isUnder10 ? "🎓" : "📚"}</span>
            <h1 className={`text-xl font-bold ${isUnder10 ? "text-orange-600" : "text-white"}`}>
              {isUnder10 ? "Learn & Play!" : "Money Academy"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/kidsbloom/dashboard")}
            className={isUnder10 ? "text-orange-600 hover:bg-orange-100" : "text-white hover:bg-white/10"}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6"
      >
        <div className={`rounded-2xl p-6 ${isUnder10 ? "bg-gradient-to-r from-orange-400 to-pink-400" : "bg-gradient-to-r from-indigo-600 to-violet-600"}`}>
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl"
            >
              {isUnder10 ? "🌟" : "💡"}
            </motion.div>
            <div className="text-white">
              <h2 className="text-xl font-bold">
                {isUnder10 ? "Money Adventures!" : "Level Up Your Money Skills"}
              </h2>
              <p className="text-white/80 text-sm">
                {isUnder10 ? "Play games, read stories, become a money hero!" : "Learn, earn points, unlock achievements"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`w-full grid grid-cols-4 ${isUnder10 ? "bg-orange-100" : "bg-white/5"}`}>
            <TabsTrigger
              value="videos"
              className={`gap-1 text-xs ${isUnder10 ? "data-[state=active]:bg-orange-500 data-[state=active]:text-white" : "data-[state=active]:bg-violet-600"}`}
            >
              <Video className="h-3.5 w-3.5" />
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="stories"
              className={`gap-1 text-xs ${isUnder10 ? "data-[state=active]:bg-orange-500 data-[state=active]:text-white" : "data-[state=active]:bg-violet-600"}`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Stories
            </TabsTrigger>
            <TabsTrigger
              value="lessons"
              className={`gap-1 text-xs ${isUnder10 ? "data-[state=active]:bg-orange-500 data-[state=active]:text-white" : "data-[state=active]:bg-violet-600"}`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {isUnder10 ? "Learn" : "Lessons"}
            </TabsTrigger>
            <TabsTrigger
              value="games"
              className={`gap-1 text-xs ${isUnder10 ? "data-[state=active]:bg-orange-500 data-[state=active]:text-white" : "data-[state=active]:bg-violet-600"}`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              {isUnder10 ? "Games" : "Play"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-4">
            <VideosSection variant={isUnder10 ? "playful" : "modern"} />
          </TabsContent>

          <TabsContent value="stories" className="mt-4">
            <StoriesSection variant={isUnder10 ? "playful" : "modern"} />
          </TabsContent>

          <TabsContent value="lessons" className="mt-4">
            <LessonsSection variant={isUnder10 ? "playful" : "modern"} />
          </TabsContent>

          <TabsContent value="games" className="mt-4">
            <GamesSection variant={isUnder10 ? "playful" : "modern"} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation variant={isUnder10 ? "playful" : "modern"} />
    </div>
  );
}
