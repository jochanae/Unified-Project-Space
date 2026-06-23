import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lightbulb, Video, BookOpen, GraduationCap, Users, Calendar, BarChart3, Newspaper, Heart, CalendarDays, Quote, Home, ClipboardList } from "lucide-react";
import FinancialTipsManager from "@/components/admin/FinancialTipsManager";
import VideosManager from "@/components/admin/VideosManager";
import TutorialsManager from "@/components/admin/TutorialsManager";
import AdminLearningLibrary from "@/components/admin/AdminLearningLibrary";
import ProfessionalsManager from "@/components/admin/ProfessionalsManager";
import { ProfessionalApplicationsManager } from "@/components/admin/ProfessionalApplicationsManager";
import ContentCalendar from "@/components/admin/ContentCalendar";
import ContentAnalyticsDashboard from "@/components/admin/ContentAnalyticsDashboard";
import NewsletterManager from "@/components/admin/NewsletterManager";
import EventsManager from "@/components/admin/EventsManager";
import SupportPageManager from "@/components/admin/SupportPageManager";
import { QuotesManager } from "@/components/admin/QuotesManager";
import DashboardHighlightsManager from "@/components/admin/DashboardHighlightsManager";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Megaphone } from "lucide-react";

// Tab configuration with labels and icons
const tabs = [
  { id: "newsletter", label: "News", icon: Newspaper, color: "bg-blue-600" },
  { id: "highlights", label: "Highlights", icon: Megaphone, color: "bg-emerald-600" },
  { id: "quotes", label: "Quotes", icon: Quote, color: "bg-purple-600" },
  { id: "tips", label: "Tips", icon: Lightbulb, color: "bg-amber-600" },
  { id: "videos", label: "Videos", icon: Video, color: "bg-red-600" },
  { id: "tutorials", label: "Guides", icon: BookOpen, color: "bg-green-600" },
  { id: "learning", label: "Lessons", icon: GraduationCap, color: "bg-indigo-600" },
  { id: "professionals", label: "Pros", icon: Users, color: "bg-teal-600" },
  { id: "applications", label: "Apps", icon: ClipboardList, color: "bg-violet-600" },
  { id: "events", label: "Events", icon: CalendarDays, color: "bg-pink-600" },
  { id: "calendar", label: "Calendar", icon: Calendar, color: "bg-orange-600" },
  { id: "support", label: "Support", icon: Heart, color: "bg-rose-600" },
  { id: "analytics", label: "Stats", icon: BarChart3, color: "bg-cyan-600" },
];

export default function AdminContentHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("newsletter");

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading content hub..." />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const activeTabConfig = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Adult Content Hub | CoinsBloom Admin</title>
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-4 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Adult Content Hub</h1>
            <p className="text-white/80 text-sm">Money Academy & Main App Content</p>
          </div>
        </div>

        {/* Quick Link to Kids */}
        <Card 
          className="mt-4 bg-white/10 border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => navigate("/admin/kids-content")}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌸</span>
              <div>
                <p className="text-white font-medium text-sm">Looking for Kids Content?</p>
                <p className="text-white/70 text-xs">Manage KidsBloom lessons, games & videos</p>
              </div>
            </div>
            <Badge className="bg-violet-500 text-white">Go →</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="px-4 -mt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation - Scrollable with visible labels */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex gap-1 bg-card border rounded-xl p-1.5 min-w-max shadow-sm">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all
                      ${isActive ? `${tab.color} text-white shadow-sm` : 'text-foreground hover:bg-muted'}
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Current Tab Indicator */}
          {activeTabConfig && (
            <div className="flex items-center gap-2 my-4 px-1">
              <div className={`p-1.5 rounded-md ${activeTabConfig.color}`}>
                <activeTabConfig.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{activeTabConfig.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeTabConfig.id === "newsletter" && "Manage newsletter articles & updates"}
                  {activeTabConfig.id === "quotes" && "Inspirational quotes for users"}
                  {activeTabConfig.id === "tips" && "Financial tips & advice"}
                  {activeTabConfig.id === "videos" && "Money Academy video library"}
                  {activeTabConfig.id === "tutorials" && "Step-by-step guides"}
                  {activeTabConfig.id === "learning" && "Lessons for Money Academy"}
                  {activeTabConfig.id === "professionals" && "Financial professional directory"}
                  {activeTabConfig.id === "applications" && "Review & approve professional applications"}
                  {activeTabConfig.id === "events" && "Webinars & live events"}
                  {activeTabConfig.id === "calendar" && "Content publishing schedule"}
                  {activeTabConfig.id === "support" && "Support page content"}
                  {activeTabConfig.id === "analytics" && "Content performance metrics"}
                </p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <TabsContent value="newsletter" className="mt-0">
              <NewsletterManager />
            </TabsContent>
            <TabsContent value="highlights" className="mt-0">
              <DashboardHighlightsManager partnerId={null} />
            </TabsContent>
            <TabsContent value="quotes" className="mt-0">
              <QuotesManager />
            </TabsContent>
            <TabsContent value="tips" className="mt-0">
              <FinancialTipsManager />
            </TabsContent>
            <TabsContent value="videos" className="mt-0">
              <VideosManager />
            </TabsContent>
            <TabsContent value="tutorials" className="mt-0">
              <TutorialsManager />
            </TabsContent>
            <TabsContent value="learning" className="mt-0">
              <AdminLearningLibrary />
            </TabsContent>
            <TabsContent value="professionals" className="mt-0">
              <ProfessionalsManager />
            </TabsContent>
            <TabsContent value="applications" className="mt-0">
              <ProfessionalApplicationsManager />
            </TabsContent>
            <TabsContent value="calendar" className="mt-0">
              <ContentCalendar />
            </TabsContent>
            <TabsContent value="events" className="mt-0">
              <EventsManager />
            </TabsContent>
            <TabsContent value="support" className="mt-0">
              <SupportPageManager />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0">
              <ContentAnalyticsDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
